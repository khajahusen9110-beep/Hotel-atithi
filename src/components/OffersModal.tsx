import React, { useState } from 'react';
import { ActiveOffer } from '../types/database';
import { Tag, X, Check, Clock, Percent } from 'lucide-react';

interface OffersModalProps {
  isOpen: boolean;
  onClose: () => void;
  offers: ActiveOffer[];
  loading?: boolean;
}

export const OffersModal: React.FC<OffersModalProps> = ({
  isOpen,
  onClose,
  offers,
  loading = false,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-stone-200 animate-scale-in">
        {/* Modal Header */}
        <div className="bg-linear-to-r from-amber-500 to-amber-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base">Active Offers & Coupons</h3>
              <p className="text-amber-100 text-xs">Apply at checkout to save instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[65vh] overflow-y-auto space-y-3.5">
          {loading ? (
            <div className="py-12 text-center text-stone-400 text-xs font-semibold">
              Loading available offers...
            </div>
          ) : offers.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <Percent className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="font-bold text-stone-700 text-sm">No Active Offers Right Now</p>
              <p className="text-stone-400 text-xs">Check back soon for seasonal discounts!</p>
            </div>
          ) : (
            offers.map((offer) => {
              const formattedDate = formatDate(offer.valid_until);
              const isPercent = offer.discount_type === 'percent';
              return (
                <div
                  key={offer.code}
                  className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/40 relative overflow-hidden flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-stone-900 bg-white px-2.5 py-1 rounded-xl border border-dashed border-amber-400 tracking-wider">
                          {offer.code}
                        </span>
                        <span className="text-xs font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-lg">
                          {isPercent ? `${offer.discount_value}% OFF` : `₹${offer.discount_value} OFF`}
                        </span>
                      </div>
                      {offer.description && (
                        <p className="text-stone-700 text-xs font-medium mt-1.5">
                          {offer.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleCopy(offer.code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                        copiedCode === offer.code
                          ? 'bg-emerald-600 text-white'
                          : 'bg-stone-900 hover:bg-stone-800 text-white shadow-xs'
                      }`}
                    >
                      {copiedCode === offer.code ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <span>Copy Code</span>
                      )}
                    </button>
                  </div>

                  {/* Conditions & Expiry */}
                  <div className="flex items-center gap-3 text-[11px] text-stone-500 pt-1 border-t border-amber-200/40 flex-wrap">
                    {offer.min_order_amount && (
                      <span>Min order: ₹{offer.min_order_amount}</span>
                    )}
                    {offer.max_discount_amount && (
                      <span>• Max discount: ₹{offer.max_discount_amount}</span>
                    )}
                    {formattedDate && (
                      <span className="flex items-center gap-1 text-stone-400">
                        <Clock className="w-3 h-3 text-stone-400" />
                        Valid till {formattedDate}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
