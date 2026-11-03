import { addDoc, collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Walk-in tickets: customers who arrive at the bay without a booking. They never
 * block online booking slots. Walk-ins pay at the bay (cash or card) and earn no points.
 */

export type WalkInStatus = 'waiting' | 'in_progress' | 'done' | 'left';
export type WalkInPayment = 'cash' | 'card';

export interface WalkInTicket {
  id: string;
  /** e.g. W-003, numbered per day */
  ticketNumber: string;
  date: string;
  vehicle: string;
  plate?: string;
  customerName?: string;
  phone?: string;
  serviceIds: string[];
  serviceNames: string[];
  total: number;
  paymentMethod: WalkInPayment;
  status: WalkInStatus;
  createdAt: number;
  createdBy: string;
  createdByName: string;
  startedAt?: number;
  finishedAt?: number;
  handledByName?: string;
}

export const WALK_IN_STATUS_LABELS: Record<WalkInStatus, string> = {
  waiting: 'Waiting',
  in_progress: 'In progress',
  done: 'Done',
  left: 'Left',
};

export function subscribeToWalkIns(date: string, callback: (tickets: WalkInTicket[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'walkIns'), where('date', '==', date)),
    (snap) => {
      const list = snap.docs.map((d) => ({ ...(d.data() as Omit<WalkInTicket, 'id'>), id: d.id }));
      list.sort((a, b) => a.createdAt - b.createdAt);
      callback(list);
    },
    (err) => {
      console.warn('Walk-ins unavailable:', err.message);
      callback([]);
    }
  );
}

/** All walk-ins in a date range (inclusive), for analytics. */
export function subscribeToWalkInsRange(
  fromDate: string,
  toDate: string,
  callback: (tickets: WalkInTicket[]) => void
): () => void {
  return onSnapshot(
    query(collection(db, 'walkIns'), where('date', '>=', fromDate), where('date', '<=', toDate)),
    (snap) => callback(snap.docs.map((d) => ({ ...(d.data() as Omit<WalkInTicket, 'id'>), id: d.id }))),
    (err) => {
      console.warn('Walk-in history unavailable:', err.message);
      callback([]);
    }
  );
}

export async function createWalkIn(
  input: Omit<WalkInTicket, 'id' | 'ticketNumber' | 'status' | 'createdAt'>,
  existingToday: WalkInTicket[]
): Promise<void> {
  if (!input.vehicle.trim()) throw new Error('Add the vehicle so staff can find the car.');
  if (input.serviceIds.length === 0) throw new Error('Pick at least one package or service.');
  const next =
    existingToday.reduce((max, t) => Math.max(max, Number(t.ticketNumber.replace(/\D/g, '')) || 0), 0) + 1;
  await addDoc(collection(db, 'walkIns'), {
    ...input,
    vehicle: input.vehicle.trim(),
    ticketNumber: `W-${String(next).padStart(3, '0')}`,
    status: 'waiting',
    createdAt: Date.now(),
  });
}

export async function updateWalkInStatus(
  ticket: WalkInTicket,
  status: WalkInStatus,
  handledByName?: string
): Promise<void> {
  const patch: Partial<WalkInTicket> = { status };
  if (status === 'in_progress') {
    patch.startedAt = Date.now();
    if (handledByName) patch.handledByName = handledByName;
  }
  if (status === 'done' || status === 'left') patch.finishedAt = Date.now();
  await setDoc(doc(db, 'walkIns', ticket.id), patch, { merge: true });
}
