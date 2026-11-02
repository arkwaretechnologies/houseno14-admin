import type {
  CourtStatus,
  MatchStatus,
  MembershipPlanType,
  PaymentMethod,
  QueueStatus,
  StaffRole,
  TournamentFormat,
  TxStatus,
  WalletTxType,
} from "@/lib/constants";

export type UUID = string;

export interface Branch {
  id: UUID;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffProfile {
  id: UUID;
  auth_user_id: UUID;
  branch_id: UUID | null;
  email: string;
  full_name: string;
  role: StaffRole;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  branch?: Branch | null;
}

export interface Member {
  id: UUID;
  branch_id: UUID;
  member_code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  status: "active" | "inactive" | "suspended" | "deleted";
  rfid_tag: string | null;
  elo_rating: number;
  wallet_balance: number;
  notes: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface MembershipPlan {
  id: UUID;
  branch_id: UUID | null;
  name: string;
  plan_type: MembershipPlanType;
  price: number;
  duration_days: number;
  discount_percent: number;
  benefits: string[];
  priority_booking: boolean;
  free_open_play_credits: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface MemberMembership {
  id: UUID;
  member_id: UUID;
  plan_id: UUID;
  branch_id: UUID;
  starts_at: string;
  ends_at: string;
  status: "active" | "expired" | "cancelled" | "pending";
  amount_paid: number;
  created_at: string;
  plan?: MembershipPlan;
  member?: Member;
}

export interface WalletTransaction {
  id: UUID;
  branch_id: UUID;
  member_id: UUID;
  type: WalletTxType;
  amount: number;
  balance_before: number;
  balance_after: number;
  payment_method: PaymentMethod | null;
  status: TxStatus;
  reference: string | null;
  notes: string | null;
  approved_by: UUID | null;
  created_at: string;
  member?: Member;
}

export interface RfidCard {
  id: UUID;
  branch_id: UUID;
  member_id: UUID | null;
  tag_uid: string;
  status: "active" | "inactive" | "lost" | "replaced";
  assigned_at: string | null;
  deactivated_at: string | null;
  created_at: string;
  member?: Member;
}

export interface RfidScanLog {
  id: UUID;
  branch_id: UUID;
  tag_uid: string;
  member_id: UUID | null;
  scanner_id: string | null;
  result: "success" | "unknown" | "inactive" | "duplicate";
  scanned_at: string;
  member?: Member;
}

export interface AttendanceRecord {
  id: UUID;
  branch_id: UUID;
  member_id: UUID;
  check_in_at: string;
  check_out_at: string | null;
  source: "rfid" | "manual" | "reservation" | "open_play";
  created_at: string;
  member?: Member;
}

export interface Court {
  id: UUID;
  branch_id: UUID;
  name: string;
  code: string;
  status: CourtStatus;
  capacity: number;
  is_exclusive: boolean;
  is_open_play: boolean;
  hourly_rate: number;
  image_url: string | null;
  operating_hours: Record<string, { open: string; close: string } | null>;
  notes: string | null;
  skill_level?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: UUID;
  branch_id: UUID;
  court_id: UUID;
  member_id: UUID | null;
  guest_name: string | null;
  starts_at: string;
  ends_at: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  amount: number;
  payment_status: TxStatus;
  notes: string | null;
  created_by: UUID | null;
  created_at: string;
  court?: Court;
  member?: Member;
}

export interface OpenPlayPlayer {
  id: UUID;
  branch_id: UUID;
  full_name: string;
  gender: "male" | "female";
  skill_level: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface QueueEntry {
  id: UUID;
  branch_id: UUID;
  member_id: UUID | null;
  walk_in_id?: UUID | null;
  position: number;
  status: QueueStatus;
  priority: number;
  party_size: number;
  joined_at: string;
  called_at: string | null;
  paused?: boolean;
  lane?: string;
  skill_level?: string | null;
  gender?: string | null;
  member?: Member;
}

export interface Match {
  id: UUID;
  branch_id: UUID;
  court_id: UUID | null;
  tournament_id: UUID | null;
  session_id?: UUID | null;
  status: MatchStatus;
  team_a: UUID[];
  team_b: UUID[];
  team_a_names?: string[];
  team_b_names?: string[];
  score_a: number;
  score_b: number;
  winner_team: "a" | "b" | null;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  created_at: string;
  court?: Court;
  source?: "open_play" | "manual";
}

export interface Tournament {
  id: UUID;
  branch_id: UUID;
  name: string;
  format: TournamentFormat;
  status:
    | "draft"
    | "registration"
    | "seeding"
    | "ongoing"
    | "completed"
    | "cancelled";
  starts_at: string | null;
  ends_at: string | null;
  max_players: number;
  /** Entry fee in centavos. Display pesos with `entry_fee_cents / 100`. */
  entry_fee_cents: number;
  description: string | null;
  advance_count: number | null;
  consolation_enabled: boolean;
  swiss_rounds: number;
  created_at: string;
  updated_at?: string;
}

export interface PlayerRanking {
  id: UUID;
  branch_id: UUID;
  member_id: UUID;
  season: string;
  elo_rating: number;
  wins: number;
  losses: number;
  win_rate: number;
  matches_played: number;
  rank_position: number;
  member?: Member;
}

export interface Product {
  id: UUID;
  branch_id: UUID;
  name: string;
  sku: string;
  category: "merchandise" | "balls" | "paddles" | "food" | "drinks" | "other";
  price: number;
  cost: number;
  stock_qty: number;
  low_stock_threshold: number;
  barcode: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PromoCode {
  id: UUID;
  branch_id: UUID | null;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  starts_at: string;
  ends_at: string | null;
  max_uses: number | null;
  used_count: number;
  target: "all" | "vip" | "new" | "expiring";
  is_active: boolean;
  created_at: string;
}

export interface NotificationCampaign {
  id: UUID;
  branch_id: UUID | null;
  title: string;
  body: string;
  channel: "push" | "email" | "sms" | "in_app";
  audience: "all" | "specific" | "vip" | "expiring" | "queue" | "reservation";
  status: "draft" | "scheduled" | "sent" | "failed";
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: UUID;
  branch_id: UUID | null;
  actor_id: UUID | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: UUID | null;
  ip_address: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
}

export interface TvDisplay {
  id: UUID;
  branch_id: UUID;
  name: string;
  layout: "queue" | "court_status" | "advertisement" | "announcement" | "sponsor";
  is_active: boolean;
  auto_rotate: boolean;
  rotate_seconds: number;
  config: Record<string, unknown>;
  created_at: string;
}

export interface BusinessSettings {
  id: UUID;
  branch_id: UUID;
  business_name: string;
  logo_url: string | null;
  background_url: string | null;
  primary_color: string;
  tax_rate: number;
  fees: Record<string, number>;
  payment_methods: PaymentMethod[];
  queue_rules: {
    players_per_match: number;
    auto_assign_court: boolean;
    notify_players: boolean;
  };
  match_rules: Record<string, unknown>;
  operating_hours: Record<string, { open: string; close: string } | null>;
  updated_at: string;
}

export interface DashboardStats {
  todays_revenue: number;
  todays_attendance: number;
  open_play_players: number;
  court_usage_percent: number;
  upcoming_reservations: number;
  memberships_expiring: number;
  wallet_topups_today: number;
  active_members: number;
  current_queue: number;
  current_matches: number;
  courts_available: number;
  courts_total: number;
  tournaments_active: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface HeatmapCell {
  day: string;
  hour: number;
  value: number;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}
