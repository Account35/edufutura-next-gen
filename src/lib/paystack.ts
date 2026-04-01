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
        const parentForm = existingScript.closest('form[data-paystack-host="true"]');
        if (!parentForm) {
          existingScript.remove();
          paystackScriptPromise = null;
          reject(new Error('Paystack checkout script was mounted outside the required form container.'));
          return;
        }

        if (existingScript.dataset.loaded === 'true' || existingScript.readyState === 'complete') {
          resolve();
          return;
        }

        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Paystack checkout.')), { once: true });
        return;
      }

      let formHost = document.querySelector<HTMLFormElement>('form[data-paystack-host="true"]');
      if (!formHost) {
        formHost = document.createElement('form');
        formHost.dataset.paystackHost = 'true';
        formHost.style.position = 'absolute';
        formHost.style.width = '0';
        formHost.style.height = '0';
        formHost.style.opacity = '0';
        formHost.style.pointerEvents = 'none';
        formHost.style.overflow = 'hidden';
        formHost.setAttribute('aria-hidden', 'true');
        document.body.appendChild(formHost);
      }

      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.dataset.paystackPopup = 'true';
      script.onload = () => {
        script.dataset.loaded = 'true';
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Paystack checkout.'));
      formHost.appendChild(script);
    });
  }

  try {
    await Promise.race([
      paystackScriptPromise,
      new Promise<void>((_, reject) => {
        window.setTimeout(() => reject(new Error('Paystack checkout timed out while loading.')), 15000);
      }),
    ]);
  } catch (error) {
    paystackScriptPromise = null;
    throw error;
  }

  if (!window.PaystackPop) {
    paystackScriptPromise = null;
    throw new Error('Paystack checkout is unavailable.');
  }
};
