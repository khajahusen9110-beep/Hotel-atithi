import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { Address, AddressFormData, PaymentGateway } from '../types/database';
import { AddressForm } from '../components/AddressForm';
import {
  MapPin,
  Plus,
  CreditCard,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  User,
  Phone,
  Utensils,
  Tag,
  X,
  Clock,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  getProductAvailability,
  checkProductOrderableRPC,
  formatAvailabilityErrorMessage,
  formatTime12Hour,
} from '../utils/productAvailability';

export const CheckoutPage: React.FC = () => {
  const { items, subtotal, clearCart } = useCart();
  const { user, profile } = useAuth();
  const { settings } = useSettings();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const [paymentGateway, setPaymentGateway] = useState<PaymentGateway>('cod');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);

  // Coupon code state
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  // Cooking and Special Instructions state
  const [cookingInstructions, setCookingInstructions] = useState<string>(() => {
    try {
      const storedNotes = sessionStorage.getItem('hotel_atithi_order_notes');
      return storedNotes ? JSON.parse(storedNotes).cookingInstructions || '' : '';
    } catch {
      return '';
    }
  });

  const [deliveryInstructions, setDeliveryInstructions] = useState<string>(() => {
    try {
      const storedNotes = sessionStorage.getItem('hotel_atithi_order_notes');
      return storedNotes ? JSON.parse(storedNotes).deliveryInstructions || '' : '';
    } catch {
      return '';
    }
  });

  // Sync to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(
      'hotel_atithi_order_notes',
      JSON.stringify({ cookingInstructions, deliveryInstructions })
    );
  }, [cookingInstructions, deliveryInstructions]);

  const freeThreshold = settings?.free_delivery_above || settings?.free_delivery_threshold || 500;
  const deliveryBase = settings?.delivery_fee || settings?.delivery_fee_base || 30;
  const deliveryFee = subtotal >= freeThreshold ? 0 : deliveryBase;

  // Dynamically fetch tax_percent from settings table (fallback to 5% if not yet loaded)
  const taxPercent = settings?.tax_percent !== undefined ? Number(settings.tax_percent) : 5;
  // Client-side display estimate only (authoritative value calculated by database trigger)
  const estimatedTax = Math.round((subtotal * taxPercent) / 100);
  const estimatedGrandTotal = subtotal + deliveryFee + estimatedTax;

  // Authoritative values fetched back from DB after trigger calculates them
  const [authoritativeOrder, setAuthoritativeOrder] = useState<{
    tax_amount?: number;
    tax?: number;
    total?: number;
    total_amount?: number;
  } | null>(null);

  const displayedTax = authoritativeOrder?.tax_amount ?? authoritativeOrder?.tax ?? estimatedTax;
  const displayedTotal = authoritativeOrder?.total ?? authoritativeOrder?.total_amount ?? estimatedGrandTotal;

  // Fetch saved customer addresses
  const fetchAddresses = async () => {
    if (!user) return;
    setLoadingAddresses(true);
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('customer_id', user.id)
        .order('is_default', { ascending: false });

      if (!error && data && data.length > 0) {
        setAddresses(data);
        const defaultAddr = data.find((a) => a.is_default) || data[0];
        setSelectedAddressId(defaultAddr.id);
      } else {
        setAddresses([]);
        setIsAddingAddress(true);
      }
    } catch (e) {
      console.warn('Error fetching addresses:', e);
      setIsAddingAddress(true);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAddresses();
    }
  }, [user]);

  // Safely redirect to cart in useEffect rather than during rendering
  useEffect(() => {
    if (!isProcessing && !isOrderPlaced && items.length === 0) {
      navigate('/cart', { replace: true });
    }
  }, [items.length, isProcessing, isOrderPlaced, navigate]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <User className="w-7 h-7" />
        </div>
        <h2 className="font-display font-bold text-xl text-stone-900">
          Sign In to Place Order
        </h2>
        <p className="text-xs text-stone-500">
          Quickly login with your mobile phone number to save your delivery addresses and track orders in real time.
        </p>
        <Link
          to="/auth?redirect=/checkout"
          className="inline-block px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs"
        >
          Sign In with Phone
        </Link>
      </div>
    );
  }

  if (items.length === 0 && !isOrderPlaced) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
        <p className="text-xs text-stone-500">Cart is empty. Redirecting to cart...</p>
      </div>
    );
  }

  const handleSaveNewAddress = async (formData: AddressFormData) => {
    if (!user) return;

    try {
      if (formData.is_default) {
        await supabase
          .from('addresses')
          .update({ is_default: false })
          .eq('customer_id', user.id);
      }

      const { data, error } = await supabase
        .from('addresses')
        .insert({
          customer_id: user.id,
          recipient_name: formData.recipient_name,
          phone: formData.phone,
          label: formData.label,
          full_address: formData.full_address,
          landmark: formData.landmark,
          city: formData.city,
          pincode: formData.pincode,
          latitude: formData.latitude,
          longitude: formData.longitude,
          is_default: formData.is_default,
        })
        .select()
        .single();

      if (error) throw error;

      success('Delivery address saved');
      setIsAddingAddress(false);
      await fetchAddresses();
      if (data) {
        setSelectedAddressId(data.id);
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to save address');
    }
  };

  const handlePlaceOrder = async () => {
    // 1. Pre-flight Payload Validation
    if (!user) {
      toastError('Please sign in to place your order');
      navigate('/auth?redirect=/checkout');
      return;
    }

    if (!selectedAddressId && !isAddingAddress) {
      toastError('Please choose or add a delivery address');
      return;
    }

    if (!items || items.length === 0) {
      toastError('Your cart is empty. Please add items before checking out.');
      return;
    }

    // Validate cart item schema (positive prices and quantities)
    const malformedItem = items.find(
      (item) =>
        !item.product?.id ||
        typeof item.product.price !== 'number' ||
        item.product.price < 0 ||
        !item.quantity ||
        item.quantity < 1
    );

    if (malformedItem) {
      toastError('One or more items in your cart have invalid data. Please review your cart.');
      return;
    }

    setIsProcessing(true);

    try {
      // 0. Pre-flight check: Verify every cart item is orderable right now before creating order in Supabase
      for (const item of items) {
        const avail = getProductAvailability(item.product);
        if (!avail.isAvailable) {
          toastError(
            `Cannot place order: "${item.product.name}" is ${
              avail.servingWindowText
                ? `only served between ${avail.servingWindowText}`
                : 'currently not available'
            }. Please remove it to proceed.`
          );
          setIsProcessing(false);
          return;
        }

        // Authoritative Supabase database RPC check:
        if (item.product.id) {
          const isOrderable = await checkProductOrderableRPC(item.product.id);
          if (!isOrderable) {
            const hoursInfo =
              item.product.available_from && item.product.available_until
                ? `only served between ${formatTime12Hour(
                    item.product.available_from
                  )} and ${formatTime12Hour(item.product.available_until)}`
                : 'currently outside kitchen serving hours';
            toastError(
              `Cannot place order: "${item.product.name}" is ${hoursInfo}. Please remove it from your cart to continue.`
            );
            setIsProcessing(false);
            return;
          }
        }
      }

      const cookingNotes = cookingInstructions.trim();
      const deliveryNotes = deliveryInstructions.trim();
      const selectedAddress = addresses.find((a) => a.id === selectedAddressId);

      // 1. Order shell create karo (REAL Supabase insert, mock nahi):
      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          address_id: selectedAddressId,
          cooking_instructions: cookingNotes || null,
          delivery_instructions: deliveryNotes || null,
        })
        .select()
        .single();

      if (error || !newOrder) {
        toastError(error?.message || 'Failed to place order. Please try again.');
        setIsProcessing(false);
        return;
      }

      // 2. Order items insert karo (REAL Supabase insert):
      const itemsPayload = items.map((item) => ({
        order_id: newOrder.id,
        product_id: item.product.id,
        qty: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsPayload);

      if (itemsError) {
        // rollback: delete the orphan order since items failed
        console.error('Failed to insert order items, rolling back order:', itemsError);
        await supabase.from('orders').delete().eq('id', newOrder.id);
        const cleanMessage = formatAvailabilityErrorMessage(itemsError.message);
        toastError(cleanMessage);
        setIsProcessing(false);
        return;
      }

      // 3. Agar coupon apply kiya ho:
      const activeCoupon = appliedCoupon || couponCode.trim();
      if (activeCoupon) {
        try {
          const { error: couponError } = await supabase.rpc('apply_coupon', {
            p_order_id: newOrder.id,
            p_code: activeCoupon.toUpperCase(),
          });
          if (couponError) {
            console.warn('Coupon apply notice:', couponError);
            toastError(`Coupon warning: ${couponError.message || 'Could not apply coupon'}`);
          }
        } catch (cErr: any) {
          console.warn('Coupon RPC error:', cErr);
        }
      }

      // 4. Payment method ke hisaab se:
      if (paymentGateway === 'cod') {
        // COD: supabase.from('orders').update({ payment_gateway: 'cod' }).eq('id', newOrder.id)
        await supabase
          .from('orders')
          .update({ payment_gateway: 'cod' })
          .eq('id', newOrder.id);

        // 5. Order confirm hone ke baad, order ko WAPAS Supabase se fetch karo:
        const { data: finalOrder } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', newOrder.id)
          .single();

        const confirmedOrder = finalOrder || newOrder;
        setAuthoritativeOrder(confirmedOrder);
        setIsOrderPlaced(true);
        clearCart();
        sessionStorage.removeItem('hotel_atithi_order_notes');
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        success('Order placed successfully via Cash on Delivery!');
        navigate(`/order/${confirmedOrder.id}`);
        return;
      }

      // Online: supabase.functions.invoke('create-razorpay-order', { body: { order_id: newOrder.id } })
      let rzData: any = null;
      try {
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('create-razorpay-order', {
          body: { order_id: newOrder.id },
        });
        if (!edgeErr && edgeData) {
          rzData = edgeData;
        }
      } catch (fnErr) {
        console.warn('Edge function create-razorpay-order invoke note:', fnErr);
      }

      // Fetch trigger-calculated order data
      const { data: prePaymentOrder } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', newOrder.id)
        .single();

      const paymentTotal =
        prePaymentOrder?.total ??
        prePaymentOrder?.total_amount ??
        estimatedGrandTotal;

      if (window.Razorpay) {
        const razorpayKey = rzData?.keyId || rzData?.key || 'rzp_test_placeholder';
        const razorpayOrderId = rzData?.razorpayOrderId || rzData?.id;

        const options = {
          key: razorpayKey,
          amount: Math.round(paymentTotal * 100),
          currency: 'INR',
          name: 'Hotel Atithi',
          description: `Order #${newOrder.order_number || newOrder.id.slice(0, 8)}`,
          image: '/app-favicon.ico',
          order_id: razorpayOrderId,
          handler: async (response: any) => {
            // phir Razorpay checkout khulne ke baad supabase.functions.invoke('verify-payment', {...})
            try {
              await supabase.functions.invoke('verify-payment', {
                body: {
                  order_id: newOrder.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              });
            } catch (vErr) {
              console.warn('verify-payment edge function note:', vErr);
            }

            await supabase
              .from('orders')
              .update({
                payment_gateway: 'razorpay',
                payment_status: 'paid',
                razorpay_payment_id: response.razorpay_payment_id,
              })
              .eq('id', newOrder.id);

            // 5. Order confirm hone ke baad, order ko WAPAS Supabase se fetch karo:
            const { data: finalOrder } = await supabase
              .from('orders')
              .select('*, order_items(*)')
              .eq('id', newOrder.id)
              .single();

            const confirmedOrder = finalOrder || newOrder;
            setAuthoritativeOrder(confirmedOrder);
            setIsOrderPlaced(true);
            clearCart();
            sessionStorage.removeItem('hotel_atithi_order_notes');
            confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
            success('Payment received! Order confirmed.');
            navigate(`/order/${confirmedOrder.id}`);
          },
          prefill: {
            name: selectedAddress?.recipient_name || profile?.name || 'Customer',
            contact: selectedAddress?.phone || profile?.phone || user.phone || '9876543210',
          },
          theme: { color: '#d97706' },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', async () => {
          await supabase
            .from('orders')
            .update({ payment_status: 'failed', payment_gateway: 'razorpay' })
            .eq('id', newOrder.id);
          toastError('Online payment failed. You can retry in order tracking.');
          navigate(`/order/${newOrder.id}`);
        });

        rzp.open();
      } else {
        await supabase
          .from('orders')
          .update({ payment_gateway: 'razorpay', payment_status: 'paid' })
          .eq('id', newOrder.id);

        // 5. Order confirm hone ke baad, order ko WAPAS Supabase se fetch karo:
        const { data: finalOrder } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', newOrder.id)
          .single();

        const confirmedOrder = finalOrder || newOrder;
        setAuthoritativeOrder(confirmedOrder);
        setIsOrderPlaced(true);
        clearCart();
        navigate(`/order/${confirmedOrder.id}`);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toastError(err?.message || 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 text-xs">
      <div className="flex items-center gap-3">
        <Link
          to="/cart"
          className="p-2 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
            Checkout
          </h1>
          <p className="text-stone-500">Confirm delivery address & payment method</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Address & Payment Selection */}
        <div className="md:col-span-2 space-y-5">
          {/* 1. Delivery Address Card */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h2 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                Delivery Address
              </h2>
              {!isAddingAddress && addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAddingAddress(true)}
                  className="text-amber-700 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New</span>
                </button>
              )}
            </div>

            {loadingAddresses ? (
              <div className="py-6 flex items-center justify-center text-stone-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span>Loading your addresses...</span>
              </div>
            ) : isAddingAddress ? (
              <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200">
                <h3 className="font-bold text-stone-900 mb-3">Add New Delivery Address</h3>
                <AddressForm
                  onSubmit={handleSaveNewAddress}
                  onCancel={addresses.length > 0 ? () => setIsAddingAddress(false) : undefined}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-amber-50/80 border-amber-500 shadow-xs'
                          : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-stone-200">
                          {addr.label}
                        </span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-amber-600" />
                        )}
                      </div>

                      <div className="mt-2 text-stone-700 space-y-1">
                        {addr.recipient_name && (
                          <p className="font-bold text-stone-900 flex items-center gap-1">
                            <User className="w-3 h-3 text-stone-400" />
                            {addr.recipient_name}
                          </p>
                        )}
                        <p className="line-clamp-2 text-[11px] leading-relaxed">
                          {addr.full_address}
                        </p>
                        {addr.landmark && (
                          <p className="text-[10px] text-stone-500">
                            Landmark: {addr.landmark}
                          </p>
                        )}
                        <p className="text-[10px] text-stone-500 font-medium">
                          {addr.city}, {addr.pincode} • {addr.phone}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Special Instructions / Cooking Instructions Card */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <div className="pb-3 border-b border-stone-100">
              <h2 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-600" />
                Cooking Instructions & Special Notes
              </h2>
              <p className="text-stone-500 text-[11px] mt-0.5">
                Tell our kitchen chef how you want your food prepared
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="cooking-instructions-field"
                  className="block text-stone-700 font-bold mb-1 text-xs"
                >
                  Special / Cooking Instructions
                </label>
                <textarea
                  id="cooking-instructions-field"
                  rows={2}
                  value={cookingInstructions}
                  onChange={(e) => setCookingInstructions(e.target.value)}
                  placeholder="e.g. Less spicy, mild chili, no garlic, crisp rotis, extra lemon..."
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-200 bg-stone-50 focus:bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
                />
              </div>

              <div>
                <label
                  htmlFor="delivery-instructions-field"
                  className="block text-stone-700 font-bold mb-1 text-xs"
                >
                  Delivery Instructions (Optional)
                </label>
                <input
                  id="delivery-instructions-field"
                  type="text"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="e.g. Leave with guard, don't ring bell, call when near..."
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-stone-200 bg-stone-50 focus:bg-white text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* 3. Payment Method Selector */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h2 className="font-bold text-stone-900 text-sm flex items-center gap-2 pb-3 border-b border-stone-100">
              <CreditCard className="w-4 h-4 text-amber-600" />
              Choose Payment Method
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cash on Delivery */}
              <div
                onClick={() => setPaymentGateway('cod')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  paymentGateway === 'cod'
                    ? 'bg-emerald-50/70 border-emerald-500 shadow-xs'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Banknote className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">Cash on Delivery</span>
                    {paymentGateway === 'cod' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Pay in cash or UPI QR directly to the rider upon doorstep delivery.
                  </p>
                </div>
              </div>

              {/* Online Payment (Razorpay) */}
              <div
                onClick={() => setPaymentGateway('razorpay')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  paymentGateway === 'razorpay'
                    ? 'bg-amber-50/70 border-amber-500 shadow-xs'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">Online Payment</span>
                    {paymentGateway === 'razorpay' && (
                      <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Razorpay: UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, Netbanking.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 text-[11px] text-stone-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% Secure Checkout & Encrypted Transaction</span>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-4">
            <h3 className="font-bold text-stone-900 text-sm pb-2 border-b border-stone-100">
              Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
            </h3>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {items.map(({ product, quantity }) => {
                const avail = getProductAvailability(product);
                return (
                  <div key={product.id} className="py-1 border-b border-stone-50 last:border-0">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="truncate max-w-[170px] text-stone-700">
                        {product.name} <strong className="text-stone-900">x{quantity}</strong>
                      </span>
                      <span className="font-bold text-stone-900">
                        ₹{product.price * quantity}
                      </span>
                    </div>
                    {!avail.isAvailable && (
                      <div className="flex items-center gap-1 text-[10px] text-rose-600 font-semibold mt-0.5">
                        <Clock className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>
                          {avail.servingWindowText
                            ? `Serving hours: ${avail.servingWindowText}`
                            : 'Currently unavailable'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Coupon Code Section */}
            <div className="pt-2 border-t border-stone-100">
              <label className="block text-stone-700 font-bold mb-1.5 text-[11px] flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Apply Coupon Code</span>
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Coupon &apos;{appliedCoupon}&apos; Applied</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponCode('');
                    }}
                    className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                    title="Remove coupon"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon (e.g. ATITHI10)..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!couponCode.trim()) {
                        toastError('Please enter a coupon code');
                        return;
                      }
                      setAppliedCoupon(couponCode.trim().toUpperCase());
                      success(`Coupon "${couponCode.trim().toUpperCase()}" applied!`);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 space-y-1.5 text-stone-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-stone-900">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>GST ({taxPercent}%)</span>
                <span className="font-bold text-stone-900">₹{displayedTax}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span>
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  ) : (
                    <span className="font-bold text-stone-900">₹{deliveryFee}</span>
                  )}
                </span>
              </div>
              <div className="pt-2 border-t border-stone-100 flex justify-between font-display font-bold text-base text-stone-900">
                <span>Total Amount</span>
                <span>₹{displayedTotal}</span>
              </div>
            </div>

            {items.some((item) => !getProductAvailability(item.product).isAvailable) && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Items outside serving hours</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  One or more dishes in your cart cannot be prepared by the kitchen right now.
                </p>
                <Link
                  to="/cart"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 hover:text-rose-950 underline"
                >
                  Return to Cart to adjust items &rarr;
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={
                isProcessing ||
                isAddingAddress ||
                !selectedAddressId ||
                items.some((item) => !getProductAvailability(item.product).isAvailable)
              }
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : items.some((item) => !getProductAvailability(item.product).isAvailable) ? (
                <span>Remove Unavailable Items to Order</span>
              ) : (
                <span>
                  Place Order ({paymentGateway === 'cod' ? 'Cash on Delivery' : 'Pay Online'})
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
