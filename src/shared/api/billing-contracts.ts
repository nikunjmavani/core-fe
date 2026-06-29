import { z } from 'zod';

import { isoDateString, publicId } from '@/core/types/wire.ts';

/** Subscription lifecycle status (normalized from core-be uppercase wire values). */
export const billingSubscriptionStatusSchema = z.enum([
  'active',
  'trialing',
  'past_due',
  'canceled',
  'paused',
  'unpaid',
  'incomplete',
  'incomplete_expired',
]);
export type BillingSubscriptionStatus = z.infer<typeof billingSubscriptionStatusSchema>;

export const billingCycleSchema = z.enum(['monthly', 'yearly']);
export type BillingCycle = z.infer<typeof billingCycleSchema>;

export const billingPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  priceMonthly: z.number().int().nonnegative(),
  priceYearly: z.number().int().nonnegative(),
  currency: z.string(),
  isActive: z.boolean(),
  seatLimit: z.number().int().positive().nullable(),
});
export type BillingPlan = z.infer<typeof billingPlanSchema>;

export const billingSubscriptionSchema = z.object({
  id: z.string(),
  planId: z.string().nullable(),
  status: billingSubscriptionStatusSchema,
  billingCycle: billingCycleSchema,
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  trialEnd: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.string().nullable(),
  provider: z.string().nullable(),
  seatsTotal: z.number().int().positive().nullable(),
  seatsUsed: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type BillingSubscription = z.infer<typeof billingSubscriptionSchema>;

/** Wire schemas — mirror core-be billing serializers. */
export const billingPlanWireSchema = z.object({
  id: publicId('pln'),
  name: z.string(),
  description: z.string().nullable(),
  price_monthly: z.string(),
  price_yearly: z.string(),
  currency: z.string(),
  is_active: z.boolean(),
  features: z.record(z.string(), z.union([z.boolean(), z.number(), z.string()])),
  limits: z.object({
    seats: z.number().int().positive().nullable(),
  }),
  created_at: isoDateString,
  updated_at: isoDateString,
});

export const billingSubscriptionWireSchema = z.object({
  id: publicId('sub'),
  plan_id: publicId('pln').nullable(),
  status: z.string(),
  billing_cycle: z.string(),
  current_period_start: isoDateString,
  current_period_end: isoDateString,
  trial_end: isoDateString.nullable(),
  cancel_at_period_end: z.boolean(),
  canceled_at: isoDateString.nullable(),
  provider: z.string().nullable(),
  seats_total: z.number().int().positive().nullable(),
  seats_used: z.number().int().nonnegative(),
  created_at: isoDateString,
  updated_at: isoDateString,
});

export const billingPaymentSetupWireSchema = z.object({
  client_secret: z.string().nullable(),
});

export const billingInvoiceStatusSchema = z.enum([
  'draft',
  'open',
  'paid',
  'void',
  'uncollectible',
]);
export type BillingInvoiceStatus = z.infer<typeof billingInvoiceStatusSchema>;

export const billingInvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string().nullable(),
  status: billingInvoiceStatusSchema,
  amountDue: z.number().int().nonnegative(),
  amountPaid: z.number().int().nonnegative(),
  currency: z.string(),
  createdAt: z.string(),
  dueDate: z.string().nullable(),
  hostedInvoiceUrl: z.string().nullable(),
  invoicePdfUrl: z.string().nullable(),
});
export type BillingInvoice = z.infer<typeof billingInvoiceSchema>;

export const billingPaymentMethodSchema = z.object({
  id: z.string(),
  brand: z.string(),
  last4: z.string(),
  expMonth: z.number().int(),
  expYear: z.number().int(),
  isDefault: z.boolean(),
});
export type BillingPaymentMethod = z.infer<typeof billingPaymentMethodSchema>;

export const billingInvoiceWireSchema = z.object({
  id: z.string(),
  invoice_number: z.string().nullable(),
  status: z.string(),
  amount_due: z.string(),
  amount_paid: z.string(),
  currency: z.string(),
  created_at: isoDateString,
  due_date: isoDateString.nullable(),
  hosted_invoice_url: z.string().nullable(),
  invoice_pdf: z.string().nullable(),
});

export const billingPaymentMethodWireSchema = z.object({
  id: z.string(),
  brand: z.string(),
  last4: z.string(),
  exp_month: z.number().int(),
  exp_year: z.number().int(),
  is_default: z.boolean(),
});
