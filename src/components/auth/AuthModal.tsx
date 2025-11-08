import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { AuthMethodSelection } from "./AuthMethodSelection";
import { EmailRegistrationForm } from "./EmailRegistrationForm";
import { LoginForm } from "./LoginForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthView = "selection" | "email-register" | "phone-register" | "google" | "login";

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [authView, setAuthView] = useState<AuthView>("selection");

  const handleClose = () => {
    setAuthView("selection");
    onClose();
  };

  const getTitle = () => {
    switch (authView) {
      case "email-register":
        return "Create Your Account";
      case "login":
        return "Welcome Back";
      default:
        return "Join EduFutura";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-background border-2 border-border">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-serif text-primary">
              {getTitle()}
            </DialogTitle>
            <button
              onClick={handleClose}
              className="rounded-full p-1 hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {authView === "selection" && (
            <AuthMethodSelection
              onSelectEmail={() => setAuthView("email-register")}
              onSelectPhone={() => setAuthView("phone-register")}
              onSelectGoogle={() => setAuthView("google")}
              onSwitchToLogin={() => setAuthView("login")}
            />
          )}

          {authView === "email-register" && (
            <EmailRegistrationForm
              onSuccess={handleClose}
              onSwitchToLogin={() => setAuthView("login")}
            />
          )}

          {authView === "login" && (
            <LoginForm
              onSuccess={handleClose}
              onSwitchToRegister={() => setAuthView("selection")}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
