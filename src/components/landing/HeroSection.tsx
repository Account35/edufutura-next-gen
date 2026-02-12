import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export const HeroSection = ({ onGetStarted }: HeroSectionProps) => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-hero overflow-hidden">
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, hsl(var(--primary)) 0, hsl(var(--primary)) 1px, transparent 0, transparent 50%)`,
          backgroundSize: '10px 10px'
        }} />
      </div>
      
      <div className="container mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-secondary/10 border border-secondary/20 rounded-full px-4 py-2 text-sm font-medium text-primary">
              <GraduationCap className="w-4 h-4" />
              <span>CAPS Curriculum Aligned</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold text-primary leading-tight">
              Master Your CAPS Curriculum with{" "}
              <span className="text-secondary">AI-Powered Learning</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
              Personalized education for South African students in Grades 6-12. 
              Get 24/7 AI tutoring, practice assessments, and earn official certificates.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                size="lg" 
                onClick={onGetStarted}
                className="bg-secondary hover:bg-secondary/90 text-primary font-semibold text-lg px-8 py-6 rounded-lg shadow-gold transition-all duration-300 hover:scale-105"
              >
                Start Learning Free
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-lg px-8 py-6 rounded-lg transition-all duration-300"
              >
                How It Works
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-6 justify-center lg:justify-start pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-4 rounded bg-gradient-to-r from-green-600 via-yellow-400 to-blue-600" />
                <span className="font-medium">Supporting SA Students</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-primary">
                  ✓
                </div>
                <span className="font-medium">DBE CAPS Aligned</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="text-sm text-muted-foreground font-medium">
                Powered by Advanced AI
              </div>
            </div>
          </div>

          {/* Right content - placeholder for hero image */}
          <div className="hidden lg:block relative">
            <div className="relative w-full h-[500px] rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 border-2 border-secondary/20 shadow-elegant overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <GraduationCap className="w-32 h-32 mx-auto text-secondary/30" />
                  <p className="text-muted-foreground text-sm">Hero illustration will be added here</p>
                </div>
              </div>
            </div>
            
            {/* Decorative floating elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-secondary/20 rounded-full blur-2xl animate-pulse" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-2xl animate-pulse delay-700" />
          </div>
        </div>
      </div>
    </section>
  );
};
