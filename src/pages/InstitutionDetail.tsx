import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  DollarSign,
  Calendar,
  Award,
  Users,
  BookOpen,
  Bookmark,
  BookmarkPlus,
  ExternalLink,
} from 'lucide-react';

type Institution = {
  id: string;
  institution_name: string;
  institution_type: string;
  province: string;
  city: string;
  contact_info: any;
  courses_offered: any;
  admission_requirements: any;
  application_deadlines: any;
  fees_info: any;
  campus_facilities: string[];
  student_support: string;
  accreditation: string;
  rankings: any;
  institution_logo_url: string | null;
};

export default function InstitutionDetail() {
  const { institutionName } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstitution();
  }, [institutionName, user]);

  const fetchInstitution = async () => {
    if (!institutionName) return;

    setLoading(true);
    try {
      const { data: instData, error: instError } = await supabase
        .from('tertiary_institutions')
        .select('*')
        .eq('institution_name', decodeURIComponent(institutionName))
        .maybeSingle();

      if (instError) throw instError;
      if (!instData) {
        toast({
          title: 'Institution not found',
          variant: 'destructive',
        });
        navigate('/career-guidance/universities');
        return;
      }

      setInstitution(instData);

      // Check if saved
      if (user) {
        const { data: recData } = await supabase
          .from('institution_recommendations')
          .select('saved')
          .eq('user_id', user.id)
          .eq('institution_id', instData.id)
          .maybeSingle();

        setIsSaved(recData?.saved || false);
      }
    } catch (error) {
      console.error('Error fetching institution:', error);
      toast({
        title: 'Error loading institution',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSave = async () => {
    if (!user || !institution) return;

    try {
      const { data: existing } = await supabase
        .from('institution_recommendations')
        .select('id')
        .eq('user_id', user.id)
        .eq('institution_id', institution.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('institution_recommendations')
          .update({ saved: !isSaved })
          .eq('id', existing.id);
      } else {
        await supabase.from('institution_recommendations').insert({
          user_id: user.id,
          institution_id: institution.id,
          saved: true,
        });
      }

      setIsSaved(!isSaved);
      toast({
        title: !isSaved ? 'Added to shortlist' : 'Removed from shortlist',
      });
    } catch (error) {
      console.error('Error toggling save:', error);
      toast({
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!institution) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">Institution not found</div>
      </DashboardLayout>
    );
  }

  const contactInfo = institution.contact_info || {};
  const coursesOffered = Array.isArray(institution.courses_offered) ? institution.courses_offered : [];
  const admissionReqs = institution.admission_requirements || {};
  const deadlines = institution.application_deadlines || {};
  const fees = institution.fees_info || {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/career-guidance/universities')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Institutions
        </Button>

        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="h-8 w-8 text-primary" />
                  <Badge variant="outline" className="text-sm">
                    {institution.institution_type}
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-serif mb-2">
                  {institution.institution_name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  {institution.city}, {institution.province}
                </CardDescription>
              </div>
              <Button variant="outline" size="lg" onClick={handleToggleSave}>
                {isSaved ? (
                  <>
                    <Bookmark className="h-5 w-5 mr-2 fill-secondary text-secondary" />
                    Saved
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="h-5 w-5 mr-2" />
                    Save to Shortlist
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contactInfo.website && (
                <a
                  href={contactInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  {contactInfo.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {contactInfo.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {contactInfo.phone}
                </div>
              )}
              {contactInfo.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {contactInfo.email}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Information - Mobile Accordion / Desktop Tabs */}
        {isMobile ? (
          <Accordion type="single" collapsible className="space-y-2">
            <AccordionItem value="programs" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Programs</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                {coursesOffered.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Program information coming soon. Visit the institution website for details.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {coursesOffered.map((course: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3 bg-background">
                        <h4 className="font-semibold text-sm mb-1">{course.course_name}</h4>
                        <div className="flex gap-2 flex-wrap text-xs">
                          {course.faculty && <Badge variant="outline" className="text-xs">{course.faculty}</Badge>}
                          {course.qualification_type && <Badge variant="secondary" className="text-xs">{course.qualification_type}</Badge>}
                          {course.duration_years && <span className="text-muted-foreground">{course.duration_years} years</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="admission" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Admission</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                {admissionReqs.aps_scores && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">APS Score Requirements</h4>
                    <p className="text-sm text-muted-foreground">{admissionReqs.aps_scores}</p>
                  </div>
                )}
                {admissionReqs.subject_requirements && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Subject Requirements</h4>
                    <p className="text-sm text-muted-foreground">{admissionReqs.subject_requirements}</p>
                  </div>
                )}
                {deadlines.application_opens && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Application Dates</h4>
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Opens:</span> {deadlines.application_opens}</div>
                      {deadlines.application_closes && (
                        <div><span className="font-medium">Closes:</span> {deadlines.application_closes}</div>
                      )}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="fees" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Fees & Funding</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                {fees.tuition && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Tuition Fees</h4>
                    <p className="text-sm text-muted-foreground">{fees.tuition}</p>
                  </div>
                )}
                {fees.accommodation && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Accommodation</h4>
                    <p className="text-sm text-muted-foreground">{fees.accommodation}</p>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-sm mb-2">NSFAS Eligible</h4>
                  <p className="text-sm text-muted-foreground">
                    This institution accepts NSFAS funding. Visit{' '}
                    <a href="https://www.nsfas.org.za" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      www.nsfas.org.za
                    </a>{' '}
                    to apply.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="campus" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Campus Life</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                {institution.campus_facilities && institution.campus_facilities.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Campus Facilities</h4>
                    <div className="flex flex-wrap gap-2">
                      {institution.campus_facilities.map((facility: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {institution.student_support && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Student Support Services</h4>
                    <p className="text-sm text-muted-foreground">{institution.student_support}</p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : (
          <Tabs defaultValue="programs" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="programs">Programs</TabsTrigger>
              <TabsTrigger value="admission">Admission</TabsTrigger>
              <TabsTrigger value="fees">Fees & Funding</TabsTrigger>
              <TabsTrigger value="campus">Campus Life</TabsTrigger>
            </TabsList>

          <TabsContent value="programs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Academic Programs
                </CardTitle>
                <CardDescription>Available courses and qualifications</CardDescription>
              </CardHeader>
              <CardContent>
                {coursesOffered.length === 0 ? (
                  <p className="text-muted-foreground">
                    Program information coming soon. Visit the institution website for details.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {coursesOffered.map((course: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-1">{course.course_name}</h4>
                        <div className="flex gap-2 flex-wrap text-sm text-muted-foreground">
                          {course.faculty && <Badge variant="outline">{course.faculty}</Badge>}
                          {course.qualification_type && <Badge variant="secondary">{course.qualification_type}</Badge>}
                          {course.duration_years && <span>{course.duration_years} years</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="admission" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Admission Requirements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {admissionReqs.aps_scores && (
                  <div>
                    <h4 className="font-semibold mb-2">APS Score Requirements</h4>
                    <p className="text-muted-foreground">{admissionReqs.aps_scores}</p>
                  </div>
                )}
                {admissionReqs.subject_requirements && (
                  <div>
                    <h4 className="font-semibold mb-2">Subject Requirements</h4>
                    <p className="text-muted-foreground">{admissionReqs.subject_requirements}</p>
                  </div>
                )}
                {institution.accreditation && (
                  <div>
                    <h4 className="font-semibold mb-2">Accreditation</h4>
                    <p className="text-muted-foreground">{institution.accreditation}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Application Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                {deadlines.application_opens && (
                  <div className="mb-2">
                    <span className="font-medium">Opens:</span> {deadlines.application_opens}
                  </div>
                )}
                {deadlines.application_closes && (
                  <div className="mb-2">
                    <span className="font-medium">Closes:</span> {deadlines.application_closes}
                  </div>
                )}
                {deadlines.registration_dates && (
                  <div>
                    <span className="font-medium">Registration:</span> {deadlines.registration_dates}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Fees & Financial Aid
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fees.tuition && (
                  <div>
                    <h4 className="font-semibold mb-1">Tuition Fees</h4>
                    <p className="text-muted-foreground">{fees.tuition}</p>
                  </div>
                )}
                {fees.accommodation && (
                  <div>
                    <h4 className="font-semibold mb-1">Accommodation</h4>
                    <p className="text-muted-foreground">{fees.accommodation}</p>
                  </div>
                )}
                <div>
                  <h4 className="font-semibold mb-2">NSFAS Eligible</h4>
                  <p className="text-muted-foreground">
                    This institution accepts NSFAS funding. Visit{' '}
                    <a
                      href="https://www.nsfas.org.za"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      www.nsfas.org.za
                    </a>{' '}
                    to apply.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="campus" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Campus Facilities & Student Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {institution.campus_facilities && institution.campus_facilities.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Campus Facilities</h4>
                    <div className="flex flex-wrap gap-2">
                      {institution.campus_facilities.map((facility: string, index: number) => (
                        <Badge key={index} variant="secondary">
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {institution.student_support && (
                  <div>
                    <h4 className="font-semibold mb-2">Student Support Services</h4>
                    <p className="text-muted-foreground">{institution.student_support}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
