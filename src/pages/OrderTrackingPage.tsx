import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Order, OrderStatus } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { ReviewModal } from '../components/ReviewModal';
import {
  CheckCircle2,
  Clock,
  Utensils,
  Truck,
  PackageCheck,
  XCircle,
  MapPin,
  Calendar,
  CreditCard,
  Banknote,
  Star,
  RefreshCw,
  Loader2,
  Phone,
} from 'lucide-react';

const STATUS_STEPS: { status: OrderStatus; label: string; icon: any; desc: string }[] = [
  {
    status: 'placed',
    label: 'Order Placed',
    icon: Clock,
    desc: 'We received your order and kitchen is acknowledging',
  },
  {
    status: 'confirmed',
    label: 'Confirmed',
    icon: CheckCircle2,
    desc: 'Order accepted by Hotel Atithi chef team',
  },
  {
    status: 'preparing',
    label: 'In Kitchen',
    icon: Utensils,
    desc: 'Fresh ingredients being cooked with pure desi ghee',
  },
  {
    status: 'out_for_delivery',
    label: 'Out for Delivery',
    icon: Truck,
    desc: 'Our delivery rider is heading towards your location',
  },
  {
    status: 'delivered',
    label: 'Delivered',
    icon: PackageCheck,
    desc: 'Delivered hot and fresh at your doorstep. Enjoy!',
  },
];

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const fetchOrder = async (isManual = false) => {
    if (!orderId) return;
    if (isManual) setIsRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          address:addresses(*),
          items:order_items(*),
          review:reviews(*)
        `)
        .eq('id', orderId)
        .single();

      if (!error && data) {
        // Flatten review if returned as array
        const processed = {
          ...data,
          review: Array.isArray(data.review) ? data.review[0] : data.review,
        };
        setOrder(processed);
      }
    } catch (e) {
      console.warn('Error loading order tracking details:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Supabase Realtime channel for instant order status changes
    const channel = supabase
      .channel(`order-updates-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => {
          fetchOrder();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-stone-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-xs font-semibold">Loading live order status...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-4 px-4 text-xs">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="font-display font-bold text-xl text-stone-900">Order Not Found</h2>
        <p className="text-stone-500">
          We couldn't locate this order record. Please check your order history.
        </p>
        <Link
          to="/orders"
          className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
        >
          View Order History
        </Link>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 text-xs">
      {/* Top Bar Header */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-500 uppercase text-[10px]">
              Order #{order.order_number || order.id.slice(0, 8)}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                order.status === 'delivered'
                  ? 'bg-emerald-100 text-emerald-800'
                  : order.status === 'cancelled'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {order.status.replace(/_/g, ' ')}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                order.payment_gateway === 'cod'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-200'
              }`}
            >
              {order.payment_gateway === 'cod' ? (
                <>
                  <Banknote className="w-3 h-3 text-emerald-600" />
                  <span>Cash on Delivery</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-3 h-3 text-amber-600" />
                  <span>Online (Razorpay)</span>
                </>
              )}
            </span>
          </div>

          <p className="text-stone-400 text-[11px] mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Placed on {new Date(order.created_at).toLocaleString('en-IN')}
          </p>
        </div>

        <button
          onClick={() => fetchOrder(true)}
          disabled={isRefreshing}
          className="self-start sm:self-auto px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* Live Stepper Tracker */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-6">
        <h2 className="font-display font-bold text-base text-stone-900">
          Delivery Status
        </h2>

        {isCancelled ? (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-center gap-3">
            <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">This order was cancelled.</p>
              <p className="text-[11px] text-rose-700">
                If any payment was deducted, it will be refunded within 3-5 business days.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200">
            {STATUS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={step.status} className="relative flex items-start gap-4 group">
                  <div
                    className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isPast
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-amber-500 text-white ring-4 ring-amber-100 shadow-xs'
                        : 'bg-stone-100 text-stone-400 border border-stone-300'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                  </div>

                  <div>
                    <h3
                      className={`font-bold text-xs sm:text-sm ${
                        isPast || isCurrent ? 'text-stone-900' : 'text-stone-400'
                      }`}
                    >
                      {step.label}
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Review trigger if delivered */}
        {order.status === 'delivered' && user && (
          <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
            <div>
              <p className="font-bold text-stone-900 text-xs">How was your meal?</p>
              <p className="text-[11px] text-stone-500">
                {order.review
                  ? `You rated this order ${order.review.rating} ★`
                  : 'Help us serve you better by rating this order'}
              </p>
            </div>

            {!order.review && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Write Review</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delivery & Payment Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Delivery Address */}
        <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-2">
          <h2 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 pb-2 border-b border-stone-100">
            <MapPin className="w-4 h-4 text-amber-600" />
            <span>Delivered To</span>
          </h2>

          {order.address ? (
            <div className="space-y-1 text-stone-700 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-stone-950 px-2 py-0.5 rounded bg-stone-100 uppercase tracking-wider text-[10px]">
                  {order.address.label}
                </span>
                {order.address.recipient_name && (
                  <span className="font-bold text-stone-900 text-xs">
                    {order.address.recipient_name}
                  </span>
                )}
              </div>
              <p className="pt-0.5 font-medium text-stone-800">{order.address.full_address}</p>
              {order.address.landmark && (
                <p className="text-stone-600">
                  <span className="font-semibold text-stone-700">Landmark:</span> {order.address.landmark}
                </p>
              )}
              <p>
                {order.address.city}, {order.address.pincode}
              </p>
              <p className="text-stone-500 font-medium flex items-center gap-1">
                <Phone className="w-3 h-3 text-stone-400" />
                Contact: {order.address.phone}
              </p>
            </div>
          ) : (
            <p className="text-stone-400">Address saved with order record</p>
          )}

          {order.delivery_instructions && (
            <div className="mt-3 pt-2 border-t border-stone-100 text-[11px] text-amber-800 bg-amber-50/50 p-2 rounded-xl">
              <strong>Delivery Note:</strong> {order.delivery_instructions}
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-2">
          <h2 className="font-bold text-stone-900 text-xs flex items-center gap-1.5 pb-2 border-b border-stone-100">
            <CreditCard className="w-4 h-4 text-amber-600" />
            <span>Payment Breakdown</span>
          </h2>

          <div className="space-y-1.5 text-stone-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-stone-900">₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span>{order.delivery_fee === 0 ? 'FREE' : `₹${order.delivery_fee}`}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>₹{order.tax}</span>
            </div>
            <div className="pt-1.5 border-t border-stone-100 flex justify-between font-bold text-stone-900 text-sm">
              <span>Total Amount</span>
              <span>₹{order.total_amount}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Method:</span>
              <span className="font-bold text-stone-900">
                {order.payment_gateway === 'cod' ? '💵 Cash on Delivery' : '💳 Razorpay Online'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">Payment Status:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider ${
                  order.payment_status === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {order.payment_gateway === 'cod' && order.payment_status === 'pending'
                  ? '💵 Pay on Delivery'
                  : order.payment_status === 'paid'
                  ? '✅ Paid'
                  : order.payment_status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && user && (
        <ReviewModal
          orderId={order.id}
          customerId={user.id}
          onClose={() => setShowReviewModal(false)}
          onReviewSubmitted={() => fetchOrder()}
        />
      )}
    </div>
  );
};
