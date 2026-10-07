import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { CartProvider } from './context/CartContext';
import { soundAndHaptics } from './utils/soundAndHaptics';

import { StoreStatusBanner } from './components/StoreStatusBanner';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { StickyCartBar } from './components/StickyCartBar';

import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/PageLoader';

// The menu is the landing page, so it ships in the main bundle; every other page
// is split into its own chunk and only downloaded when the customer opens it.
import { HomePage } from './pages/HomePage';

const loadCartPage = () => import('./pages/CartPage');
const loadCheckoutPage = () => import('./pages/CheckoutPage');

const CartPage = lazy(() => loadCartPage().then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => loadCheckoutPage().then((m) => ({ default: m.CheckoutPage })));
const OrderTrackingPage = lazy(() =>
  import('./pages/OrderTrackingPage').then((m) => ({ default: m.OrderTrackingPage }))
);
const OrderHistoryPage = lazy(() =>
  import('./pages/OrderHistoryPage').then((m) => ({ default: m.OrderHistoryPage }))
);
const ReviewsPage = lazy(() => import('./pages/ReviewsPage').then((m) => ({ default: m.ReviewsPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then((m) => ({ default: m.AuthPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Warm up the order funnel (cart -> checkout) once the menu is idle, so those
// pages open instantly without slowing down the first paint.
const prefetchOrderFunnel = () => {
  const run = () => {
    loadCartPage().catch(() => {});
    loadCheckoutPage().catch(() => {});
  };
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    setTimeout(run, 2500);
  }
};

export const App: React.FC = () => {
  useEffect(() => {
    // Initialize global sound effects and haptic vibration for every click/tap in the app
    soundAndHaptics.initGlobalListeners();
    prefetchOrderFunnel();
  }, []);

  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <CartProvider>
              <div className="min-h-screen flex flex-col bg-white text-stone-900 font-sans selection:bg-orange-100 selection:text-orange-900">
                <StoreStatusBanner />
                <Navbar />

                <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/cart" element={<CartPage />} />
                        <Route path="/checkout" element={<CheckoutPage />} />
                        <Route path="/order/:orderId" element={<OrderTrackingPage />} />
                        <Route path="/orders" element={<OrderHistoryPage />} />
                        <Route path="/reviews" element={<ReviewsPage />} />
                        <Route path="/auth" element={<AuthPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/admin" element={<Navigate to="/" replace />} />
                        <Route path="/admin/*" element={<Navigate to="/" replace />} />
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                </main>

                <StickyCartBar />
                <BottomNav />
                <Footer />
              </div>
            </CartProvider>
          </SettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};
export default App;
