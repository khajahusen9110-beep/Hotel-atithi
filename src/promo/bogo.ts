import { useEffect, useState } from 'react';

// "Buy 1 Get 1 Free" weekend offer (8–10 Oct 2026) on four dishes.
// Display only: the order price is not changed, the kitchen sends the free plate.
// Everything disappears on its own at 10 Oct, 11:59 PM India time.

export const BOGO_START = Date.parse('2026-10-08T00:00:00+05:30');
export const BOGO_END = Date.parse('2026-10-11T00:00:00+05:30');

/** Offer dishes as named on the poster, and the menu item each one is. */
export const BOGO_ITEMS: { label: string; productName: string }[] = [
  { label: 'Chicken Dum Biryani', productName: 'Chicken Dum Biryani' },
  { label: 'Veg Dum Biryani', productName: 'Veg Biryani' },
  { label: 'Chicken Manchurian', productName: 'Chicken Manchurian' },
  { label: 'Paneer Manchurian', productName: 'Paneer Manchurian / 65 / Chilli' },
];

const OFFER_NAMES = new Set(BOGO_ITEMS.map((i) => i.productName.trim().toLowerCase()));

export const isBogoLive = (now = Date.now()): boolean => now >= BOGO_START && now < BOGO_END;

export const isBogoProduct = (name: string | null | undefined): boolean =>
  !!name && OFFER_NAMES.has(name.trim().toLowerCase());

/** True while the offer runs; flips to false at the end time without a page reload. */
export function useBogoLive(): boolean {
  const [live, setLive] = useState(() => isBogoLive());
  const [check, setCheck] = useState(0);
  useEffect(() => {
    const now = Date.now();
    const next = now < BOGO_START ? BOGO_START : now < BOGO_END ? BOGO_END : null;
    if (next === null) return;
    // setTimeout can't wait longer than ~24.8 days; re-check daily if the start is far away
    const wait = Math.min(next - now + 50, 24 * 60 * 60 * 1000);
    const timer = window.setTimeout(() => {
      setLive(isBogoLive());
      setCheck((c) => c + 1);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [check]);
  return live;
}
