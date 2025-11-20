import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, GraduationCap, Briefcase, DollarSign, MapPin } from 'lucide-react';

const faqs = [
  {
    category: 'Education Choices',
    icon: GraduationCap,
    questions: [
      {
        q: 'How do I choose between university and college?',
        a: 'Universities offer theoretical degrees (Bachelor\'s, Honours, Master\'s) and are best for research-oriented careers like medicine, law, or engineering. Colleges and TVET institutions offer practical diplomas and certificates focused on hands-on skills, ideal for careers like nursing, IT support, or artisan trades. Consider your learning style, career goals, and financial situation. Universities typically take 3-4 years and cost more, while diplomas take 2-3 years and are more affordable.',
      },
      {
        q: 'What subjects do I need for engineering?',
        a: 'Engineering programs require Mathematics (not Maths Literacy) and Physical Sciences as compulsory subjects. Most universities require 60-70% in both subjects. Additional useful subjects include Technical Mathematics, Engineering Graphics and Design (EGD), and Information Technology. Your APS score typically needs to be 30+ for entry into engineering programs at most South African universities.',
      },
      {
        q: 'How do bursaries work in South Africa?',
        a: 'Bursaries are financial aid that covers tuition and sometimes accommodation/books. Unlike loans, most bursaries don\'t need to be repaid. NSFAS (National Student Financial Aid Scheme) is available for students from households earning under R350,000/year. Company bursaries (like Sasol, Eskom) often require working for them after graduation. Apply early (April-September before your matric year) as they\'re competitive. Requirements vary but typically include strong academic performance and financial need.',
      },
    ],
  },
  {
    category: 'Career Planning',
    icon: Briefcase,
    questions: [
      {
        q: 'What are the highest paying careers in South Africa?',
        a: 'Top-earning careers include: Medical Specialists (R1.5M-R3M+/year), IT Managers and Software Architects (R800k-R1.5M), Mining Engineers (R700k-R1.2M), Chartered Accountants (R600k-R1M), Actuaries (R800k-R1.5M), and Lawyers (R500k-R2M). However, salary depends heavily on experience, location, and industry. Remember that passion and job satisfaction matter as much as earnings. High-paying careers often require extensive education and years of experience.',
      },
      {
        q: 'Which careers are in high demand in South Africa?',
        a: 'According to the Scarce Skills List 2024: Software Developers, Data Scientists, Cybersecurity Specialists (Technology); Chartered Accountants, Auditors (Finance); Civil, Electrical, Mechanical Engineers; Medical Doctors, Nurses, Pharmacists; Teachers (especially Maths and Science); and Artisans (Electricians, Plumbers, Welders). These careers have strong job prospects and often offer bursaries or easier immigration for skilled workers.',
      },
      {
        q: 'Can I change my career path after matric?',
        a: 'Absolutely! Many people change careers multiple times. You can: 1) Start with a diploma then upgrade to a degree later (some credits transfer), 2) Do bridging courses to meet requirements you missed, 3) Gain work experience then study part-time, 4) Take online courses to develop new skills. Your matric subjects limit some immediate options, but there are always pathways. Focus on choosing something that interests you now—you can always adapt later.',
      },
    ],
  },
  {
    category: 'Financial Aid',
    icon: DollarSign,
    questions: [
      {
        q: 'What is NSFAS and how do I apply?',
        a: 'NSFAS (National Student Financial Aid Scheme) provides loans/bursaries to South African students from low-income households (under R350,000/year). It covers tuition, accommodation, meals, books, and transport. Apply online at nsfas.org.za between August-November for the following year. You need: ID, parent/guardian ID, proof of income, and matric results (or Grade 11 if applying early). NSFAS is a loan that converts to a bursary if you pass all courses—so work hard!',
      },
      {
        q: 'What other funding options exist besides NSFAS?',
        a: 'Many options: 1) Company bursaries (Sasol, Eskom, Anglo American)—often require working for them after, 2) University merit bursaries for top performers (85%+), 3) NGO bursaries (Ikusasa Student Financial Aid, Allan Gray), 4) Provincial government bursaries, 5) Study loans from banks (Funda, Eduloan), 6) Crowdfunding platforms. Research early and apply to multiple—don\'t rely on one option. Maintain good grades as most require 60%+ average.',
      },
    ],
  },
  {
    category: 'Local Context',
    icon: MapPin,
    questions: [
      {
        q: 'Which provinces have the best job opportunities?',
        a: 'Gauteng (Johannesburg/Pretoria) has the most jobs across all sectors—finance, technology, corporate, government. Western Cape (Cape Town) is strong in tourism, finance, tech, and creative industries. KwaZulu-Natal (Durban) offers manufacturing, logistics, and tourism jobs. However, consider cost of living: Gauteng and Western Cape are expensive. Other provinces have opportunities in mining (Northern Cape, Limpopo), agriculture (Free State), and emerging sectors. Remote work is also growing—you can work for Gauteng companies while living elsewhere.',
      },
      {
        q: 'How important is my matric pass level for careers?',
        a: 'Very important! Bachelor\'s Pass (4+ subjects at 50%, including Home Language at 40%) opens university. Diploma Pass (4 subjects at 40%, Home Language 40%) allows college entry but not university. Higher Certificate Pass is very limiting. Many competitive programs require 60-80%+ in specific subjects. Good matric results open more bursary and university options. However, if you get Diploma Pass, you can study at college, work, and later do "access courses" to upgrade to university admission.',
      },
    ],
  },
];

export default function CareerFAQ() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">Career Guidance FAQ</h1>
          <p className="text-muted-foreground">
            Common questions about career planning, education, and opportunities in South Africa
          </p>
        </div>

        <div className="space-y-6">
          {faqs.map((section) => {
            const Icon = section.icon;
            
            return (
              <Card key={section.category}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-secondary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{section.category}</CardTitle>
                      <CardDescription>
                        {section.questions.length} frequently asked questions
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {section.questions.map((item, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left">
                          <div className="flex items-start gap-2">
                            <HelpCircle className="h-4 w-4 text-secondary mt-1 flex-shrink-0" />
                            <span>{item.q}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-secondary" />
              Still Have Questions?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Can't find the answer you're looking for? Ask our AI Career Counselor for personalized guidance based on your specific situation and academic performance.
            </p>
            <Badge variant="secondary" className="cursor-pointer">
              Ask AI Tutor
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
