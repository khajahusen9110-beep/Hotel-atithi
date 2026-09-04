import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { CartProvider } from './context/CartContext';

import { StoreStatusBanner } from './components/StoreStatusBanner';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Footer } from './components/Footer';
import { StickyCartBar } from './components/StickyCartBar';

import { HomePage } from './pages/HomePage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <SettingsProvider>
            <CartProvider>
              <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 font-sans selection:bg-amber-100 selection:text-amber-900">
                <StoreStatusBanner />
                <Navbar />

                <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/order/:orderId" element={<OrderTrackingPage />} />
                    <Route path="/orders" element={<OrderHistoryPage />} />
                    <Route path="/reviews" element={<ReviewsPage />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Routes>
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
