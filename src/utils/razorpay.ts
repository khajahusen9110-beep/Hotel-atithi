import { supabase } from '../lib/supabase';

export type RazorpayOutcome =
  | { status: 'paid' }
  | { status: 'verification_pending'; message: string }
  | { status: 'failed'; message: string }
  | { status: 'dismissed' };

interface StartPaymentParams {
  orderId: string;
  orderLabel: string;
  prefill?: { name?: string; contact?: string; email?: string };
}

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay]');
    const script = existing ?? document.createElement('script');
    if (!existing) {
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.razorpay = 'true';
      document.body.appendChild(script);
    }
    script.addEventListener('load', () => resolve(!!window.Razorpay));
    script.addEventListener('error', () => resolve(false));
    setTimeout(() => resolve(!!window.Razorpay), 10000);
  });

/**
 * Opens Razorpay checkout for an existing order.
 *
 * The amount and the Razorpay order are created server-side by the
 * `create-razorpay-order` edge function, and the payment is marked paid only by
 * the `verify-payment` edge function after checking the signature. The browser
 * never writes payment_status itself.
 */
export async function startRazorpayPayment({
  orderId,
  orderLabel,
  prefill,
}: StartPaymentParams): Promise<RazorpayOutcome> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    return {
      status: 'failed',
      message: 'Payment gateway could not load. Check your internet connection and try again.',
    };
  }

  const { data: rz, error: rzError } = await supabase.functions.invoke('create-razorpay-order', {
    body: { order_id: orderId },
  });

  const razorpayOrderId: string | undefined = rz?.razorpayOrderId || rz?.razorpay_order_id || rz?.id;
  const keyId: string | undefined =
    rz?.keyId || rz?.key_id || rz?.key || import.meta.env.VITE_RAZORPAY_KEY_ID;
  const amount: number | undefined = rz?.amount;

  if (rzError || !razorpayOrderId || !keyId) {
    console.error('create-razorpay-order failed:', rzError, rz);
    return {
      status: 'failed',
      message: 'Could not start online payment right now. Please try again or choose Cash on Delivery.',
    };
  }

  return new Promise<RazorpayOutcome>((resolve) => {
    let settled = false;
    let lastFailure: string | null = null;
    const finish = (outcome: RazorpayOutcome) => {
      if (!settled) {
        settled = true;
        resolve(outcome);
      }
    };

    const rzp = new window.Razorpay({
      key: keyId,
      ...(amount ? { amount } : {}),
      currency: 'INR',
      name: 'Hotel Atithi',
      description: orderLabel,
      image: '/app-favicon.ico',
      order_id: razorpayOrderId,
      prefill: {
        name: prefill?.name || undefined,
        contact: prefill?.contact || undefined,
        email: prefill?.email || undefined,
      },
      theme: { color: '#d97706' },
      modal: {
        // Razorpay keeps the modal open after a failed attempt so the customer can
        // retry; we only settle once they close it.
        ondismiss: () =>
          finish(lastFailure ? { status: 'failed', message: lastFailure } : { status: 'dismissed' }),
      },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        const { data: verified, error: verifyError } = await supabase.functions.invoke('verify-payment', {
          body: {
            order_id: orderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          },
        });

        const ok =
          !verifyError &&
          (verified === true || verified?.success === true || verified?.verified === true || verified?.status === 'paid');

        if (ok) {
          finish({ status: 'paid' });
        } else {
          console.error('verify-payment failed:', verifyError, verified);
          finish({
            status: 'verification_pending',
            message:
              'Payment received by Razorpay but confirmation is pending. If money was deducted, it will reflect shortly or be refunded automatically.',
          });
        }
      },
    });

    rzp.on('payment.failed', (resp: any) => {
      lastFailure =
        resp?.error?.description || 'Online payment failed. You can retry from the order page.';
    });

    rzp.open();
  });
}
