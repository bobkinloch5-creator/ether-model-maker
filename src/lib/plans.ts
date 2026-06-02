export type PlanKey = "starter" | "creator" | "studio";
export type AccountPlanKey = "free" | PlanKey;

export interface CreditPlan {
  key: PlanKey;
  name: string;
  price: number;
  amountCents: number;
  credits: number;
  desc: string;
  features: string[];
  popular?: boolean;
}

export const CREDIT_PLANS: CreditPlan[] = [
  {
    key: "starter",
    name: "Starter",
    price: 9.99,
    amountCents: 999,
    credits: 100,
    desc: "Quick test runs for new ideas and small texture jobs.",
    features: [
      "100 generation credits",
      "Text-to-3D tests",
      "Texture prompt experiments",
      "Community support",
    ],
  },
  {
    key: "creator",
    name: "Creator",
    price: 39.99,
    amountCents: 3999,
    credits: 500,
    desc: "The best fit for active SL creators building weekly.",
    features: [
      "500 generation credits",
      "Image-to-3D workflows",
      "PBR material generation",
      "Priority queue",
    ],
    popular: true,
  },
  {
    key: "studio",
    name: "Studio",
    price: 99.99,
    amountCents: 9999,
    credits: 1500,
    desc: "Higher-volume production for full asset packs and launches.",
    features: [
      "1,500 generation credits",
      "Full SL asset sessions",
      "Marketplace-ready iteration",
      "Dedicated support",
    ],
  },
];

export const FREE_PLAN_NAME = "Free";
export const PAYPAL_ME_USERNAME = "kinloch930";

export function getCreditPlan(key: string): CreditPlan | undefined {
  return CREDIT_PLANS.find((plan) => plan.key === key);
}

export function getAccountPlanLabel(planKey?: string | null, planName?: string | null): string {
  if (planName) return planName;
  if (!planKey || planKey === "free") return FREE_PLAN_NAME;
  return getCreditPlan(planKey)?.name ?? FREE_PLAN_NAME;
}

export function createPaypalMeUrl(plan: CreditPlan, purchaseIntentId: string, email?: string | null): string {
  const note = encodeURIComponent(
    [
      "KingDavez Studios",
      `${plan.name} plan`,
      `${plan.credits} credits`,
      `purchase ${purchaseIntentId}`,
      email ? `user ${email}` : undefined,
    ]
      .filter(Boolean)
      .join(" - "),
  );

  return `https://paypal.me/${PAYPAL_ME_USERNAME}/${plan.price.toFixed(2)}?note=${note}`;
}
