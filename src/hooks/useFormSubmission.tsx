import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface UseFormSubmissionOptions {
  onSuccess?: (data?: any) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export const useFormSubmission = (options: UseFormSubmissionOptions = {}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  const handleSubmit = async <T,>(
    submitFn: () => Promise<T>
  ): Promise<T | null> => {
    // Prevent double submission
    if (isSubmitting) {
      return null;
    }

    setIsSubmitting(true);
    setSubmitCount((prev) => prev + 1);

    try {
      const result = await submitFn();

      if (options.successMessage) {
        toast({
          title: 'Success',
          description: options.successMessage,
          className: 'bg-green-500 text-white border-green-600',
        });
      }

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error) {
      const errorObj = error as Error;

      if (options.errorMessage) {
        toast({
          title: 'Error',
          description: options.errorMessage,
          variant: 'destructive',
        });
      }

      if (options.onError) {
        options.onError(errorObj);
      }

      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setIsSubmitting(false);
    setSubmitCount(0);
  };

  return {
    isSubmitting,
    submitCount,
    handleSubmit,
    reset,
  };
};
