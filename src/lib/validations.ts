import { z } from "zod";
import { ROLES } from "@/lib/constants";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const memberSchema = z.object({
  full_name: z.string().min(2, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  member_code: z.string().min(2),
  gender: z.string().optional(),
  notes: z.string().optional(),
  rfid_tag: z.string().optional(),
});

export const membershipPlanSchema = z.object({
  name: z.string().min(2),
  plan_type: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly", "vip"]),
  price: z.coerce.number().min(0),
  duration_days: z.coerce.number().int().positive(),
  discount_percent: z.coerce.number().min(0).max(100).default(0),
  benefits: z.array(z.string()).default([]),
  priority_booking: z.boolean().default(false),
  free_open_play_credits: z.coerce.number().int().min(0).default(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const walletTopUpSchema = z.object({
  member_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  payment_method: z.enum(["cash", "gcash", "maya", "qrph", "card", "wallet", "bank_transfer"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const reservationSchema = z.object({
  court_id: z.string().uuid(),
  member_id: z.string().uuid().optional(),
  guest_name: z.string().optional(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  amount: z.coerce.number().min(0),
  notes: z.string().optional(),
});

export const promoSchema = z.object({
  code: z.string().min(3).max(32),
  description: z.string().optional(),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.coerce.number().positive(),
  target: z.enum(["all", "vip", "new", "expiring"]),
  max_uses: z.coerce.number().int().positive().optional(),
});

export const notificationSchema = z.object({
  title: z.string().min(2),
  body: z.string().min(2),
  channel: z.enum(["push", "email", "sms", "in_app"]),
  audience: z.enum(["all", "specific", "vip", "expiring", "queue", "reservation"]),
  scheduled_at: z.string().datetime().optional(),
});

const staffRoleSchema = z.enum(ROLES);

const staffMemberBaseSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  admin_role: staffRoleSchema,
  branch_id: z.string().uuid(),
});

export const staffMemberCreateSchema = staffMemberBaseSchema.extend({
  mode: z.literal("create"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const staffMemberInviteSchema = staffMemberBaseSchema.extend({
  mode: z.literal("invite"),
});

export const staffMemberSchema = z.discriminatedUnion("mode", [
  staffMemberCreateSchema,
  staffMemberInviteSchema,
]);

export type MemberInput = z.infer<typeof memberSchema>;
export type MembershipPlanInput = z.infer<typeof membershipPlanSchema>;
export type WalletTopUpInput = z.infer<typeof walletTopUpSchema>;
export type StaffMemberInput = z.infer<typeof staffMemberSchema>;
