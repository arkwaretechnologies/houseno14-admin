import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AuditLog } from "@/types";

type Client = SupabaseClient<Database>;

export async function writeAudit(
  client: Client,
  payload: {
    branch_id?: string | null;
    actor_id?: string | null;
    actor_name?: string | null;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    ip_address?: string | null;
    before_data?: Record<string, unknown> | null;
    after_data?: Record<string, unknown> | null;
  }
) {
  // audit_logs is added by the additive admin migration
  const { error } = await (client as SupabaseClient)
    .from("audit_logs")
    .insert(payload);
  if (error) throw error;
}

export async function listAuditLogs(client: Client, limit = 50) {
  const { data, error } = await (client as SupabaseClient)
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AuditLog[];
}
