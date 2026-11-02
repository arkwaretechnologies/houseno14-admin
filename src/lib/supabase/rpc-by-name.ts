import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/** Postgres RPC not listed in generated `Database` types (e.g. legacy names). */
export function rpcByName(
  client: Client,
  fn: string,
  args?: Record<string, unknown>
) {
  return (client as SupabaseClient).rpc(fn, args);
}
