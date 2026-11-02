import type { StaffRole } from "@/lib/constants";

export type ModuleKey =
  | "dashboard"
  | "members"
  | "memberships"
  | "wallet"
  | "rfid"
  | "attendance"
  | "courts"
  | "reservations"
  | "queue"
  | "matches"
  | "tournaments"
  | "rankings"
  | "tv"
  | "reports"
  | "inventory"
  | "shop"
  | "services"
  | "promotions"
  | "notifications"
  | "staff"
  | "settings"
  | "analytics"
  | "ai";

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "approve"
  | "manage";

const ALL_MODULES: ModuleKey[] = [
  "dashboard",
  "members",
  "memberships",
  "wallet",
  "rfid",
  "attendance",
  "courts",
  "reservations",
  "queue",
  "matches",
  "tournaments",
  "rankings",
  "tv",
  "reports",
  "inventory",
  "shop",
  "services",
  "promotions",
  "notifications",
  "staff",
  "settings",
  "analytics",
  "ai",
];

const ROLE_MODULES: Record<StaffRole, ModuleKey[]> = {
  super_admin: ALL_MODULES,
  manager: [
    "dashboard",
    "members",
    "memberships",
    "wallet",
    "rfid",
    "attendance",
    "courts",
    "reservations",
    "queue",
    "matches",
    "tournaments",
    "rankings",
    "tv",
    "reports",
    "inventory",
    "shop",
    "services",
    "promotions",
    "notifications",
    "staff",
    "settings",
    "analytics",
    "ai",
  ],
  cashier: [
    "dashboard",
    "members",
    "memberships",
    "wallet",
    "inventory",
    "shop",
    "services",
    "promotions",
    "reports",
  ],
  receptionist: [
    "dashboard",
    "members",
    "rfid",
    "attendance",
    "reservations",
    "queue",
    "matches",
    "services",
    "notifications",
  ],
  coach: [
    "dashboard",
    "members",
    "attendance",
    "courts",
    "matches",
    "tournaments",
    "rankings",
    "queue",
  ],
};

const ROLE_ACTIONS: Record<StaffRole, PermissionAction[]> = {
  super_admin: ["view", "create", "edit", "delete", "export", "approve", "manage"],
  manager: ["view", "create", "edit", "delete", "export", "approve", "manage"],
  cashier: ["view", "create", "edit", "export", "approve"],
  receptionist: ["view", "create", "edit"],
  coach: ["view", "create", "edit"],
};

export function canAccessModule(role: StaffRole | null | undefined, module: ModuleKey) {
  if (!role) return false;
  return ROLE_MODULES[role]?.includes(module) ?? false;
}

export function canPerform(
  role: StaffRole | null | undefined,
  action: PermissionAction
) {
  if (!role) return false;
  return ROLE_ACTIONS[role]?.includes(action) ?? false;
}

export function getAccessibleModules(role: StaffRole | null | undefined): ModuleKey[] {
  if (!role) return [];
  return ROLE_MODULES[role] ?? [];
}

/** Temporarily hidden from sidebar navigation. */
export const HIDDEN_NAV_MODULES: ReadonlySet<ModuleKey> = new Set([
  "members",
  "memberships",
  "rfid",
  "rankings",
  "promotions",
  "notifications",
  "wallet",
]);

export const NAV_ITEMS: {
  title: string;
  href: string;
  module: ModuleKey;
  icon: string;
  group: "overview" | "operations" | "engagement" | "commerce" | "system";
}[] = [
  { title: "Dashboard", href: "/dashboard", module: "dashboard", icon: "LayoutDashboard", group: "overview" },
  { title: "Analytics", href: "/analytics", module: "analytics", icon: "BarChart3", group: "overview" },
  { title: "AI Insights", href: "/ai", module: "ai", icon: "Sparkles", group: "overview" },
  { title: "Members", href: "/members", module: "members", icon: "Users", group: "operations" },
  { title: "Memberships", href: "/memberships", module: "memberships", icon: "BadgeCheck", group: "operations" },
  { title: "RFID", href: "/rfid", module: "rfid", icon: "CreditCard", group: "operations" },
  { title: "Attendance", href: "/attendance", module: "attendance", icon: "UserCheck", group: "operations" },
  { title: "Courts", href: "/courts", module: "courts", icon: "Map", group: "operations" },
  { title: "Reservations", href: "/reservations", module: "reservations", icon: "CalendarDays", group: "operations" },
  { title: "Open Play Queue", href: "/queue", module: "queue", icon: "ListOrdered", group: "operations" },
  { title: "Open Play Schedule", href: "/queue/schedule", module: "queue", icon: "CalendarClock", group: "operations" },
  { title: "Matches", href: "/matches", module: "matches", icon: "Swords", group: "operations" },
  { title: "Tournaments", href: "/tournaments", module: "tournaments", icon: "Trophy", group: "engagement" },
  { title: "Rankings", href: "/rankings", module: "rankings", icon: "Medal", group: "engagement" },
  { title: "TV Displays", href: "/tv", module: "tv", icon: "Monitor", group: "engagement" },
  { title: "Notifications", href: "/notifications", module: "notifications", icon: "Bell", group: "engagement" },
  { title: "Promotions", href: "/promotions", module: "promotions", icon: "TicketPercent", group: "engagement" },
  { title: "Wallet", href: "/wallet", module: "wallet", icon: "Wallet", group: "commerce" },
  { title: "Services", href: "/services", module: "services", icon: "Tags", group: "commerce" },
  { title: "Shop", href: "/shop", module: "shop", icon: "ShoppingBag", group: "commerce" },
  { title: "Inventory", href: "/inventory", module: "inventory", icon: "Package", group: "commerce" },
  { title: "Reports", href: "/reports", module: "reports", icon: "FileBarChart", group: "commerce" },
  { title: "Staff", href: "/staff", module: "staff", icon: "Shield", group: "system" },
  { title: "Settings", href: "/settings", module: "settings", icon: "Settings", group: "system" },
];
