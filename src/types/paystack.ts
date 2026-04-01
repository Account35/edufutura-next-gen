export type BillingPlan = 'monthly' | 'annual';
export type PaymentType = 'one_time' | 'recurring';

export interface PaystackInitializeResponse {
  publicKey: string;
  email: string;
  amount: number;
  currency: string;
  reference: string;
  planType: BillingPlan;
  paymentType: PaymentType;
  label: string;
  metadata: Record<string, unknown>;
}

export interface PaystackVerifyResponse {
  subscriptionStatus: 'active' | 'cancelled' | 'inactive' | 'expired';
  paymentStatus: 'success' | 'pending' | 'failed';
  planType: BillingPlan;
  paymentType: PaymentType;
  amount: number;
  nextPaymentDate: string | null;
  subscriptionEndDate: string | null;
  autoRenew: boolean;
}
