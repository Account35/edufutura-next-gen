import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

interface PricingSectionProps {
  onGetStarted: () => void;
}

const freeTierFeatures = [
  "Access all CAPS curriculum content",
  "Take unlimited practice quizzes",
  "Earn achievement badges",
  "Track your learning progress"
];

const premiumTierFeatures = [
  "Everything in Free, plus:",
  "AI-powered voice tutor with ElevenLabs",
  "Personalized assessments and testing",
  "Official certificates",
  "Community forums and study groups",
  "Career guidance system"
];

export const PricingSection = ({ onGetStarted }: PricingSectionProps) => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto">
        {/* Section header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-primary">
            Choose Your Learning Path
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free and upgrade when you're ready for advanced features
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free tier */}
          <Card className="border-2 hover:shadow-elegant transition-all duration-300">
            <CardHeader className="space-y-2 pb-8">
              <CardTitle className="text-2xl font-serif text-primary">Free Forever</CardTitle>
              <CardDescription className="text-base">Perfect for getting started</CardDescription>
              <div className="pt-4">
                <span className="text-4xl font-bold text-primary">R0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {freeTierFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-secondary" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold"
                onClick={onGetStarted}
              >
                Get Started Free
              </Button>
            </CardFooter>
          </Card>

          {/* Premium tier */}
          <Card className="border-2 border-secondary bg-gradient-to-br from-secondary/5 to-transparent shadow-gold hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
            {/* Popular badge */}
            <div className="absolute top-0 right-0 bg-secondary text-primary text-xs font-bold px-4 py-1 rounded-bl-lg">
              MOST POPULAR
            </div>
            
            <CardHeader className="space-y-2 pb-8">
              <CardTitle className="text-2xl font-serif text-primary">Premium</CardTitle>
              <CardDescription className="text-base">Unlock your full potential</CardDescription>
              <div className="pt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">R60</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <div className="text-sm text-accent font-medium">
                or R120/year (Save 50%)
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {premiumTierFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    index === 0 ? 'bg-secondary/20' : 'bg-secondary'
                  }`}>
                    <Check className={`w-3 h-3 ${index === 0 ? 'text-secondary' : 'text-primary'}`} />
                  </div>
                  <span className={index === 0 ? 'font-semibold text-primary' : 'text-foreground'}>
                    {feature}
                  </span>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-secondary hover:bg-secondary/90 text-primary font-semibold shadow-gold"
                onClick={onGetStarted}
              >
                Upgrade to Premium
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
};
