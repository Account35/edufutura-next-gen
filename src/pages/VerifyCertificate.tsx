import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Search,
} from "lucide-react";
import { format } from "date-fns";

type CertificateVerificationRecord = {
  id: string;
  certificate_type: string | null;
  subject_name: string | null;
  achievement_title: string | null;
  issue_date: string | null;
  verification_code: string;
  certificate_pdf_url: string | null;
  status: string | null;
  metadata: any;
  student_name: string | null;
  student_grade: number | null;
  school_name: string | null;
};

type VerificationState = "idle" | "loading" | "valid" | "invalid" | "revoked" | "expired";

const VerifyCertificate = () => {
  const { code: codeParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [codeInput, setCodeInput] = useState("");
  const [verificationState, setVerificationState] = useState<VerificationState>("idle");
  const [certificate, setCertificate] = useState<CertificateVerificationRecord | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const initialCode = codeParam || searchParams.get("code");
    if (initialCode) {
      setCodeInput(initialCode);
      handleVerify(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizeCode = (value: string) => value.trim().toUpperCase();

  const handleVerify = async (rawCode?: string) => {
    const code = normalizeCode(rawCode ?? codeInput);
    if (!code || code.length < 8) {
      toast({
        title: "Invalid code format",
        description: "Please enter the 12-character verification code from the certificate.",
        variant: "destructive",
      });
      return;
    }

    setChecking(true);
    setVerificationState("loading");
    setCertificate(null);

    try {
      // Check the achievements table for the badge_id match
      const { data, error } = await supabase
        .from('achievements')
        .select('id, badge_id, badge_name, badge_type, badge_description, subject_name, icon_url, earned_at, user_id')
        .eq('badge_id', code)
        .eq('badge_type', 'certificate')
        .maybeSingle();

      if (error) {
        console.error('Certificate verification error:', error);
        setVerificationState("invalid");
      } else if (data) {
        // Fetch student info
        const { data: studentData } = await supabase
          .from('users')
          .select('full_name, grade_level')
          .eq('id', data.user_id)
          .maybeSingle();

        setCertificate({
          id: data.id,
          certificate_type: data.badge_type,
          subject_name: data.subject_name,
          achievement_title: data.badge_name,
          issue_date: data.earned_at,
          verification_code: data.badge_id,
          certificate_pdf_url: data.icon_url,
          status: 'valid',
          metadata: { description: data.badge_description },
          student_name: studentData?.full_name || 'Student',
          student_grade: studentData?.grade_level || null,
          school_name: null,
        });
        setVerificationState("valid");
      } else {
        setVerificationState("invalid");
      }

      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("code", code);
        return params;
      });
    } finally {
      setChecking(false);
    }
  };

  const renderStatusBanner = () => {
    if (verificationState === "idle") return null;

    if (verificationState === "loading") {
      return (
        <div className="mb-4 flex items-center gap-3 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Verifying certificate...</span>
        </div>
      );
    }

    if (verificationState === "valid") {
      return (
        <div className="mb-4 flex items-center gap-3 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <CheckCircle2 className="h-4 w-4" />
          <div>
            <p className="font-semibold">Valid Certificate</p>
            <p className="text-xs">
              This certificate is authentic and has been issued by EduFutura under CAPS curriculum
              standards.
            </p>
          </div>
        </div>
      );
    }

    if (verificationState === "revoked") {
      return (
        <div className="mb-4 flex items-center gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-900">
          <ShieldOff className="h-4 w-4" />
          <div>
            <p className="font-semibold">Certificate Revoked</p>
            <p className="text-xs">
              This certificate is no longer valid. Please contact the certificate holder or EduFutura
              support for more information.
            </p>
          </div>
        </div>
      );
    }

    if (verificationState === "expired") {
      return (
        <div className="mb-4 flex items-center gap-3 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Clock className="h-4 w-4" />
          <div>
            <p className="font-semibold">Expired Certificate</p>
            <p className="text-xs">
              This certificate has passed its validity period. It should not be used for current
              applications.
            </p>
          </div>
        </div>
      );
    }

    if (verificationState === "invalid") {
      return (
        <div className="mb-4 flex items-center gap-3 rounded-md bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertCircle className="h-4 w-4" />
          <div>
            <p className="font-semibold">Certificate Not Found</p>
            <p className="text-xs">
              We could not find a certificate with this code. Please check the code and try again, or
              contact the certificate holder.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderCertificateDetails = () => {
    if (!certificate || verificationState !== "valid") return null;

    const achievementTitle =
      certificate.achievement_title || certificate.subject_name || "EduFutura Certificate";
    const formattedDate = certificate.issue_date
      ? format(new Date(certificate.issue_date), "d MMMM yyyy")
      : null;

    const studentDisplay = certificate.student_name
      ? certificate.student_name
          .split(" ")
          .map((part, idx) => (idx === 0 ? part : `${part.charAt(0)}.`))
          .join(" ")
      : "Student";

    return (
      <div className="grid gap-6 md:grid-cols-[2fr,3fr]">
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Certificate Holder
                </p>
                <p className="text-sm font-semibold">{studentDisplay}</p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {certificate.certificate_type || "Certificate"}
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <p className="text-muted-foreground">Achievement</p>
                <p className="font-medium">{achievementTitle}</p>
              </div>
              {certificate.school_name && (
                <div>
                  <p className="text-muted-foreground">Institution</p>
                  <p className="font-medium">{certificate.school_name}</p>
                </div>
              )}
              {certificate.student_grade && (
                <div>
                  <p className="text-muted-foreground">Grade Level</p>
                  <p className="font-medium">Grade {certificate.student_grade}</p>
                </div>
              )}
              {formattedDate && (
                <div>
                  <p className="text-muted-foreground">Issue Date</p>
                  <p className="font-medium">{formattedDate}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Verification Code</p>
                <p className="font-mono text-xs tracking-wide">{certificate.verification_code}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 space-y-2 text-xs">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Verification Details
            </p>
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              <span className="font-semibold">Digitally signed and verified</span>
            </div>
            <p className="text-muted-foreground">
              This certificate has been issued and recorded on the EduFutura platform under CAPS
              curriculum standards. Any changes to the original document would invalidate this
              verification.
            </p>
          </Card>
        </div>

        <Card className="overflow-hidden">
          {certificate.certificate_pdf_url ? (
            <iframe
              title="Certificate preview"
              src={certificate.certificate_pdf_url}
              className="h-[420px] w-full md:h-[500px]"
            />
          ) : (
            <div className="flex h-[260px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Certificate preview not available.
            </div>
          )}
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-10 md:py-16 max-w-5xl">
        <div className="mx-auto max-w-3xl space-y-6 text-center md:text-left">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              EduFutura
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Verify Certificate
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the 12-character verification code or scan the QR code on a certificate to verify
              its authenticity. This page can be used by schools, universities, or employers.
            </p>
          </div>

          <Card className="p-4 md:p-5">
            <form
              className="flex flex-col gap-3 md:flex-row md:items-center"
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify();
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter 12-character code"
                  className="pl-8 font-mono uppercase tracking-[0.2em] text-xs"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  maxLength={24}
                />
              </div>
              <Button
                type="submit"
                className="w-full md:w-auto"
                disabled={checking || !codeInput.trim()}
              >
                {checking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Verify
                  </>
                )}
              </Button>
            </form>

            <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-3 w-3" />
              <p>
                For privacy, only limited student information is shown. For assistance, contact{" "}
                <a
                  href="mailto:support@edufutura.app"
                  className="font-medium text-primary hover:underline"
                >
                  support@edufutura.app
                </a>
                .
              </p>
            </div>
          </Card>

          {renderStatusBanner()}
        </div>

        <div className="mt-6">{renderCertificateDetails()}</div>
      </main>

      <footer className="border-t bg-muted/40 py-4 text-center text-[11px] text-muted-foreground">
        <div className="container mx-auto px-4">
          <p>
            © {new Date().getFullYear()} EduFutura. Certificates issued under CAPS curriculum
            alignment.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default VerifyCertificate;


