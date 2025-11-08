import { Bot, BookOpen, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Bot,
    title: "AI Study Assistant & Voice Tutor",
    description: "Get personalized help 24/7 with our AI-powered voice tutor using advanced language models and ultra-low latency responses.",
    gradient: "from-secondary/10 to-secondary/5"
  },
  {
    icon: BookOpen,
    title: "CAPS-Aligned Curriculum",
    description: "Complete South African curriculum content for all subjects aligned with Department of Basic Education standards.",
    gradient: "from-primary/10 to-primary/5"
  },
  {
    icon: Award,
    title: "Certificates & Career Guidance",
    description: "Earn official certificates and receive personalized career recommendations for tertiary education.",
    gradient: "from-accent/10 to-accent/5"
  }
];

export const FeaturesSection = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        {/* Section header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-primary">
            Everything You Need to Excel
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools and resources designed specifically for South African students
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index}
                className={`border-2 hover:border-secondary transition-all duration-300 hover:shadow-elegant hover:-translate-y-1 bg-gradient-to-br ${feature.gradient}`}
              >
                <CardHeader className="space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-gold flex items-center justify-center">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-xl font-serif text-primary">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
