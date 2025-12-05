import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Download, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Certificates = () => {
  const navigate = useNavigate();

  // Placeholder content for now – this can later be wired to real certificate data
  const certificates = [] as any[];

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
                Complete quizzes and subjects to unlock official EduFutura certificates.
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
              <Card key={certificate.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{certificate.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      Issued on {certificate.issuedAt}
                    </p>
                  </div>
                  <Badge variant="secondary">Official</Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {certificate.description}
                  </p>
                  <Button size="icon" variant="outline">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Certificates;


