import assert from "node:assert/strict";
import test from "node:test";
import { canAccessModule, canPerform, getAccessibleModules } from "../src/lib/permissions";
import { formatCurrency, getInitials, slugify } from "../src/lib/utils";
import { memberSchema, walletTopUpSchema } from "../src/lib/validations";

test("super admin can access all key modules", () => {
  assert.equal(canAccessModule("super_admin", "settings"), true);
  assert.equal(canAccessModule("super_admin", "wallet"), true);
  assert.ok(getAccessibleModules("super_admin").length >= 18);
});

test("cashier cannot access staff settings", () => {
  assert.equal(canAccessModule("cashier", "staff"), false);
  assert.equal(canAccessModule("cashier", "wallet"), true);
  assert.equal(canPerform("cashier", "delete"), false);
});

test("receptionist queue access without inventory", () => {
  assert.equal(canAccessModule("receptionist", "queue"), true);
  assert.equal(canAccessModule("receptionist", "inventory"), false);
});

test("formatCurrency returns PHP-style output", () => {
  const value = formatCurrency(2500);
  assert.ok(value.includes("2") && value.includes("500"));
});

test("getInitials and slugify helpers", () => {
  assert.equal(getInitials("Alex Rivera"), "AR");
  assert.equal(slugify("House No 14 BGC"), "house-no-14-bgc");
});

test("memberSchema validates required name", () => {
  const bad = memberSchema.safeParse({ full_name: "A", member_code: "PV-1" });
  assert.equal(bad.success, false);

  const good = memberSchema.safeParse({
    full_name: "Jordan Cruz",
    member_code: "PV-1001",
    email: "jordan@email.com",
  });
  assert.equal(good.success, true);
});

test("walletTopUpSchema rejects non-positive amounts", () => {
  const result = walletTopUpSchema.safeParse({
    member_id: "00000000-0000-0000-0000-000000000001",
    amount: 0,
    payment_method: "gcash",
  });
  assert.equal(result.success, false);
});
