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
  CreditCardIcon,
  Bars3Icon, // ✅ hamburger
  XMarkIcon,
  Squares2X2Icon, // ✅ close icon
} from "@heroicons/react/24/outline";

import { StoreProvider } from "../context/StoreContext";


const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { storeSlug } = useParams();
  const [hasNewOrders, setHasNewOrders] = useState(false);
  const [storeId, setStoreId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // ✅ sidebar toggle

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
      navigate(`/${storeSlug}/admin-login`);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:block w-64 bg-green-700 text-white p-6">
        <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>
        <nav className="space-y-4">
          <Link
            to={`/${storeSlug}/admin/dashboard`}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/dashboard` ? "bg-green-900" : ""
            }`}
          >
            <Squares2X2Icon className="h-5 w-5 text-white" />
            <span>Dashboard</span>
          </Link>
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

          {/* ✅ Categories Link */}
          <Link
            to={`/${storeSlug}/admin/categories`}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/categories` ? "bg-green-900" : ""
            }`}
          >
            <span>📂</span>
            <span>Categories</span>
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
            to={`/${storeSlug}/admin/admin-copy-products`}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin-copy-products` ? "bg-green-900" : ""
            }`}
          >
            <ClipboardDocumentListIcon className="h-5 w-5 text-white" />
            <span>Copy Products</span>
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

          {/* ✅ Subscription Link */}
          <Link
            to={`/${storeSlug}/admin/subscription`}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/subscription` ? "bg-green-900" : ""
            }`}
          >
            <CreditCardIcon className="h-5 w-5 text-white" />
            <span>Subscription</span>
          </Link>

          <Link
            to={`/${storeSlug}/admin/sales`}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/sales` ? "bg-green-900" : ""
            }`}
          >
            <ChartBarIcon className="h-5 w-5 text-white" />
            <span>Offline Sales</span>
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

      {/* Sidebar - Mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-green-700 text-white p-6 transform transition-transform duration-300 md:hidden h-full overflow-y-auto ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Admin Panel</h2>
          <button onClick={() => setIsSidebarOpen(false)}>
            <XMarkIcon className="h-6 w-6 text-white" />
          </button>
        </div>
        <nav className="space-y-4">
          <Link
            to={`/${storeSlug}/admin/orders`}
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/orders` ? "bg-green-900" : ""
            }`}
          >
            <span>📦</span>
            <span>Online Orders</span>
          </Link>
          <Link
            to={`/${storeSlug}/admin/products`}
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/products` ? "bg-green-900" : ""
            }`}
          >
            <ShoppingCartIcon className="h-5 w-5 text-white" />
            <span>Products</span>
          </Link>

          {/* ✅ Categories Link (Mobile) */}
          <Link
            to={`/${storeSlug}/admin/categories`}
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/categories` ? "bg-green-900" : ""
            }`}
          >
            <span>📂</span>
            <span>Categories</span>
          </Link>

          <Link
            to={`/${storeSlug}/admin/settings`}
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/settings` ? "bg-green-900" : ""
            }`}
          >
            <Cog6ToothIcon className="h-5 w-5 text-white" />
            <span>Settings</span>
          </Link>
          <Link
            to={`/${storeSlug}/admin/offline-orders`}
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/offline-orders` ? "bg-green-900" : ""
            }`}
          >
            <ClipboardDocumentListIcon className="h-5 w-5 text-white" />
            <span>Offline Orders</span>
          </Link>
          <Link
            to={`/${storeSlug}/admin/offline-orders-list`}
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/offline-orders-list` ? "bg-green-900" : ""
            }`}
          >
            <ClipboardDocumentListIcon className="h-5 w-5 text-white" />
            <span>Offline Orders List</span>
          </Link>

          {/* ✅ Subscription Link (Mobile) */}
          <Link
            to={`/${storeSlug}/admin/subscription`}
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/subscription` ? "bg-green-900" : ""
            }`}
          >
            <CreditCardIcon className="h-5 w-5 text-white" />
            <span>Subscription</span>
          </Link>

          <Link
            to={`/${storeSlug}/admin/sales`}
            onClick={() => setIsSidebarOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 ${
              location.pathname === `/${storeSlug}/admin/sales` ? "bg-green-900" : ""
            }`}
          >
            <ChartBarIcon className="h-5 w-5 text-white" />
            <span>Sales</span>
          </Link>
          <button
            onClick={() => {
              setIsSidebarOpen(false);
              handleLogout();
            }}
            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-green-800 w-full text-left"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 text-white" />
            <span>Logout</span>
          </button>
        </nav>
      </div>

      {/* Content Area */}
      <main className="flex-1 bg-gray-50 p-6 overflow-auto relative admin-content">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-4">
          {/* Hamburger - Mobile */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2"
          >
            <Bars3Icon className="h-6 w-6 text-gray-700" />
          </button>

          {/* Notification bell */}
          <button onClick={handleBellClick} className="relative p-2 ml-auto">
            <BellIcon className="h-6 w-6 text-gray-700" />
            {hasNewOrders && (
              <>
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-600 animate-ping" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-600" />
              </>
            )}
          </button>
        </div>

        {/* Provide storeId via context */}
        <StoreProvider storeId={storeId}>
          <Outlet />
        </StoreProvider>
      </main>
    </div>
  );
};

export default AdminLayout;
