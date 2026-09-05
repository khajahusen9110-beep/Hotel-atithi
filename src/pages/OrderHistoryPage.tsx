import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Order } from '../types/database';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import {
  Clock,
  ArrowRight,
  ShoppingBag,
  Loader2,
  Calendar,
  Banknote,
  CreditCard,
  Utensils,
  ChevronDown,
  ChevronUp,
  Receipt,
} from 'lucide-react';

export const OrderHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          // Filter out any incomplete or orphan orders with 0 items and ₹0 total
          const validOrders = data
            .map((o) => ({
              ...o,
              items: o.order_items || o.items || [],
            }))
            .filter((o) => {
              const hasItems = Array.isArray(o.items) && o.items.length > 0;
              const total = Number(o.total ?? o.total_amount ?? 0);
              return hasItems || total > 0;
            });
          setOrders(validOrders);
        }
      } catch (e) {
        console.warn('Error fetching order history:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (!user) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-4 px-4 text-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Clock className="w-7 h-7" />
        </div>
        <h2 className="font-display font-bold text-xl text-stone-900">Sign In to View Orders</h2>
        <p className="text-stone-500">
          Login to access your active deliveries, reorder your favorites, and view previous bills.
        </p>
        <Link
          to="/auth?redirect=/orders"
          className="inline-block px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
        >
          Sign In
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-xs font-semibold">Loading your order history...</span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-4 px-4 text-xs">
        <div className="w-16 h-16 rounded-3xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="font-display font-bold text-xl text-stone-900">No Orders Yet</h2>
        <p className="text-stone-500">
          You haven't placed any orders with Hotel Atithi yet. Treat yourself to fresh food or farm produce!
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs"
        >
          Explore Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 text-xs">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
          Your Orders
        </h1>
        <p className="text-stone-500">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'} placed with Hotel Atithi
        </p>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs hover:shadow-md transition-all space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-900 text-xs sm:text-sm">
                    Order #{order.order_number || order.id.slice(0, 8)}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
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
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${
                      order.payment_gateway === 'cod'
                        ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                        : 'text-amber-800 bg-amber-50 border border-amber-200'
                    }`}
                  >
                    {order.payment_gateway === 'cod' ? (
                      <>
                        <Banknote className="w-3 h-3" />
                        <span>💵 Pay on Delivery</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-3 h-3" />
                        <span>💳 Online (Razorpay)</span>
                      </>
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      order.payment_status === 'paid'
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-amber-800 bg-amber-50'
                    }`}
                  >
                    {order.payment_gateway === 'cod' && order.payment_status === 'pending'
                      ? 'Cash Due'
                      : order.payment_status === 'paid'
                      ? 'Paid'
                      : 'Payment: ' + order.payment_status}
                  </span>
                </div>

                <p className="text-stone-400 text-[11px] flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="text-right sm:self-center">
                <span className="text-stone-400 text-[10px] block">Total Amount</span>
                <span className="font-display font-bold text-base text-stone-900">
                  ₹{order.total ?? order.total_amount}
                </span>
              </div>
            </div>

            {/* Items summary */}
            {order.items && order.items.length > 0 && (
              <p className="text-stone-600 line-clamp-1 text-[11px]">
                {order.items.map((i) => `${i.product_name || 'Dish'} (${i.qty ?? i.quantity ?? 1})`).join(', ')}
              </p>
            )}

            {/* Cooking Instructions note if present */}
            {order.cooking_instructions && (
              <div className="text-[11px] text-amber-900 bg-amber-50/70 px-3 py-1.5 rounded-xl border border-amber-200/50 flex items-center gap-1.5">
                <Utensils className="w-3 h-3 text-amber-700 shrink-0" />
                <span>
                  <strong className="font-bold">Chef Note:</strong> {order.cooking_instructions}
                </span>
              </div>
            )}

            {/* Collapsible Order Summary */}
            {expandedOrderId === order.id && (
              <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 space-y-1.5 text-stone-600 text-[11px]">
                <div className="font-bold text-stone-900 pb-1 border-b border-stone-200/70 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-600" />
                  <span>Order Summary</span>
                </div>
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-stone-900">₹{order.subtotal}</span>
                </div>
                {order.discount_amount && order.discount_amount > 0 ? (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Discount</span>
                    <span>-₹{order.discount_amount}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span>
                    GST ({order.tax_percent ?? (settings?.tax_percent !== undefined ? Number(settings.tax_percent) : 5)}%)
                  </span>
                  <span className="font-bold text-stone-900">
                    ₹{order.tax_amount ?? order.tax ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charge</span>
                  <span>
                    {order.delivery_fee === 0 ? (
                      <span className="text-emerald-600 font-bold">FREE</span>
                    ) : (
                      <span className="font-bold text-stone-900">₹{order.delivery_fee}</span>
                    )}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-stone-200 flex justify-between font-bold text-stone-900 text-xs">
                  <span>Total Amount</span>
                  <span>₹{order.total ?? order.total_amount}</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setExpandedOrderId((prev) => (prev === order.id ? null : order.id))
                }
                className="text-[11px] font-semibold text-stone-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Receipt className="w-3.5 h-3.5 text-stone-400" />
                <span>{expandedOrderId === order.id ? 'Hide Bill' : 'View Bill'}</span>
                {expandedOrderId === order.id ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              <Link
                to={`/order/${order.id}`}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
              >
                <span>Track Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
