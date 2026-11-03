import { deleteField, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { markAppointmentCompleted, type StoredAppointment } from './appointments';
import { lunchBlockedHours, workHoursOf, type BookedSlot } from './scheduling';
import type { WorkType } from './staffOps';

/**
 * What staff do on a job. Call-outs go On my way → Arrived → Washing → Done;
 * bay jobs go straight to Washing → Done. Steps only move forward, and the crew
 * shares one status (any member can tap the next step).
 */
export type JobStep = 'assigned' | 'on_way' | 'arrived' | 'washing' | 'done';

export const JOB_STEPS: Record<WorkType, JobStep[]> = {
  mobile: ['on_way', 'arrived', 'washing', 'done'],
  bay: ['washing', 'done'],
};

export const STEP_LABEL: Record<JobStep, string> = {
  assigned: 'Not started',
  on_way: 'On my way',
  arrived: 'Arrived',
  washing: 'Washing',
  done: 'Done',
};

/** The button text for moving to a step */
export const STEP_ACTION: Record<JobStep, string> = {
  assigned: 'Reset',
  on_way: "I'm on my way",
  arrived: "I've arrived",
  washing: 'Start washing',
  done: 'Mark done',
};

/** Values stored in appointment.staffStatus; "On Route" is what the customer side already understands */
const STORED: Partial<Record<JobStep, string>> = { on_way: 'On Route', arrived: 'Arrived', washing: 'Washing' };

export function jobStepOf(appt: Pick<StoredAppointment, 'completed' | 'status' | 'staffStatus'>): JobStep {
  if (appt.completed || appt.status === 'Completed') return 'done';
  const s = (appt.staffStatus || '').toLowerCase();
  if (s === 'washing') return 'washing';
  if (s === 'arrived') return 'arrived';
  if (s.includes('on route')) return 'on_way';
  return 'assigned';
}

export function nextStep(type: WorkType, current: JobStep): JobStep | null {
  const steps = JOB_STEPS[type];
  const i = steps.indexOf(current);
  return i === -1 ? steps[0] : steps[i + 1] ?? null;
}

export async function advanceJob(
  appt: { id: string; customerUid: string },
  step: JobStep,
  byName: string
): Promise<void> {
  if (step === 'done') {
    await markAppointmentCompleted(appt.customerUid, appt.id);
    await setDoc(
      doc(db, 'users', appt.customerUid, 'appointments', appt.id),
      { staffStatus: 'Completed', completedAt: Date.now(), completedByName: byName },
      { merge: true }
    );
    return;
  }
  await setDoc(
    doc(db, 'users', appt.customerUid, 'appointments', appt.id),
    { staffStatus: STORED[step], staffStatusAt: Date.now(), staffStatusBy: byName },
    { merge: true }
  );
}

/** What a job looked like before a step, so a mistaken tap can be undone. */
export interface JobSnapshot {
  staffStatus?: string;
  completed?: boolean;
  status?: string;
  statusColor?: string;
  isLocked?: boolean;
}

export function snapshotJob(appt: StoredAppointment): JobSnapshot {
  return {
    staffStatus: appt.staffStatus,
    completed: appt.completed,
    status: appt.status,
    statusColor: appt.statusColor,
    isLocked: appt.isLocked,
  };
}

/** Puts a job back the way it was before the last tap. */
export async function undoJobStep(appt: { id: string; customerUid: string }, before: JobSnapshot): Promise<void> {
  const restore = (v: unknown) => (v === undefined ? deleteField() : v);
  await setDoc(
    doc(db, 'users', appt.customerUid, 'appointments', appt.id),
    {
      staffStatus: restore(before.staffStatus),
      completed: before.completed ?? false,
      status: restore(before.status),
      statusColor: restore(before.statusColor),
      isLocked: restore(before.isLocked),
      completedAt: deleteField(),
      completedByName: deleteField(),
      staffStatusAt: Date.now(),
    },
    { merge: true }
  );
}

/**
 * The job that stops lunch moving to `hour`: a job being worked during that lunch,
 * or (for mobile staff) during the hour after it, which is spent driving out again.
 * Without a date it checks every upcoming day that has no one-day lunch change,
 * since it's the usual lunch that's moving.
 */
export function lunchClash(input: {
  hour: number;
  date?: string;
  today: string;
  jobs: BookedSlot[];
  overriddenDates?: string[];
}): BookedSlot | undefined {
  const { hour, date, today, jobs, overriddenDates = [] } = input;
  return jobs.find((job) => {
    if (date ? job.date !== date : job.date < today || overriddenDates.includes(job.date)) return false;
    const blocked = lunchBlockedHours(hour, job.type);
    return workHoursOf(job).some((h) => blocked.includes(h));
  });
}
