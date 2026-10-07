import { StoreHours } from '../types/database';
import { formatTime12Hour } from './productAvailability';

// Store open / closed status as returned by the get_store_status() database function.
export interface StoreStatus {
  isOpen: boolean;
  /** open | manual (closed from the admin panel) | hours (outside the weekly timings) */
  reason: 'open' | 'manual' | 'hours';
  /** Admin's closure message (manual closures only) */
  message: string | null;
  /** When the current shift ends (ms since epoch), if open */
  closesAt: number | null;
  /** When the hotel opens next (ms since epoch), if closed by the timings */
  nextOpenAt: number | null;
}

const IST = 'Asia/Kolkata';
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const istDateKey = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);

const istWeekday = (ms: number) =>
  DAY_LONG.indexOf(new Intl.DateTimeFormat('en-US', { timeZone: IST, weekday: 'long' }).format(ms));

/** "6:00 AM" in India time */
export const formatIstTime = (ms: number): string =>
  new Intl.DateTimeFormat('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(ms)
    .toUpperCase();

/** "today at 6:00 AM" / "tomorrow at 6:00 AM" / "on Friday at 9:00 AM" */
export const describeOpening = (openAt: number, now = Date.now()): string => {
  const time = formatIstTime(openAt);
  const day = istDateKey(openAt);
  if (day === istDateKey(now)) return `today at ${time}`;
  if (day === istDateKey(now + 24 * 60 * 60 * 1000)) return `tomorrow at ${time}`;
  return `on ${DAY_LONG[istWeekday(openAt)]} at ${time}`;
};

/** Short form for buttons: "6:00 AM" today, "Tomorrow 6:00 AM", "Fri 9:00 AM" */
export const shortOpening = (openAt: number, now = Date.now()): string => {
  const time = formatIstTime(openAt);
  const day = istDateKey(openAt);
  if (day === istDateKey(now)) return time;
  if (day === istDateKey(now + 24 * 60 * 60 * 1000)) return `Tomorrow ${time}`;
  return `${DAY_SHORT[istWeekday(openAt)]} ${time}`;
};

const hoursText = (h: StoreHours) =>
  h.is_closed ? 'Closed' : `${formatTime12Hour(h.open_time)} – ${formatTime12Hour(h.close_time)}`;

/** Weekly timings with consecutive identical days merged, Monday first:
 *  [{ days: 'Mon – Sat', hours: '6:00 AM – 11:00 PM' }, { days: 'Sun', hours: 'Closed' }] */
export const groupWeeklyHours = (week: StoreHours[]): { days: string; hours: string }[] => {
  const byDay = new Map(week.map((h) => [Number(h.day_of_week), h]));
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows: { from: number; to: number; hours: string }[] = [];
  for (const d of order) {
    const h = byDay.get(d);
    if (!h) continue;
    const text = hoursText(h);
    const last = rows[rows.length - 1];
    if (last && last.hours === text && order.indexOf(last.to) === order.indexOf(d) - 1) last.to = d;
    else rows.push({ from: d, to: d, hours: text });
  }
  return rows.map((r) => ({
    days: r.from === r.to ? DAY_SHORT[r.from] : `${DAY_SHORT[r.from]} – ${DAY_SHORT[r.to]}`,
    hours: r.hours,
  }));
};
