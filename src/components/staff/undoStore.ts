import type { JobSnapshot } from "../../lib/staffJobs";

/** The last job step a staff member tapped, while it can still be undone. */
export interface PendingUndo {
  appt: { id: string; customerUid: string };
  before: JobSnapshot;
  message: string;
  expiresAt: number;
}

/** How long Undo stays on screen after a tap */
export const UNDO_SECONDS = 10;

let pending: PendingUndo | null = null;
const listeners = new Set<(p: PendingUndo | null) => void>();

export function offerUndo(p: Omit<PendingUndo, "expiresAt">) {
  pending = { ...p, expiresAt: Date.now() + UNDO_SECONDS * 1000 };
  listeners.forEach((l) => l(pending));
}

export function clearUndo() {
  pending = null;
  listeners.forEach((l) => l(null));
}

export function subscribeToUndo(listener: (p: PendingUndo | null) => void): () => void {
  listeners.add(listener);
  listener(pending);
  return () => listeners.delete(listener);
}
