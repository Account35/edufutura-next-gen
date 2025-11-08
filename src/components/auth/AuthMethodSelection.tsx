import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Smartphone, Chrome } from "lucide-react";

interface AuthMethodSelectionProps {
  onSelectEmail: () => void;
  onSelectPhone: () => void;
  onSelectGoogle: () => void;
  onSwitchToLogin: () => void;
}

export const AuthMethodSelection = ({
  onSelectEmail,
  onSelectPhone,
  onSelectGoogle,
  onSwitchToLogin
}: AuthMethodSelectionProps) => {
  const methods = [
    {
      icon: Mail,
      title: "Continue with Email",
      description: "Create account with email and password verification",
      onClick: onSelectEmail
    },
    {
      icon: Smartphone,
      title: "Continue with Phone Number",
      description: "Sign up using your South African mobile number with OTP",
      onClick: onSelectPhone
    },
    {
      icon: Chrome,
      title: "Continue with Google",
      description: "Quick signup with your Google account",
      onClick: onSelectGoogle
    }
  ];

  return (
    <div className="space-y-4">
      {methods.map((method, index) => {
        const Icon = method.icon;
        return (
          <Card
            key={index}
            className="cursor-pointer hover:border-secondary transition-all duration-300 hover:shadow-elegant"
            onClick={method.onClick}
          >
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              <div className="w-12 h-12 rounded-lg bg-gradient-gold flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-serif text-primary">
                  {method.title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                {method.description}
              </CardDescription>
            </CardContent>
          </Card>
        );
      })}

      <div className="text-center pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            onClick={onSwitchToLogin}
            className="text-secondary hover:text-secondary/80 font-semibold transition-colors"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
};
