"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { REALTIME_CHANNELS } from "@/lib/constants";

export function useRealtimeTable<T extends { id: string }>(
  table: string,
  initial: T[],
  filter?: string
) {
  const [rows, setRows] = useState<T[]>(initial);

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes("your-project")) return;

    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;

    try {
      const supabase = createClient();
      channel = supabase
        .channel(`${REALTIME_CHANNELS.dashboard}:${table}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter,
          },
          (payload) => {
            setRows((current) => {
              if (payload.eventType === "INSERT") {
                return [payload.new as T, ...current];
              }
              if (payload.eventType === "UPDATE") {
                return current.map((row) =>
                  row.id === (payload.new as T).id ? (payload.new as T) : row
                );
              }
              if (payload.eventType === "DELETE") {
                return current.filter((row) => row.id !== (payload.old as T).id);
              }
              return current;
            });
          }
        )
        .subscribe();
    } catch {
      // Demo mode / missing env — skip realtime
    }

    return () => {
      if (channel) {
        try {
          const supabase = createClient();
          void supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      }
    };
  }, [table, filter]);

  return rows;
}

export function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
