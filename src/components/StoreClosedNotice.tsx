import React from 'react';
import { Clock, Store } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { describeOpening, groupWeeklyHours } from '../utils/storeHours';

// Shown above the menu while the hotel is closed: why, when it opens, and the weekly timings.
export const StoreClosedNotice: React.FC = () => {
  const { storeStatus, storeHours, settings, loading } = useSettings();
  if (loading || storeStatus.isOpen) return null;

  const name = settings?.hotel_name?.trim() || 'Hotel Atithi';
  const week = groupWeeklyHours(storeHours);

  let detail: string;
  if (storeStatus.reason === 'manual') {
    detail = storeStatus.message?.trim() || 'We are temporarily closed. Please check back soon.';
  } else if (storeStatus.nextOpenAt) {
    detail = `We open ${describeOpening(storeStatus.nextOpenAt)}. You can browse the menu now and order once we open.`;
  } else {
    detail = 'Ordering is paused right now. Please check back later.';
  }

  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-display font-extrabold text-base text-stone-900">{name} is closed right now</h2>
          <p className="text-xs text-stone-700 mt-0.5">{detail}</p>
        </div>
      </div>

      {week.length > 0 && (
        <div className="rounded-xl bg-white border border-rose-100 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-stone-500 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-500" />
            Opening hours
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            {week.map((row) => (
              <React.Fragment key={row.days}>
                <dt className="font-semibold text-stone-700">{row.days}</dt>
                <dd className={row.hours === 'Closed' ? 'text-rose-600 font-semibold' : 'text-stone-900 font-medium'}>
                  {row.hours}
                </dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
};
