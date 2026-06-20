import { ToolDeps, ToolResult } from './tool-types';

/**
 * Tool: get_platform_info — explains how Mehnati works, its features, rewards,
 * policies/rules and account management.
 *
 * Mostly static knowledge (no system-prompt bloat — only loads when asked).
 * The worker rewards/commission numbers are read LIVE from the BonusConfig row
 * so they stay accurate if an admin changes them.
 */

const PLATFORM_OVERVIEW = {
  what: 'Mehnati is a marketplace that connects customers with verified, skilled workers (electricians, plumbers, carpenters, etc.) across Pakistan. Bilingual: English and Urdu.',
  categories: [
    'Electrician',
    'Plumber',
    'Carpenter',
    'Painter',
    'AC Technician',
    'Mason',
    'Mechanic',
    'Home Cleaner',
  ],
  bookingFlow:
    'PENDING → NEGOTIATION → ACCEPTED → IN_PROGRESS → COMPLETED. Price is agreed with the worker (with counter-offers) before work starts.',
  trustAndSafety:
    'Every worker is CNIC-verified before appearing. Customers can rate workers (1-5 stars), leave reviews, and file complaints handled by admins.',
};

const CUSTOMER_FEATURES = [
  'Browse 8 service categories and search workers by service, city and budget',
  'Use Nova (this AI assistant) to find and recommend the best worker',
  'View worker profiles: rating, completed jobs, experience, services, prices, portfolio',
  'Book a worker by choosing service, date, time, address and job description',
  'Negotiate the price with the worker through offers and counter-offers',
  'Chat with the worker in-app for each booking',
  'Track booking status live (pending → accepted → in progress → completed)',
  'Mark a job complete and leave a rating and review',
  'File a complaint if something goes wrong',
  'Save addresses, get notifications, and earn reward points & referrals',
];

const WORKER_FEATURES = [
  'Register with CNIC + selfie and get verified by admins',
  'Worker dashboard to manage profile, services, prices and portfolio photos',
  'Go online/offline to control availability',
  'Receive booking requests and accept, reject or negotiate the price',
  'Track active and past jobs',
  'Wallet with earnings, transactions and top-ups',
  'Tier & bonus system (Bronze, Silver, Gold, Platinum) with cashback rewards',
  'Pay platform commission and view payment history',
  'Set a weekly availability schedule',
  'Build reputation through ratings and completed jobs',
];

const ADMIN_FEATURES = [
  'Dashboard with platform analytics and revenue',
  'Verify or reject worker applications',
  'Manage users (block/unblock) and services',
  'Resolve disputes and complaints',
  'Configure commission and bonus rules',
];

// Customer reward points are fixed in code (customer-rewards.service.ts).
const CUSTOMER_REWARDS = {
  howToEarn: [
    'Earn 10 points for placing a booking',
    'Earn 20 points when a job is completed',
    'Earn 5 points for leaving a review',
    'Earn 50 points for each successful referral',
  ],
  referrals:
    'Every customer gets a unique referral code. When a friend signs up with it, you earn referral points.',
  note: 'Points accumulate in your account and are tracked in your rewards history.',
};

const ACCOUNT_MANAGEMENT = [
  'Sign up as a Customer or a Worker (workers go through CNIC verification)',
  'Log in with your phone number and password',
  'Forgot password: reset it via an OTP sent to your phone',
  'Change your password anytime from settings',
  'Update your profile details and picture',
  'Customers can save multiple addresses',
  'Admins may block accounts that break the rules; blocked users cannot log in',
];

const POLICIES = [
  'Workers must be CNIC-verified before they can appear or take jobs',
  'Prices are negotiated and agreed with the worker BEFORE work begins (currency: PKR)',
  'Payment and final price are confirmed through the booking, not paid to the platform upfront',
  'Customers rate workers 1-5 stars; reviews are public on the worker profile',
  'Complaints are reviewed and resolved by admins; serious issues can block an account',
  'Workers pay a platform commission on completed jobs and must clear dues by the due date',
  'Excessive cancellations or low ratings can suspend a worker’s bonus eligibility',
];

/** Pull live commission/bonus numbers; fall back to defaults if the row is absent. */
async function buildWorkerRewards(deps: ToolDeps) {
  const cfg = await deps.prisma.bonusConfig.findFirst().catch(() => null);
  const pct = (v: any, d: number) =>
    `${Math.round((Number(v ?? d)) * 100)}%`;

  return {
    commission: `Workers pay a ${pct(cfg?.commissionRate, 0.1)} commission on completed jobs.`,
    tiers: [
      `Bronze: reached at ${cfg?.bronzeJobs ?? 20} jobs → ${pct(cfg?.bronzeCashback, 0.1)} cashback`,
      `Silver: ${cfg?.silverJobs ?? 50} jobs → ${pct(cfg?.silverCashback, 0.15)} cashback`,
      `Gold: ${cfg?.goldJobs ?? 100} jobs → ${pct(cfg?.goldCashback, 0.2)} cashback`,
      `Platinum: ${cfg?.platinumJobs ?? 250} jobs → ${pct(cfg?.platinumCashback, 0.25)} cashback`,
    ],
    eligibility: `To qualify for bonuses, workers need at least a ${Number(cfg?.minRating ?? 4.5)}-star rating, a completion rate of ${pct(cfg?.minCompletionRate, 0.9)}+, and a cancellation rate under ${pct(cfg?.maxCancellationRate, 0.1)}.`,
    note: 'Cashback bonuses are credited to the worker wallet for each completed window of jobs.',
  };
}

export async function getPlatformInfo(
  deps: ToolDeps,
  args: {
    topic?: 'customer' | 'worker' | 'rewards' | 'policies' | 'account' | 'general' | 'all';
  },
): Promise<ToolResult> {
  const topic = args?.topic ?? 'customer';
  const all = topic === 'all';
  const data: Record<string, any> = { overview: PLATFORM_OVERVIEW };

  if (all || topic === 'customer') data.customerFeatures = CUSTOMER_FEATURES;
  if (all || topic === 'worker') data.workerFeatures = WORKER_FEATURES;

  if (all || topic === 'rewards') {
    data.customerRewards = CUSTOMER_REWARDS;
    data.workerRewards = await buildWorkerRewards(deps);
  }
  if (all || topic === 'policies') data.policies = POLICIES;
  if (all || topic === 'account') data.accountManagement = ACCOUNT_MANAGEMENT;
  if (all) data.adminFeatures = ADMIN_FEATURES;

  return { data };
}
