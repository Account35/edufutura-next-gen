import { toast } from '@/hooks/use-toast';

export const showSuccessToast = (message: string, description?: string) => {
  toast({
    title: message,
    description,
    className: 'bg-green-500 text-white border-green-600',
  });
};

export const showErrorToast = (message: string, description?: string) => {
  toast({
    title: message,
    description,
    variant: 'destructive',
  });
};

export const showWarningToast = (message: string, description?: string) => {
  toast({
    title: message,
    description,
    className: 'bg-yellow-500 text-yellow-950 border-yellow-600',
  });
};

export const showInfoToast = (message: string, description?: string) => {
  toast({
    title: message,
    description,
    className: 'bg-blue-500 text-white border-blue-600',
  });
};
