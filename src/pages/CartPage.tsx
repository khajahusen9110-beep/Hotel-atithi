import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Utensils,
  Truck,
  Receipt,
  FileText,
  AlertTriangle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { getProductAvailability } from '../utils/productAvailability';

export const CartPage: React.FC = () => {
  const { items, updateQuantity, removeFromCart, clearCart, subtotal } = useCart();
  const { settings, isOpen } = useSettings();
  const navigate = useNavigate();

  const [cookingInstructions, setCookingInstructions] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  const minOrder = settings?.min_order_amount || 149;
  const freeThreshold = settings?.free_delivery_above || settings?.free_delivery_threshold || 500;
  const deliveryBase = settings?.delivery_fee || settings?.delivery_fee_base || 30;
  const deliveryFee = subtotal >= freeThreshold ? 0 : deliveryBase;

  const taxPercent = settings?.tax_percent !== undefined ? Number(settings.tax_percent) : 5;
  const tax = Math.round((subtotal * taxPercent) / 100);
  const grandTotal = subtotal + deliveryFee + tax;

  const isMinOrderMet = subtotal >= minOrder;

  // Check if any items in cart are currently outside serving hours
  const unavailableCartItems = items.filter(
    (item) => !getProductAvailability(item.product).isAvailable
  );
  const hasUnavailableItems = unavailableCartItems.length > 0;

  const handleProceedToCheckout = () => {
    if (hasUnavailableItems) return;
    // Save instructions to sessionStorage for checkout page
    sessionStorage.setItem(
      'hotel_atithi_order_notes',
      JSON.stringify({ cookingInstructions, deliveryInstructions })
    );
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="py-20 max-w-md mx-auto text-center space-y-4 px-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="font-display font-bold text-2xl text-stone-900">Your Cart is Empty</h2>
        <p className="text-xs sm:text-sm text-stone-500 leading-relaxed">
          Looks like you haven't added any pure veg delicacies or fresh farm vegetables yet.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all"
        >
          <Utensils className="w-4 h-4" />
          <span>Explore Menu</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900">
            Order Review
          </h1>
          <p className="text-stone-500 mt-0.5">
            {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        <button
          onClick={clearCart}
          className="px-3 py-1.5 rounded-xl border border-stone-200 text-rose-600 font-bold hover:bg-rose-50 transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All</span>
        </button>
      </div>

      {!isOpen && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-sm block">Kitchen is Currently Closed</span>
            <span className="text-amber-800">
              You can still review your cart, but orders will be fulfilled when our kitchen opens at {settings?.opening_time || '08:00'}.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Cart Items List & Instructions */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 divide-y divide-stone-100 overflow-hidden shadow-xs">
            {items.map(({ product, quantity }) => {
              const avail = getProductAvailability(product);
              return (
                <div
                  key={product.id}
                  className={`p-4 flex items-center justify-between gap-3 ${
                    !avail.isAvailable ? 'bg-rose-50/40' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className={`w-14 h-14 rounded-2xl object-cover bg-stone-100 shrink-0 ${
                        !avail.isAvailable ? 'opacity-70 grayscale-30' : ''
                      }`}
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-stone-900 truncate text-xs sm:text-sm">
                        {product.name}
                      </h4>
                      <p className="text-stone-500 text-[11px]">
                        ₹{product.price} {product.unit && `• ${product.unit}`}
                      </p>
                      <span className="text-amber-700 font-bold text-xs mt-0.5 block">
                        ₹{product.price * quantity}
                      </span>
                      {!avail.isAvailable && (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-lg w-fit border border-rose-200">
                          <Clock className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>
                            {avail.servingWindowText
                              ? `Serving hours: ${avail.servingWindowText}`
                              : 'Currently unavailable'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl px-1 py-0.5">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="w-6 h-6 rounded-lg bg-white text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-2xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2.5 font-bold text-stone-900">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        disabled={!avail.isAvailable}
                        className="w-6 h-6 rounded-lg bg-white text-stone-700 hover:bg-stone-100 flex items-center justify-center shadow-2xs disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notes & Special Requests */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 space-y-3 shadow-xs">
            <h3 className="font-bold text-stone-900 text-xs sm:text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              Special Instructions
            </h3>

            <div>
              <label className="block text-stone-600 font-semibold mb-1">
                Kitchen Instructions (e.g. less spicy, extra lemon, no onion-garlic)
              </label>
              <input
                type="text"
                value={cookingInstructions}
                onChange={(e) => setCookingInstructions(e.target.value)}
                placeholder="Write message for our chef..."
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-stone-600 font-semibold mb-1">
                Delivery Instructions (e.g. leave at door, don't ring bell)
              </label>
              <input
                type="text"
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                placeholder="Write message for our delivery rider..."
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Bill Details */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-stone-900 text-xs sm:text-sm flex items-center gap-2 pb-2 border-b border-stone-100">
              <Receipt className="w-4 h-4 text-amber-600" />
              Bill Details
            </h3>

            <div className="space-y-2 text-stone-600">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-stone-900">₹{subtotal}</span>
              </div>

              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-stone-400" />
                  Delivery Charge
                </span>
                <span>
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600 font-bold">FREE</span>
                  ) : (
                    <span className="font-bold text-stone-900">₹{deliveryFee}</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span>GST ({taxPercent}%)</span>
                <span className="font-bold text-stone-900">₹{tax}</span>
              </div>

              {subtotal < freeThreshold && (
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-900 text-[11px] font-medium">
                  Add items worth ₹{freeThreshold - subtotal} more for <strong className="font-bold">FREE Delivery</strong>!
                </div>
              )}

              <div className="pt-3 border-t border-stone-100 flex justify-between text-stone-900 font-display font-bold text-base">
                <span>Total Amount</span>
                <span>₹{grandTotal}</span>
              </div>
            </div>

            {!isMinOrderMet && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold">
                Minimum order amount is ₹{minOrder}. Please add ₹{minOrder - subtotal} more to proceed.
              </div>
            )}

            {hasUnavailableItems && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Items outside serving hours</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  {unavailableCartItems.length === 1
                    ? `"${unavailableCartItems[0].product.name}" is only served between ${
                        getProductAvailability(unavailableCartItems[0].product).servingWindowText || 'specific hours'
                      }. Please remove it to proceed.`
                    : `${unavailableCartItems.length} items in your cart are currently outside serving hours. Please remove them to proceed.`}
                </p>
              </div>
            )}

            <button
              onClick={handleProceedToCheckout}
              disabled={!isMinOrderMet || hasUnavailableItems}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>
                {hasUnavailableItems
                  ? 'Remove Unavailable Items to Proceed'
                  : 'Proceed to Checkout'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
