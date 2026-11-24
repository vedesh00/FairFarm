import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/Guards';
import { getRoleHome } from './lib/authRoles';

// Pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { BuyerMarketplace } from './pages/BuyerMarketplace';
import { FarmerDashboard } from './pages/FarmerDashboard';
import { BuyerDashboard } from './pages/BuyerDashboard';
import { WarehouseDashboard } from './pages/WarehouseDashboard';
import { MyListingsPage } from './pages/MyListingsPage';
import { CreateListingPage } from './pages/CreateListingPage';
import { ListingOffersPage } from './pages/ListingOffersPage';
import { BuyerOffersPage } from './pages/BuyerOffersPage';
import { OrdersPage } from './pages/OrdersPage';
import { TransportHubPage } from './pages/TransportHubPage';
import { CurrentPricePage } from './pages/CurrentPricePage';
import { FuturePricePage } from './pages/FuturePricePage';

function DashboardRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleHome(user.role)} replace />;
}

function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-cream-50 text-forest-950">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            {/* Full-screen Immersive Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<AppLayout />}>
              {/* Public & Common Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/marketplace" element={<BuyerMarketplace />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/dashboard" element={<DashboardRedirect />} />

              {/* Agricultural Market Prices & Predictions */}
              <Route path="/prices/current" element={<CurrentPricePage />} />
              <Route path="/current-price" element={<Navigate to="/prices/current" replace />} />
              <Route path="/prices/future" element={<FuturePricePage />} />
              <Route path="/future-price" element={<Navigate to="/prices/future" replace />} />
              <Route path="/price-prediction" element={<Navigate to="/prices/future" replace />} />

              {/* Farmer Routes */}
              <Route element={<ProtectedRoute allowedRoles={['farmer']} />}>
                <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
                <Route path="/farmer/listings" element={<MyListingsPage />} />
                <Route path="/farmer/listings/new" element={<CreateListingPage />} />
                <Route path="/farmer/listings/:id/offers" element={<ListingOffersPage />} />
                <Route path="/farmer/transport" element={<TransportHubPage />} />
              </Route>

              {/* Buyer / Client Routes */}
              <Route element={<ProtectedRoute allowedRoles={['buyer']} />}>
                <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
                <Route path="/buyer/offers" element={<BuyerOffersPage />} />
              </Route>

              {/* Warehouse Holder Routes */}
              <Route element={<ProtectedRoute allowedRoles={['warehouse']} />}>
                <Route path="/warehouse/dashboard" element={<WarehouseDashboard />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
