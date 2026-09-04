import React, { useState } from 'react';
import { Star, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

interface ReviewModalProps {
  orderId: string;
  customerId: string;
  onClose: () => void;
  onReviewSubmitted: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  orderId,
  customerId,
  onClose,
  onReviewSubmitted,
}) => {
  const { success, error: toastError } = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('reviews').insert({
        order_id: orderId,
        customer_id: customerId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      success('Thank you for your review!');
      onReviewSubmitted();
      onClose();
    } catch (err: any) {
      toastError(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <h3 className="font-display font-bold text-lg text-stone-900">
            Rate Your Experience
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Star selector */}
          <div className="flex flex-col items-center justify-center py-3">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transform hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${
                      (hoverRating || rating) >= star
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-stone-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-stone-500 font-bold mt-2">
              {rating === 5 && 'Outstanding! 🌟'}
              {rating === 4 && 'Very Good! 😊'}
              {rating === 3 && 'Average 🙂'}
              {rating === 2 && 'Needs Improvement 🙁'}
              {rating === 1 && 'Disappointing 😞'}
            </span>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">
              Your Feedback / Comments (Optional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us what you loved about the food, freshness, or delivery speed..."
              className="w-full p-3 rounded-2xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 font-bold hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Submit Review</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
