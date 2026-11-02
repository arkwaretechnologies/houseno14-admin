import type { OpenPlayPlayer } from "@/types";
import { DEMO_BRANCH } from "@/lib/demo-data";

const now = new Date().toISOString();

let demoPlayers: OpenPlayPlayer[] = [
  {
    id: "player-demo-1",
    branch_id: DEMO_BRANCH.id,
    full_name: "Jamie Cruz",
    gender: "male",
    skill_level: "intermediate",
    address: null,
    phone: "+63 917 111 0001",
    email: "jamie@email.com",
    created_at: now,
    updated_at: now,
    deleted_at: null,
  },
  {
    id: "player-demo-2",
    branch_id: DEMO_BRANCH.id,
    full_name: "Riley Santos",
    gender: "female",
    skill_level: "beginner",
    address: "BGC",
    phone: null,
    email: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  },
];

const listeners = new Set<() => void>();

export function getDemoPlayers() {
  return demoPlayers;
}

export function setDemoPlayers(next: OpenPlayPlayer[]) {
  demoPlayers = next;
  listeners.forEach((fn) => fn());
}

export function subscribeDemoPlayers(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
