import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeClient) {
    return stripeClient
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: '2023-10-16',
    typescript: true,
  })

  return stripeClient
}

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    priceId: null as string | null,
    interval: 'forever' as const,
    limits: {
      channels: 1,
      messagesPerMonth: 100,
      models: ['anthropic/claude-sonnet-4-5'],
    },
  },
  MONTHLY: {
    name: 'Monthly',
    price: 29,
    priceId: process.env.STRIPE_PRICE_MONTHLY!,
    interval: 'month' as const,
    limits: null,
  },
  THREE_MONTH: {
    name: '3 Months',
    price: 75,
    pricePerMonth: 25,
    savings: 12,
    discount: 13,
    priceId: process.env.STRIPE_PRICE_THREE_MONTH!,
    interval: '3 months' as const,
    limits: null,
  },
  YEARLY: {
    name: 'Yearly',
    price: 299,
    pricePerMonth: 24.92,
    savings: 49,
    discount: 14,
    priceId: process.env.STRIPE_PRICE_YEARLY!,
    interval: 'year' as const,
    limits: null,
  },
}

export const FREE_TIER_LIMITS = {
  channels: 1,
  messagesPerMonth: 100,
  allowedModels: ['anthropic/claude-sonnet-4-5'],
}
