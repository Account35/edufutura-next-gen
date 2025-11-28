import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Shield, Heart, BookOpen, Lock, Users, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CommunityGuidelines() {
  const guidelines = [
    {
      title: 'Respect and Kindness',
      icon: Heart,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      rules: [
        'Treat others with respect',
        'No bullying or harassment',
        'Disagree politely with ideas, not people',
        'Help each other learn',
      ],
      examples: {
        good: "I think your solution could be simplified by using this formula...",
        bad: "Your answer is stupid",
      },
    },
    {
      title: 'Academic Integrity',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      rules: [
        'Do homework yourself - no selling answers',
        'Cite sources when using others\' work',
        'Collaborate but don\'t copy',
        'Use AI responsibly (AI help okay, AI doing work not okay)',
      ],
      examples: {
        good: "I used the AI tutor to understand the concept, then solved it myself",
        bad: "Can someone send me the answers for tomorrow's test?",
      },
    },
    {
      title: 'Privacy and Safety',
      icon: Lock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      rules: [
        'Keep personal information private',
        'No sharing phone numbers/addresses/schools without permission',
        'Report suspicious behavior',
        'Block anyone making you uncomfortable',
      ],
      examples: {
        good: "Let's discuss this chapter in the forum",
        bad: "WhatsApp me at 0XX XXX XXXX for homework help",
      },
    },
    {
      title: 'Appropriate Content',
      icon: Shield,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      rules: [
        'Keep discussions to educational topics',
        'No profanity or offensive language',
        'No inappropriate images or links',
        'No spam or advertising',
      ],
      examples: {
        good: "Check out this helpful video on quadratic equations",
        bad: "[Inappropriate content or spam link]",
      },
    },
    {
      title: 'Healthy Environment',
      icon: Users,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      rules: [
        'Be constructive in criticism',
        'Celebrate others\' success',
        'Ask for help when struggling',
        'Take breaks from the platform',
      ],
      examples: {
        good: "Well done on passing! Your hard work paid off 🎉",
        bad: "You only passed because the test was easy",
      },
    },
  ];

  const consequences = [
    {
      level: '1st Violation',
      action: 'Warning and content removal',
      icon: AlertTriangle,
      color: 'text-yellow-600',
    },
    {
      level: '2nd Violation (within 30 days)',
      action: '24-hour suspension',
      icon: AlertTriangle,
      color: 'text-orange-600',
    },
    {
      level: '3rd Violation',
      action: '7-day suspension',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
    {
      level: 'Severe Violations',
      action: 'Immediate permanent ban',
      description: 'Threats, severe harassment, or illegal content',
      icon: XCircle,
      color: 'text-red-700',
    },
  ];

  const emergencyContacts = [
    { name: 'SADAG Mental Health Support', number: '0800 567 567' },
    { name: 'Childline Counseling', number: '116' },
    { name: 'LifeLine Crisis Support', number: '0861 322 322' },
    { name: 'SAPS Emergency', number: '10111' },
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl text-primary mb-4">
            Community Guidelines
          </h1>
          <p className="text-lg text-muted-foreground">
            Creating a safe, respectful, and supportive learning environment for all South African students
          </p>
        </div>

        {/* Safety Alert */}
        <Alert className="mb-8 border-secondary bg-secondary/10">
          <Shield className="h-5 w-5 text-secondary" />
          <AlertDescription className="text-base">
            Remember: Be respectful and helpful! These guidelines help us maintain a positive community for everyone.
          </AlertDescription>
        </Alert>

        {/* Guidelines Sections */}
        <div className="space-y-8 mb-12">
          {guidelines.map((guideline) => {
            const Icon = guideline.icon;
            return (
              <Card key={guideline.title} className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`${guideline.bgColor} p-3 rounded-lg`}>
                    <Icon className={`h-6 w-6 ${guideline.color}`} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-display text-primary mb-4">
                      {guideline.title}
                    </h2>
                    <ul className="space-y-2 mb-6">
                      {guideline.rules.map((rule, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{rule}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* Examples */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="border-l-4 border-emerald-500 bg-emerald-50 p-4 rounded">
                        <p className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Good Example
                        </p>
                        <p className="text-sm text-gray-700 italic">"{guideline.examples.good}"</p>
                      </div>
                      <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
                        <p className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          Bad Example
                        </p>
                        <p className="text-sm text-gray-700 italic">"{guideline.examples.bad}"</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Consequences */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-display text-primary mb-6">Consequences</h2>
          <p className="text-gray-700 mb-6">
            We enforce these guidelines through progressive discipline to help students learn and improve:
          </p>
          <div className="space-y-4">
            {consequences.map((consequence, index) => {
              const Icon = consequence.icon;
              return (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <Icon className={`h-6 w-6 ${consequence.color} flex-shrink-0 mt-0.5`} />
                  <div>
                    <p className="font-semibold text-gray-900">{consequence.level}</p>
                    <p className="text-gray-700">{consequence.action}</p>
                    {consequence.description && (
                      <p className="text-sm text-gray-600 mt-1">{consequence.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Appeals Process */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-display text-primary mb-4">Appeals Process</h2>
          <p className="text-gray-700 mb-4">
            If you believe a moderation decision was made in error, you can appeal:
          </p>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-semibold text-blue-900 mb-2">How to Appeal</p>
              <p className="text-gray-700">
                Contact <a href="mailto:support@edufutura.app" className="text-secondary hover:underline font-medium">support@edufutura.app</a> with your username and explanation
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-semibold text-blue-900 mb-2">Response Timeframe</p>
              <p className="text-gray-700">Appeals reviewed within 48 hours</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-semibold text-blue-900 mb-2">Successful Appeals</p>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Demonstrated misunderstanding of rules</li>
                <li>Evidence of reform and understanding</li>
                <li>New evidence supporting your case</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Emergency Contacts */}
        <Card className="p-6 border-red-200 bg-red-50">
          <h2 className="text-2xl font-display text-red-900 mb-4">Need Help?</h2>
          <p className="text-gray-700 mb-6">
            If you or someone you know needs immediate help, reach out to these South African support services:
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {emergencyContacts.map((contact) => (
              <a
                key={contact.number}
                href={`tel:${contact.number}`}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200 hover:border-red-400 transition-colors"
              >
                <span className="font-medium text-gray-900">{contact.name}</span>
                <span className="text-red-600 font-semibold">{contact.number}</span>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
