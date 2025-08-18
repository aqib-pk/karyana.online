// src/pages/AdminLayout.jsx
import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { collection, onSnapshot, orderBy, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { getAuth, signOut } from "firebase/auth";
import {
  BellIcon,
  Cog6ToothIcon,
  ShoppingCartIcon,
  ArrowRightOnRectangleIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

import { StoreProvider } from "../context/StoreContext";

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { storeSlug } = useParams(); // ✅ get slug from URL
  const [hasNewOrders, setHasNewOrders] = useState(false);
  const [storeId, setStoreId] = useState(null);

  const auth = getAuth();

  // Fetch storeId for current logged-in user
  useEffect(() => {
    const fetchStoreId = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const storesRef = collection(db, "stores");
        const q = query(storesRef, where("storeOwnerId", "==", user.uid));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          setStoreId(snapshot.docs[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch storeId:", error);
      }
    };

    fetchStoreId();
  }, [auth]);

  // Listen for new orders notification
  useEffect(() => {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const latestOrder = snapshot.docs[0]?.data();
      const latestTime = latestOrder?.createdAt?.toDate()?.getTime();

      const lastSeen = localStorage.getItem("lastSeenOrderTime");

      if (latestTime && (!lastSeen || latestTime > Number(lastSeen))) {
        setHasNewOrders(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleBellClick = () => {
    localStorage.setItem("lastSeenOrderTime", Date.now());
    setHasNewOrders(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate(`/${storeSlug}/admin-login`); // ✅ redirect back to store-specific login
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-green-700 text-white p-6">
        <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>
        <nav className="space-y-4">
          <Link
            to={`/${storeSlug}/admin/orders`}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/orders` ? "bg-green-900" : ""
            }`}
          >
            <span>📦</span>
            <span>Online Orders</span>
          </Link>
          <Link
            to={`/${storeSlug}/admin/products`}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/products` ? "bg-green-900" : ""
            }`}
          >
            <ShoppingCartIcon className="h-5 w-5 text-white" />
            <span>Products</span>
          </Link>
          <Link
            to={`/${storeSlug}/admin/settings`}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/settings` ? "bg-green-900" : ""
            }`}
          >
            <Cog6ToothIcon className="h-5 w-5 text-white" />
            <span>Settings</span>
          </Link>

          <Link
            to={`/${storeSlug}/admin/offline-orders`}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/offline-orders` ? "bg-green-900" : ""
            }`}
          >
            <ClipboardDocumentListIcon className="h-5 w-5 text-white" />
            <span>Offline Orders</span>
          </Link>

          <Link
            to={`/${storeSlug}/admin/offline-orders-list`}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/offline-orders-list` ? "bg-green-900" : ""
            }`}
          >
            <ClipboardDocumentListIcon className="h-5 w-5 text-white" />
            <span>Offline Orders List</span>
          </Link>

          <Link
            to={`/${storeSlug}/admin/sales`}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/sales` ? "bg-green-900" : ""
            }`}
          >
            <ChartBarIcon className="h-5 w-5 text-white" />
            <span>Sales</span>
          </Link>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 w-full text-left"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 text-white" />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 bg-gray-50 p-6 overflow-auto relative">
        {/* Top bar with notification bell */}
        <div className="flex justify-end items-center mb-4">
          <button onClick={handleBellClick} className="relative p-2">
            <BellIcon className="h-6 w-6 text-gray-700" />
            {hasNewOrders && (
              <>
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-600 animate-ping" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-600" />
              </>
            )}
          </button>
        </div>

        {/* Provide storeId via context to nested admin pages */}
        <StoreProvider storeId={storeId}>
          <Outlet />
        </StoreProvider>
      </main>
    </div>
  );
};

export default AdminLayout;
