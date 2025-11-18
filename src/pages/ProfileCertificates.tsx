import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Link as LinkIcon,
  Printer,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type CertificateRecord = {
  id: string;
  certificate_type: string | null;
  subject_name: string | null;
  achievement_title: string | null;
  achievement_description: string | null;
  issue_date: string | null;
  verification_code: string;
  qr_code_url: string | null;
  certificate_pdf_url: string | null;
  status: string | null;
};

type SortOption = "newest" | "oldest" | "title";
type FilterType = "all" | "subject" | "chapter" | "milestone";

const typeLabelMap: Record<string, string> = {
  subject_completion: "Subject",
  chapter_mastery: "Chapter",
  quiz_achievement: "Quiz",
  milestone: "Milestone",
};

const ProfileCertificates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeCertificate, setActiveCertificate] = useState<CertificateRecord | null>(null);

  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchCertificates = async () => {
      if (!user) return;
      setLoading(true);

      // Phase 6 not implemented yet - using placeholder empty array
      setCertificates([]);
      setLoading(false);
    };

    fetchCertificates();
  }, [user, toast]);

  const stats = useMemo(() => {
    if (!certificates.length) {
      return {
        total: 0,
        subjects: 0,
        latestDate: null as string | null,
      };
    }

    const total = certificates.length;
    const subjects = certificates.filter((c) => c.certificate_type === "subject_completion").length;
    const latest = certificates[0]?.issue_date || null;

    return {
      total,
      subjects,
      latestDate: latest,
    };
  }, [certificates]);

  const processedCertificates = useMemo(() => {
    let result = [...certificates];

    if (filterType !== "all") {
      const map: Record<FilterType, string | null> = {
        all: null,
        subject: "subject_completion",
        chapter: "chapter_mastery",
        milestone: "milestone",
      };
      const target = map[filterType];
      if (target) {
        result = result.filter((c) => c.certificate_type === target);
      }
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((c) => {
        const title = c.achievement_title || "";
        const subject = c.subject_name || "";
        return title.toLowerCase().includes(term) || subject.toLowerCase().includes(term);
      });
    }

    if (sortBy === "title") {
      result.sort((a, b) => (a.achievement_title || "").localeCompare(b.achievement_title || ""));
    } else {
      result.sort((a, b) => {
        const dateA = a.issue_date ? new Date(a.issue_date).getTime() : 0;
        const dateB = b.issue_date ? new Date(b.issue_date).getTime() : 0;
        return sortBy === "newest" ? dateB - dateA : dateA - dateB;
      });
    }

    return result;
  }, [certificates, sortBy, filterType, searchTerm]);

  const handleOpenViewer = (certificate: CertificateRecord) => {
    setActiveCertificate(certificate);
    setViewerOpen(true);
  };

  const handleDownload = async (certificate: CertificateRecord) => {
    if (!certificate.certificate_pdf_url) {
      toast({
        title: "Download unavailable",
        description: "This certificate does not yet have a downloadable PDF.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(certificate.certificate_pdf_url);
      if (!response.ok) throw new Error("Network error");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      const dateLabel = certificate.issue_date
        ? format(new Date(certificate.issue_date), "yyyy-MM-dd")
        : "certificate";
      const subjectLabel = certificate.subject_name || "EduFutura";
      const safeSubject = subjectLabel.replace(/\s+/g, "_");

      a.href = url;
      a.download = `EduFutura_${safeSubject}_Certificate_${dateLabel}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Certificate download failed", error);
      toast({
        title: "Download failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const buildVerificationUrl = (certificate: CertificateRecord) =>
    `${window.location.origin}/verify/${certificate.verification_code}`;

  const handleCopyLink = async (certificate: CertificateRecord) => {
    try {
      await navigator.clipboard.writeText(buildVerificationUrl(certificate));
      toast({
        title: "Link copied",
        description: "You can now share your verification link anywhere.",
      });
    } catch {
      toast({
        title: "Unable to copy",
        description: "Please try again or copy the URL manually.",
        variant: "destructive",
      });
    }
  };

  const handlePrint = (certificate: CertificateRecord) => {
    if (!certificate.certificate_pdf_url) {
      toast({
        title: "Print unavailable",
        description: "This certificate does not yet have a printable PDF.",
        variant: "destructive",
      });
      return;
    }
    window.open(certificate.certificate_pdf_url, "_blank", "noopener,noreferrer");
  };

  const renderCertificateCard = (certificate: CertificateRecord) => {
    const typeLabel =
      (certificate.certificate_type && typeLabelMap[certificate.certificate_type]) || "Certificate";
    const isVerified = certificate.status === "active";

    return (
      <Card
        key={certificate.id}
        className="flex flex-col justify-between p-4 hover:shadow-lg transition-shadow border border-border/60"
      >
        <div className="space-y-3">
          {/* Mini thumbnail / header */}
          <div className="relative overflow-hidden rounded-md border bg-gradient-to-br from-emerald-50 to-slate-50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  EduFutura Certificate
                </p>
                <p className="mt-1 text-sm font-semibold line-clamp-2">
                  {certificate.achievement_title || certificate.subject_name || "Certificate"}
                </p>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">
              {certificate.achievement_description ||
                "Official recognition of your achievement on the EduFutura platform."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[11px]">
              {typeLabel}
            </Badge>
            {certificate.issue_date && (
              <span>
                Issued: {format(new Date(certificate.issue_date), "d MMMM yyyy")}
              </span>
            )}
          </div>

          {/* Verification widget */}
          <div className="mt-1 rounded-md bg-emerald-50/80 px-3 py-2 text-xs flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
            <div className="space-y-1">
              <p className="font-medium text-emerald-800">
                {isVerified ? "Verified Certificate" : "Certificate Status"}
              </p>
              <p className="text-[11px] text-emerald-900/80">
                Verification Code:{" "}
                <span className="font-mono tracking-wide">
                  {certificate.verification_code}
                </span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[11px]"
                  onClick={() => handleCopyLink(certificate)}
                >
                  <LinkIcon className="mr-1 h-3 w-3" />
                  Copy verify link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[11px]"
                  onClick={() => navigate(`/verify/${certificate.verification_code}`)}
                >
                  <ShieldCheck className="mr-1 h-3 w-3" />
                  Verify online
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="flex-1 min-w-[110px]"
            onClick={() => handleOpenViewer(certificate)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 min-w-[110px]"
            onClick={() => handleDownload(certificate)}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 min-w-[110px]"
            onClick={() => handlePrint(certificate)}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </Card>
    );
  };

  const renderViewer = () => {
    if (!activeCertificate) return null;

    const verificationUrl = buildVerificationUrl(activeCertificate);

    return (
      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base md:text-lg">
                {activeCertificate.achievement_title || activeCertificate.subject_name || "Certificate"}
              </DialogTitle>
              <Badge variant="outline" className="text-[11px]">
                {activeCertificate.certificate_type && typeLabelMap[activeCertificate.certificate_type]
                  ? typeLabelMap[activeCertificate.certificate_type]
                  : "Certificate"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => handleCopyLink(activeCertificate)}
                title="Copy verification link"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => handleDownload(activeCertificate)}
                title="Download PDF"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => handlePrint(activeCertificate)}
                title="Print certificate"
              >
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden border rounded-lg bg-slate-50">
            {activeCertificate.certificate_pdf_url ? (
              <iframe
                title="Certificate preview"
                src={activeCertificate.certificate_pdf_url}
                className="w-full h-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Certificate preview not available yet. Please try again later.
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Verified by EduFutura
              </span>
              <span className="text-muted-foreground">
                Verification Code:{" "}
                <span className="font-mono text-[11px]">{activeCertificate.verification_code}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => window.open(verificationUrl, "_blank", "noopener,noreferrer")}
              className={cn(
                "inline-flex items-center gap-1 text-[11px] text-primary hover:underline",
              )}
            >
              <ShieldCheck className="h-3 w-3" />
              View public verification
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/profile")}
            >
              <ArrowLeft className="h-3 w-3" />
              Back to profile
            </button>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Certificates</h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              View, download and share your official EduFutura certificates.
            </p>
          </div>

          <Card className="px-4 py-3 space-y-1 text-xs min-w-[200px]">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Achievement Summary
            </p>
            <div className="flex flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold">{stats.total}</p>
                <p className="text-[11px] text-muted-foreground">Total certificates</p>
              </div>
              <div>
                <p className="text-sm font-semibold">{stats.subjects}</p>
                <p className="text-[11px] text-muted-foreground">Subjects mastered</p>
              </div>
              {stats.latestDate && (
                <div>
                  <p className="text-sm font-semibold">
                    {format(new Date(stats.latestDate), "d MMM yyyy")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Most recent</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 text-sm"
              placeholder="Search by name or subject"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <Select value={filterType} onValueChange={(v: FilterType) => setFilterType(v)}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue placeholder="Filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All certificates</SelectItem>
                <SelectItem value="subject">Subject</SelectItem>
                <SelectItem value="chapter">Chapter</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v: SortOption) => setSortBy(v)}>
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="title">Achievement name</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground">Loading your certificates...</p>
          </div>
        ) : processedCertificates.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No certificates yet"
            description="Complete subject quizzes and final assessments to earn your first certificate."
            action={{
              label: "Browse subjects",
              onClick: () => navigate("/subjects"),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {processedCertificates.map(renderCertificateCard)}
          </div>
        )}

        {renderViewer()}
      </div>
    </DashboardLayout>
  );
};

export default ProfileCertificates;


