declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: Record<string, unknown>) => {
        openIframe: () => void;
      };
    };
  }
}

let paystackScriptPromise: Promise<void> | null = null;

export const loadPaystackPopup = async () => {
  if (window.PaystackPop) {
    return;
  }

  if (!paystackScriptPromise) {
    paystackScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-paystack-popup="true"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Paystack checkout.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.dataset.paystackPopup = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Paystack checkout.'));
      document.body.appendChild(script);
    });
  }

  await paystackScriptPromise;

  if (!window.PaystackPop) {
    throw new Error('Paystack checkout is unavailable.');
  }
};
