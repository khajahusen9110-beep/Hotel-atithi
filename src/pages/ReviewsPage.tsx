import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Review } from '../types/database';
import { Star, MessageSquare, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';

const REVIEWS_PAGE_SIZE = 12;

export const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  // Rating summary covers every review, not just the pages loaded so far
  const [summary, setSummary] = useState<{ average: number; count: number } | null>(null);

  const fetchPage = (offset: number) =>
    supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + REVIEWS_PAGE_SIZE - 1);

  useEffect(() => {
    let isCancelled = false;

    const fetchReviews = async () => {
      try {
        const { data, error } = await fetchPage(0);
        if (isCancelled) return;
        if (!error && data) {
          setReviews(data);
          setHasMore(data.length === REVIEWS_PAGE_SIZE);
        }
      } catch (e) {
        console.warn('Error fetching reviews:', e);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    // Only the rating column (a few bytes per review) is needed for the average
    const fetchSummary = async () => {
      try {
        const { data, error } = await supabase.from('reviews').select('rating');
        if (isCancelled || error || !data) return;
        const count = data.length;
        const sum = data.reduce((acc, r) => acc + Number(r.rating || 0), 0);
        setSummary({ average: count ? sum / count : 0, count });
      } catch (e) {
        console.warn('Error fetching review summary:', e);
      }
    };

    fetchReviews();
    fetchSummary();
    return () => {
      isCancelled = true;
    };
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { data, error } = await fetchPage(reviews.length);
      if (error) throw error;
      const page = data || [];
      setReviews((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return prev.concat(page.filter((r) => !seen.has(r.id)));
      });
      setHasMore(page.length === REVIEWS_PAGE_SIZE);
      setLoadMoreError(false);
    } catch (e) {
      console.warn('Error fetching more reviews:', e);
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const reviewCount = summary?.count ?? reviews.length;
  const averageValue =
    summary?.count
      ? summary.average
      : reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;
  const averageRating = reviewCount > 0 ? averageValue.toFixed(1) : '–';
  const filledStars = Math.round(averageValue);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 text-xs">
      {/* Review Header Banner */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 font-bold text-[11px] border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Guest Love & Testimonials
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-stone-900">
            Customer Reviews & Ratings
          </h1>
          <p className="text-stone-500 max-w-md">
            Real feedback from customers who ordered from Hotel Atithi.
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-stone-50 border border-stone-200 text-center shrink-0 min-w-[140px]">
          <div className="font-display font-bold text-4xl text-stone-900">
            {averageRating}
          </div>
          <div className="flex items-center justify-center gap-1 my-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i <= filledStars ? 'text-amber-400 fill-amber-400' : 'text-stone-200'}`}
              />
            ))}
          </div>
          <span className="text-[11px] text-stone-500 font-medium">
            Based on {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
          </span>
        </div>
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-400">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <span className="text-xs font-semibold">Loading guest feedback...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center space-y-2 bg-white rounded-3xl border border-stone-200">
          <MessageSquare className="w-8 h-8 text-stone-300 mx-auto" />
          <p className="font-bold text-stone-700 text-sm">No reviews yet</p>
          <p className="text-stone-500">Order from us and be the first to share your experience.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < rev.rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-stone-200'
                      }`}
                    />
                  ))}
                </div>

                <span className="text-[10px] text-stone-400">
                  {rev.created_at
                    ? new Date(rev.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Recent'}
                </span>
              </div>

              {rev.comment ? (
                <p className="text-stone-700 text-xs sm:text-sm leading-relaxed font-medium">
                  "{rev.comment}"
                </p>
              ) : (
                <p className="text-stone-400 italic text-xs">
                  Rated {rev.rating} stars without text comment.
                </p>
              )}

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                <span className="text-stone-500 font-bold">Verified Diner</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Order
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (hasMore || loadMoreError) && (
        <div className="flex flex-col items-center gap-2">
          {loadMoreError && <p className="text-rose-600 font-semibold">Could not load more reviews.</p>}
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 text-stone-700 font-bold transition-all cursor-pointer disabled:opacity-60"
          >
            {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {loadingMore ? 'Loading…' : loadMoreError ? 'Retry' : 'Show more reviews'}
          </button>
        </div>
      )}
    </div>
  );
};
