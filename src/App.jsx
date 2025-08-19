// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";

import ProductListing from "./components/ProductListing";
import Checkout from "./pages/Checkout";
import AdminLogin from "./pages/AdminLogin";
import OrdersPage from "./pages/OrdersPage";
import ProductsPage from "./pages/ProductsPage";
import AddInitialProducts from "./pages/AddInitialProducts";
import AdminLayout from "./pages/AdminLayout";
import SettingsPage from "./pages/SettingsPage";
import OfflineOrdersPage from "./pages/OfflineOrdersPage";
import OfflineOrdersListPage from "./pages/OfflineOrdersListPage";
import SalesPage from "./pages/SalesPage";

import StoreOwnerSignUp from "./pages/StoreOwnerSignUp";
import StoreOwnerPayment from "./pages/StoreOwnerPayment";

import SuperAdminLayout from "./pages/SuperAdminLayout";
import StoresPage from "./pages/StoresPage";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import AdminPaymentVerification from "./pages/AdminPaymentVerification";
import AdminCopyProducts from "./pages/AdminCopyProducts";

import StorePublicPage from "./pages/StorePublicPage";
import LandingPage from "./pages/LandingPage"; // ✅ new landing page
import StoreNotFound from "./pages/StoreNotFound"; // ✅ import StoreNotFound

import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

// Preloader component
const Preloader = () => {
  return (
    <div className="preloader-overlay">
      <div className="preloader-content">
        <img src="store-logo.png" alt="Karyana Online" className="preloader-logo" />
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [storeId, setStoreId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [storeSlugFromDB, setStoreSlugFromDB] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", currentUser.email));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setIsSuperAdmin(userData.role === "superadmin");

            if (userData.role === "storeowner") {
              const storeRef = collection(db, "stores");
              const sq = query(storeRef, where("storeOwnerId", "==", currentUser.uid));
              const storeSnap = await getDocs(sq);

              if (!storeSnap.empty) {
                const storeData = storeSnap.docs[0].data();
                setStoreId(storeSnap.docs[0].id);
                setStoreSlugFromDB(storeData.storeSlug);
              }
            }
          } else {
            setIsSuperAdmin(false);
          }
        } catch (error) {
          console.error("Error checking user role:", error);
          setIsSuperAdmin(false);
        }
      } else {
        setIsSuperAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Show preloader while loading
  if (loading) {
    return <Preloader />;
  }

  const StoreSpecificPublicPage = () => {
    const { storeSlug } = useParams();
    const [storeExists, setStoreExists] = useState(null);

    useEffect(() => {
      const checkStore = async () => {
        const storeRef = collection(db, "stores");
        const q = query(storeRef, where("storeSlug", "==", storeSlug));
        const snap = await getDocs(q);
        setStoreExists(!snap.empty);
      };
      checkStore();
    }, [storeSlug]);

    if (storeExists === null) {
      return <Preloader />; // preloader while checking store
    }

    if (!storeExists) {
      return <StoreNotFound />; // ✅ show StoreNotFound instead of redirecting
    }

    return <StorePublicPage />;
  };

  const StoreSpecificAdminLogin = () => {
    const { storeSlug } = useParams();
    if (!storeSlug) {
      return <Navigate to="/admin-login" replace />;
    }
    if (user && !isSuperAdmin && storeSlugFromDB) {
      if (storeSlug !== storeSlugFromDB) {
        return <Navigate to={`/${storeSlugFromDB}/admin-login`} replace />;
      }
    }
    return <AdminLogin />;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/:storeSlug" element={<StoreSpecificPublicPage />} />
        <Route path="/:storeSlug/admin-login" element={<StoreSpecificAdminLogin />} />
        <Route
          path="/:storeSlug/admin/*"
          element={
            user && !isSuperAdmin ? (
              <AdminLayout />
            ) : user && isSuperAdmin ? (
              <Navigate to="/super-admin" replace />
            ) : (
              <Navigate to="/admin-login" replace />
            )
          }
        >
          <Route path="dashboard" element={<OrdersPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="offline-orders" element={<OfflineOrdersPage />} />
          <Route path="offline-orders-list" element={<OfflineOrdersListPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="settings" element={<SettingsPage storeId={storeId} />} />
        </Route>

        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/store-owner-signup" element={<StoreOwnerSignUp />} />
        <Route
          path="/store-owner/payment"
          element={user && !isSuperAdmin ? <StoreOwnerPayment /> : <Navigate to="/admin-login" replace />}
        />
        <Route path="/admin/add-products" element={<AddInitialProducts />} />
        <Route path="/admin-copy-products" element={<AdminCopyProducts />} />

        <Route
          path="/super-admin/*"
          element={user && isSuperAdmin ? <SuperAdminLayout /> : <Navigate to="/admin-login" replace />}
        >
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="stores" element={<StoresPage />} />
          <Route path="payments" element={<AdminPaymentVerification />} />
          <Route index element={<SuperAdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
