import { BRAND_SHORT_DESCRIPTION } from "@/lib/brand";

export const APP_NAME = "House No 14 Admin";
export const APP_DESCRIPTION = BRAND_SHORT_DESCRIPTION;

export const ROLES = [
  "super_admin",
  "manager",
  "cashier",
  "receptionist",
  "coach",
] as const;

export type StaffRole = (typeof ROLES)[number];

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  cashier: "Cashier",
  receptionist: "Receptionist",
  coach: "Coach",
};

export const MEMBERSHIP_PLAN_TYPES = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "vip",
] as const;

export type MembershipPlanType = (typeof MEMBERSHIP_PLAN_TYPES)[number];

export const PAYMENT_METHODS = [
  "cash",
  "gcash",
  "maya",
  "qrph",
  "card",
  "wallet",
  "bank_transfer",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const COURT_STATUSES = [
  "available",
  "occupied",
  "reserved",
  "maintenance",
  "closed",
] as const;

export type CourtStatus = (typeof COURT_STATUSES)[number];

export const QUEUE_STATUSES = [
  "waiting",
  "called",
  "playing",
  "skipped",
  "cancelled",
  "completed",
] as const;

export type QueueStatus = (typeof QUEUE_STATUSES)[number];

export const MATCH_STATUSES = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type MatchStatus = (typeof MATCH_STATUSES)[number];

export const TOURNAMENT_FORMATS = [
  "single_elimination",
  "double_elimination",
  "round_robin",
  "swiss",
] as const;

export type TournamentFormat = (typeof TOURNAMENT_FORMATS)[number];

export const MATCHING_STYLES = [
  "auto_balanced",
  "skill_separated",
  "winner_loser",
  "mixed_doubles",
  "skill_courts",
] as const;

export type MatchingStyle = (typeof MATCHING_STYLES)[number];

export const MATCHING_STYLE_LABELS: Record<MatchingStyle, string> = {
  auto_balanced: "Auto Balanced",
  skill_separated: "Skill-Separated",
  winner_loser: "Winner / Loser Groups",
  mixed_doubles: "Mixed Doubles",
  skill_courts: "Skill Courts",
};

export const MATCHING_STYLE_DESCRIPTIONS: Record<MatchingStyle, string> = {
  auto_balanced:
    "Everyone shares one queue. Teams are ELO-balanced each round.",
  skill_separated:
    "Players with similar skill levels are matched together.",
  winner_loser:
    "Winners play winners and losers play losers after each match.",
  mixed_doubles: "Each game needs two men and two women (1M+1F per team).",
  skill_courts:
    "Courts are tagged by skill; each skill group has its own queue.",
};

export const SKILL_LEVELS = [
  "beginner",
  "novice",
  "intermediate",
  "advanced",
  "professional",
] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: "Beginner",
  novice: "Novice",
  intermediate: "Intermediate",
  advanced: "Advanced",
  professional: "Professional",
};

export const QUEUE_LANES = [
  "main",
  "winner",
  "loser",
  "beginner",
  "novice",
  "intermediate",
  "advanced",
  "professional",
] as const;

export type QueueLane = (typeof QUEUE_LANES)[number];

export const WALLET_TX_TYPES = [
  "top_up",
  "cash_in",
  "refund",
  "adjustment",
  "purchase",
  "reservation",
  "open_play",
] as const;

export type WalletTxType = (typeof WALLET_TX_TYPES)[number];

export const TX_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "completed",
  "cancelled",
] as const;

export type TxStatus = (typeof TX_STATUSES)[number];

export const PAGE_SIZE = 20;
export const DEBOUNCE_MS = 350;
export const REALTIME_CHANNELS = {
  attendance: "attendance",
  rfid: "rfid_scans",
  queue: "open_play_queue",
  reservations: "reservations",
  wallet: "wallet_transactions",
  matches: "matches",
  tv: "tv_displays",
  notifications: "notifications",
  dashboard: "dashboard_widgets",
} as const;

export const BRANCH_SCOPE = {
  current: "current",
  all: "all",
} as const;
