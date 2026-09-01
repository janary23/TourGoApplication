// src/services/subscription.ts
// Reads the signed-in user's plan.
//
// TourGo has no payment provider wired up yet, so this deliberately does NOT
// expose upgrade/cancel/restore actions — per the rule that the UI must only
// offer what the backend can actually honour. It reports the real plan stored
// against the profile (defaulting to Free) and describes what each plan
// includes. When a provider is added, extend this module rather than replacing
// it: add the actions here and enable the buttons on the Subscription screen.

import { supabase } from './supabase';

export type PlanId = 'free' | 'premium';

export interface PlanBenefit {
  label: string;
  /** Whether this benefit is live in the app today. */
  available: boolean;
}

export interface Plan {
  id: PlanId;
  name: string;
  priceLabel: string;
  tagline: string;
  benefits: PlanBenefit[];
  /** False until a payment provider is connected. */
  purchasable: boolean;
}

export interface SubscriptionState {
  planId: PlanId;
  /** 'active' is the only state a Free plan can be in today. */
  status: 'active' | 'cancelled' | 'expired';
  /** Present only for paid plans backed by a provider. */
  renewsOn?: string | null;
  billingPeriod?: string | null;
}

/**
 * Plans. Free lists only capabilities the app genuinely ships today; Premium is
 * explicitly marked unavailable rather than advertising features that nothing
 * enforces yet.
 */
export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'TourGo Free',
    priceLabel: 'Free',
    tagline: 'Everything TourGo does today.',
    purchasable: false,
    benefits: [
      { label: 'Unlimited trips and itineraries', available: true },
      { label: 'Agilito AI itinerary planning', available: true },
      { label: 'Itinerary checks — duplicates, timing, travel time, pacing', available: true },
      { label: 'Wishlist and destination collections', available: true },
      { label: 'Group trips, Trip Codes and shared planning', available: true },
      { label: 'Trip albums for completed trips', available: true },
      { label: 'Expenses, polls, checklists and group chat', available: true },
    ],
  },
  {
    id: 'premium',
    name: 'TourGo Premium',
    priceLabel: 'Not yet available',
    tagline: 'Planned — no billing is connected yet.',
    purchasable: false,
    benefits: [
      { label: 'Higher AI generation limits', available: false },
      { label: 'Advanced route and schedule optimization', available: false },
      { label: 'Offline itinerary access', available: false },
    ],
  },
];

export function getPlan(planId: PlanId): Plan {
  return PLANS.find((p) => p.id === planId) ?? PLANS[0];
}

/** True when the error means the column isn't there (no plan column yet). */
function isMissingColumn(error: any): boolean {
  return error?.code === '42703' || /column .* does not exist/i.test(error?.message || '');
}

/**
 * The current user's subscription. Falls back to Free whenever there's no
 * plan recorded, no plan column, or no signed-in user — never throws, so the
 * Settings screen always renders something truthful.
 */
export async function getSubscription(): Promise<SubscriptionState> {
  const free: SubscriptionState = { planId: 'free', status: 'active' };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return free;

    const { data, error } = await supabase
      .from('profiles')
      .select('plan, plan_status, plan_renews_on, plan_billing_period')
      .eq('id', user.id)
      .single();

    if (error) {
      // No plan columns provisioned yet — everyone is on Free, which is true.
      if (isMissingColumn(error)) return free;
      return free;
    }

    const planId: PlanId = data?.plan === 'premium' ? 'premium' : 'free';
    return {
      planId,
      status: (data?.plan_status as SubscriptionState['status']) || 'active',
      renewsOn: data?.plan_renews_on ?? null,
      billingPeriod: data?.plan_billing_period ?? null,
    };
  } catch {
    return free;
  }
}
