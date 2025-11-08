export const PRICING = {
  MONTHLY_PRICE: 60,
  ANNUAL_PRICE: 120,
  CURRENCY_SYMBOL: 'R',
  CURRENCY_CODE: 'ZAR',
  ANNUAL_SAVINGS: 600,
} as const;

export const FEATURES = {
  FREE: [
    'Access to curriculum content',
    'Basic quizzes',
    'Badge collection',
    'Progress tracking',
  ],
  PREMIUM: [
    'AI voice tutor',
    'Personalized assessments',
    'Official certificates',
    'Community forums',
    'Priority support',
    'Advanced analytics',
  ],
} as const;
