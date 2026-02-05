import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AppErrorBoundary } from "./components/error-boundaries/AppErrorBoundary";
import { toast } from "sonner";

// Global safety net for unhandled promise rejections
// This prevents the entire app from crashing when async errors slip through
window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  console.error("Unhandled promise rejection:", event.reason);
  
  // Show user-friendly error toast
  toast.error("An unexpected error occurred. Please try again.");
  
  // Prevent the default browser behavior (crash/console error)
  event.preventDefault();
});

// Global error handler for uncaught exceptions
window.addEventListener("error", (event: ErrorEvent) => {
  console.error("Uncaught error:", event.error);
  
  // Only show toast for script errors, not resource loading errors
  if (event.error) {
    toast.error("Something went wrong. Please refresh the page.");
  }
});

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
