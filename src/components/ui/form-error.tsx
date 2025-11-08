import { X } from 'lucide-react';

interface FormErrorProps {
  message: string;
}

export const FormError = ({ message }: FormErrorProps) => {
  return (
    <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
      <X className="w-3 h-3 flex-shrink-0" />
      <span>{message}</span>
    </p>
  );
};

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export const FormField = ({ label, htmlFor, error, required, children }: FormFieldProps) => {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && <FormError message={error} />}
    </div>
  );
};
