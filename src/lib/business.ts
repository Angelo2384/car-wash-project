import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Business settings (opening days, fees) ──────────────────────────────────

/** Opening hours for one weekday. `start`/`end` are whole hours; `end` is closing time. */
export interface DayHours {
  open: boolean;
  start: number;
  end: number;
}

export interface BusinessSettings {
  /** Indexed by Date#getDay(): 0 = Sunday … 6 = Saturday */
  days: DayHours[];
  /** One-off closures, as YYYY-MM-DD */
  closedDates: string[];
  callOutFee: number;
  membershipMonthly: number;
  membershipAnnual: number;
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Open every day 08:00–17:00 (last booking slot 16:00), matching the original booking page. */
export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  days: Array.from({ length: 7 }, () => ({ open: true, start: 8, end: 17 })),
  closedDates: [],
  callOutFee: 150,
  membershipMonthly: 199,
  membershipAnnual: 1899,
};

const settingsRef = () => doc(db, 'settings', 'business');

function normaliseSettings(data: Partial<BusinessSettings> | undefined): BusinessSettings {
  const days =
    Array.isArray(data?.days) && data.days.length === 7
      ? data.days.map((d, i) => ({
          open: d?.open !== false,
          start: Number.isFinite(d?.start) ? d.start : DEFAULT_BUSINESS_SETTINGS.days[i].start,
          end: Number.isFinite(d?.end) ? d.end : DEFAULT_BUSINESS_SETTINGS.days[i].end,
        }))
      : DEFAULT_BUSINESS_SETTINGS.days;
  return {
    days,
    closedDates: Array.isArray(data?.closedDates) ? data.closedDates : [],
    callOutFee: typeof data?.callOutFee === 'number' ? data.callOutFee : DEFAULT_BUSINESS_SETTINGS.callOutFee,
    membershipMonthly:
      typeof data?.membershipMonthly === 'number' ? data.membershipMonthly : DEFAULT_BUSINESS_SETTINGS.membershipMonthly,
    membershipAnnual:
      typeof data?.membershipAnnual === 'number' ? data.membershipAnnual : DEFAULT_BUSINESS_SETTINGS.membershipAnnual,
  };
}

export function subscribeToBusinessSettings(callback: (settings: BusinessSettings) => void): () => void {
  callback(DEFAULT_BUSINESS_SETTINGS);
  return onSnapshot(
    settingsRef(),
    (snap) => callback(normaliseSettings(snap.exists() ? (snap.data() as Partial<BusinessSettings>) : undefined)),
    (err) => console.warn('Business settings unavailable, using defaults:', err.message)
  );
}

export async function saveBusinessSettings(settings: Partial<BusinessSettings>): Promise<void> {
  await setDoc(settingsRef(), { ...settings, updatedAt: Date.now() }, { merge: true });
}

/** YYYY-MM-DD for a Date in local time. */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Opening hours for a date, or null when the business is closed that day. */
export function getDayHours(settings: BusinessSettings, isoDate: string): DayHours | null {
  if (!isoDate || settings.closedDates.includes(isoDate)) return null;
  const day = settings.days[fromIsoDate(isoDate).getDay()];
  return day && day.open && day.end > day.start ? day : null;
}

/** Bookable start hours for a date (opening hour up to the hour before closing). */
export function slotHoursForDate(settings: BusinessSettings, isoDate: string): number[] {
  const hours = getDayHours(settings, isoDate);
  if (!hours) return [];
  return Array.from({ length: hours.end - hours.start }, (_, i) => hours.start + i);
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

// ─── Services & packages ─────────────────────────────────────────────────────

export type ServiceKind = 'package' | 'addon';
export type ServiceCategory = 'Exterior' | 'Interior' | 'Engine' | 'Full Detail';
export type ServiceStatus = 'active' | 'archived';

export interface ServiceItem {
  id: string;
  kind: ServiceKind;
  name: string;
  tagline?: string;
  description?: string;
  category: ServiceCategory;
  price: number;
  durationMinutes: number;
  /** What's included, shown on package cards */
  includes: string[];
  /** Set automatically on the most-booked package and service; nothing is popular before it's booked */
  popular?: boolean;
  status: ServiceStatus;
  sortOrder: number;
  createdAt: number;
  updatedAt?: number;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = ['Exterior', 'Interior', 'Engine', 'Full Detail'];

const pkg = (
  id: string,
  name: string,
  price: number,
  durationMinutes: number,
  tagline: string,
  description: string,
  includes: string[],
  sortOrder: number,
  popular = false
): ServiceItem => ({
  id,
  kind: 'package',
  name,
  tagline,
  description,
  category: 'Full Detail',
  price,
  durationMinutes,
  includes,
  popular,
  status: 'active',
  sortOrder,
  createdAt: 0,
});

const addon = (
  id: string,
  name: string,
  description: string,
  price: number,
  durationMinutes: number,
  category: ServiceCategory,
  sortOrder: number,
  popular = false
): ServiceItem => ({
  id,
  kind: 'addon',
  name,
  description,
  category,
  price,
  durationMinutes,
  includes: [],
  popular,
  status: 'active',
  sortOrder,
  createdAt: 0,
});

/** The catalogue the app shipped with. Used until the admin saves services to Firestore. */
export const DEFAULT_SERVICES: ServiceItem[] = [
  pkg('express', 'Express Wash', 75, 30, 'Quick clean, great results',
    'A fast, efficient wash perfect for keeping your car looking fresh between deeper cleans.',
    ['Exterior hand wash', 'Wheel rinse', 'Window wipe-down', 'Quick interior vacuum'], 1),
  pkg('premium', 'Premium Wash', 275, 60, 'Spotless inside and out',
    'A thorough wash and detail that leaves your car spotless inside and out.',
    ['Full exterior hand wash & dry', 'Full interior vacuum & wipe-down', 'Dashboard & console detail',
      'Tyre dressing & rim shine', 'Window clean (inside & out)', 'Air freshener finish'], 2),
  pkg('elite', 'Elite Wash', 875, 180, 'The full luxury treatment',
    'A concierge-level detail that restores your car to showroom condition.',
    ['Everything in Premium Wash', 'Paint decontamination & clay bar', 'Machine polish & paint correction',
      'Ceramic coating application', 'Full leather conditioning', 'Engine bay clean', 'Odour elimination treatment'], 3),
  addon('ext-hand-wash', 'Exterior Hand Wash', 'Full hand wash & rinse of all exterior panels.', 75, 25, 'Exterior', 10),
  addon('ext-tyre-dress', 'Tyre & Rim Dressing', 'Deep-clean rims and apply shine dressing to tyres.', 50, 15, 'Exterior', 11),
  addon('ext-clay-bar', 'Clay Bar Treatment', 'Removes bonded contaminants for a silky-smooth finish.', 120, 30, 'Exterior', 12),
  addon('ext-machine-pol', 'Machine Polish', 'Single-stage machine polish to remove light swirls.', 350, 90, 'Exterior', 13),
  addon('ext-ceramic', 'Ceramic Coating', '9H ceramic coating for long-lasting paint protection.', 650, 120, 'Exterior', 14),
  addon('ext-windows', 'Window Clean (Exterior)', 'Streak-free clean of all external glass surfaces.', 45, 10, 'Exterior', 15),
  addon('int-vacuum', 'Full Interior Vacuum', 'Thorough vacuum of carpets, seats, and boot.', 60, 20, 'Interior', 20),
  addon('int-dashboard', 'Dashboard & Console', 'Wipe-down and condition of all interior hard surfaces.', 80, 20, 'Interior', 21),
  addon('int-leather', 'Leather Conditioning', 'Clean and condition all leather seats and surfaces.', 180, 35, 'Interior', 22),
  addon('int-windows', 'Window Clean (Interior)', 'Streak-free clean of all interior glass surfaces.', 45, 10, 'Interior', 23),
  addon('int-odour', 'Odour Elimination', 'Ozone or enzyme treatment to neutralise bad odours.', 150, 30, 'Interior', 24),
  addon('int-shampoo', 'Carpet & Seat Shampoo', 'Deep extraction shampoo for seats and floor carpets.', 220, 50, 'Interior', 25),
  addon('eng-rinse', 'Engine Bay Rinse', 'Light rinse and degrease of the engine compartment.', 120, 25, 'Engine', 30),
  addon('eng-detail', 'Full Engine Detail', 'Full steam-clean and dress of all engine bay components.', 250, 45, 'Engine', 31),
  addon('eng-protect', 'Engine Protectant Coat', 'Apply heat-resistant protectant to plastic and rubber.', 90, 15, 'Engine', 32),
];

const servicesCol = () => collection(db, 'services');

export interface ServicesSnapshot {
  items: ServiceItem[];
  /** True while Firestore has no services yet and the built-in catalogue is shown */
  usingDefaults: boolean;
}

const bySortOrder = (a: ServiceItem, b: ServiceItem) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

export function subscribeToServices(callback: (snapshot: ServicesSnapshot) => void): () => void {
  callback({ items: DEFAULT_SERVICES, usingDefaults: true });
  return onSnapshot(
    servicesCol(),
    (snap) => {
      if (snap.empty) {
        callback({ items: DEFAULT_SERVICES, usingDefaults: true });
        return;
      }
      const items = snap.docs
        .map((d) => {
          const data = d.data() as Omit<ServiceItem, 'id'>;
          return { ...data, includes: Array.isArray(data.includes) ? data.includes : [], id: d.id };
        })
        .sort(bySortOrder);
      callback({ items, usingDefaults: false });
    },
    (err) => console.warn('Services unavailable, using the default catalogue:', err.message)
  );
}

export async function saveService(item: ServiceItem): Promise<void> {
  const { id, ...rest } = item;
  await setDoc(doc(db, 'services', id), { ...rest, updatedAt: Date.now() }, { merge: true });
}

export async function deleteService(id: string): Promise<void> {
  await deleteDoc(doc(db, 'services', id));
}

/** Copies the built-in catalogue into Firestore so the admin can start editing it. */
export async function seedDefaultServices(): Promise<void> {
  const batch = writeBatch(db);
  const now = Date.now();
  DEFAULT_SERVICES.forEach(({ id, ...rest }) => batch.set(doc(db, 'services', id), { ...rest, createdAt: now }));
  await batch.commit();
}

export function activePackages(items: ServiceItem[]): ServiceItem[] {
  return items.filter((s) => s.kind === 'package' && s.status === 'active');
}

export function activeAddons(items: ServiceItem[]): ServiceItem[] {
  return items.filter((s) => s.kind === 'addon' && s.status === 'active');
}

/** Whole hours a booking blocks, from its duration in minutes (minimum one hour). */
export function workHoursFor(durationMinutes: number): number {
  return Math.max(1, Math.ceil((durationMinutes || 60) / 60));
}

/** Work hours for an existing booking, matched by package name; custom packages default to 1–3 hours. */
export function workHoursForPackageName(items: ServiceItem[], packageName?: string): number {
  const match = items.find((s) => s.name.toLowerCase() === (packageName || '').toLowerCase());
  return match ? workHoursFor(match.durationMinutes) : 1;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr${h > 1 ? 's' : ''}`;
}

/** Matches the app's existing money style: R75, R316.25, R1,178.75 */
export function formatRand(amount: number): string {
  const cents = Math.round(amount * 100) % 100 !== 0;
  return `R${amount.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** Date text stored on bookings, e.g. "Tue, 3 November 2026" (matches checkout). */
export function formatBookingDate(isoDate: string): string {
  return fromIsoDate(isoDate).toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Reads an amount like "R1,178.75" back into a number. */
export function parseRand(value?: string | number): number {
  if (typeof value === 'number') return value;
  const n = Number((value || '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export interface BookingPackage {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  includes: string[];
  accentColor: string;
}

const PACKAGE_ACCENTS: Record<string, string> = { express: '#A1A1AA', premium: '#E86A33', elite: '#35B86B' };

/**
 * The package a customer is booking: a catalogue package by id, or a custom package
 * built from individual services (price and time are the sum of the services).
 */
export function resolveBookingPackage(
  items: ServiceItem[],
  packageId: string,
  customServiceIds: string[] = []
): BookingPackage {
  if (packageId === 'custom') {
    const chosen = items.filter((s) => customServiceIds.includes(s.id));
    return {
      id: 'custom',
      name: 'Custom Package',
      price: chosen.reduce((sum, s) => sum + s.price, 0),
      durationMinutes: Math.max(30, chosen.reduce((sum, s) => sum + s.durationMinutes, 0)),
      includes: chosen.map((s) => s.name),
      accentColor: '#E86A33',
    };
  }
  const found =
    items.find((s) => s.id === packageId && s.kind === 'package') ??
    items.find((s) => s.kind === 'package' && s.status === 'active') ??
    DEFAULT_SERVICES[1];
  return {
    id: found.id,
    name: found.name,
    price: found.price,
    durationMinutes: found.durationMinutes,
    includes: found.includes,
    accentColor: PACKAGE_ACCENTS[found.id] ?? '#E86A33',
  };
}

/** Bookings per service name (lowercase), ignoring cancellations. A custom package counts each service in it. */
export function bookingCountsByService(
  appointments: { packageName?: string; status?: string; customServiceNames?: string[] }[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  const bump = (name?: string) => {
    const key = (name || '').trim().toLowerCase();
    if (key) counts[key] = (counts[key] || 0) + 1;
  };
  appointments.forEach((a) => {
    if (a.status === 'Cancelled') return;
    bump(a.packageName);
    (a.customServiceNames || []).forEach(bump);
  });
  return counts;
}

/** Ids of the most-booked active package and individual service. Empty until something has been booked. */
export function mostBookedIds(items: ServiceItem[], counts: Record<string, number>): Set<string> {
  const ids = new Set<string>();
  (['package', 'addon'] as ServiceKind[]).forEach((kind) => {
    let best: ServiceItem | null = null;
    let bestCount = 0;
    items
      .filter((s) => s.kind === kind && s.status === 'active')
      .forEach((s) => {
        const n = counts[s.name.toLowerCase()] || 0;
        if (n > bestCount) {
          best = s;
          bestCount = n;
        }
      });
    if (best) ids.add((best as ServiceItem).id);
  });
  return ids;
}
