import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Download, Lock, ExternalLink, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Certificate {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_type: string;
  badge_description: string | null;
  subject_name: string | null;
  icon_url: string | null;
  earned_at: string;
}

const Certificates = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCertificates();
    }
  }, [user]);

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user?.id)
        .eq('badge_type', 'certificate')
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error: any) {
      console.error('Error fetching certificates:', error);
      toast({
        title: "Error loading certificates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certificate: Certificate) => {
    // Open the verification page which shows the certificate
    window.open(`/verify/${certificate.badge_id}`, '_blank');
  };

  const handleVerify = (certificate: Certificate) => {
    navigate(`/verify/${certificate.badge_id}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Certificates
          </h1>
          <p className="text-muted-foreground">
            View and download certificates you earn for completing subjects and assessments.
          </p>
        </div>

        {certificates.length === 0 ? (
          <Card className="p-6 flex flex-col items-center text-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">No certificates yet</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Complete all quizzes in a subject with a passing score to earn official EduFutura certificates.
              </p>
            </div>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => navigate("/dashboard")}
            >
              Start learning
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {certificates.map((certificate) => (
              <Card key={certificate.id} className="p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                      <Award className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-lg">{certificate.badge_name}</h2>
                      {certificate.subject_name && (
                        <p className="text-sm text-muted-foreground">
                          {certificate.subject_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Official
                  </Badge>
                </div>

                {certificate.badge_description && (
                  <p className="text-sm text-muted-foreground">
                    {certificate.badge_description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Issued {formatDistanceToNow(new Date(certificate.earned_at), { addSuffix: true })}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleVerify(certificate)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Verify
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleDownload(certificate)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Information Card */}
        <Card className="p-5 bg-accent/5">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Award className="h-5 w-5 text-secondary" />
            How to Earn Certificates
          </h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              Complete all chapters in a subject
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              Pass all chapter quizzes with at least 75%
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              Certificates are automatically generated and include a QR code for verification
            </li>
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Certificates;