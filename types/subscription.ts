export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  currency: string;
  period: 'monthly' | 'yearly';
  dailyTranslations: number;
  maxLanguages: number;
  hasAds: boolean;
  features: string[];
}

export interface UserSubscription {
  planId: string;
  isActive: boolean;
  startDate: number;
  endDate: number;
  dailyUsage: {
    date: string;
    count: number;
  };
  isTrialUsed: boolean;
  originalTransactionIdentifierIOS?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    priceValue: 0,
    currency: 'USD',
    period: 'monthly',
    dailyTranslations: 100,
    maxLanguages: 2,
    hasAds: true,
    features: [
      'subscription.features.translation',
      'subscription.features.twoLanguages',
      'subscription.features.adSupported',
      'subscription.features.dailyLimit100',
    ],
  },
  {
    id: 'pro_monthly',
    name: 'Pro',
    price: '$2.99',
    priceValue: 2.99,
    currency: 'USD',
    period: 'monthly',
    dailyTranslations: 200,
    maxLanguages: 5,
    hasAds: false,
    features: [
      'subscription.features.translation',
      'subscription.features.fiveLanguages',
      'subscription.features.noAds',
      'subscription.features.dailyLimit200',
    ],
  },
  {
    id: 'pro_max_monthly',
    name: 'Pro Max',
    price: '$4.99',
    priceValue: 4.99,
    currency: 'USD',
    period: 'monthly',
    dailyTranslations: 500,
    maxLanguages: 5,
    hasAds: false,
    features: [
      'subscription.features.translation',
      'subscription.features.fiveLanguages',
      'subscription.features.noAds',
      'subscription.features.dailyLimit500',
      'subscription.features.prioritySupport',
    ],
  },
  {
    id: 'premium_yearly',
    name: 'Premium Yearly',
    price: '$29.99',
    priceValue: 29.99,
    currency: 'USD',
    period: 'yearly',
    dailyTranslations: 200,
    maxLanguages: 5,
    hasAds: false,
    features: [
      'subscription.features.translation',
      'subscription.features.fiveLanguages',
      'subscription.features.noAds',
      'subscription.features.dailyLimit200',
      'subscription.features.yearlyDiscount',
    ],
  },
];

export const IAP_PRODUCT_IDS = {
  PRO_MONTHLY: 'com.polylingo.pro.monthly',
  PRO_MAX_MONTHLY: 'com.polylingo.promax.monthly',
  PREMIUM_YEARLY: 'com.polylingo.premium.yearly',
} as const;
