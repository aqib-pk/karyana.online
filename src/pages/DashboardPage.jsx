// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useStore } from "../context/StoreContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const DashboardPage = () => {
  const { storeId } = useStore();
  const [offlineStats, setOfflineStats] = useState({ today: 0, weekly: 0, monthly: 0 });
  const [onlineStats, setOnlineStats] = useState({ today: 0, weekly: 0, monthly: 0 });
  const [loading, setLoading] = useState(true);

  // 🔹 Helper: Calculate revenue for an order
  const getOrderRevenue = (order) => {
    const itemsTotal =
      order.cartItems?.reduce((sum, item) => sum + Number(item.price || 0), 0) || 0;
    const deliveryFee =
      order.deliveryOption === "delivery" ? Number(order.deliveryCharges || 0) : 0;
    return itemsTotal + deliveryFee;
  };

  useEffect(() => {
    if (!storeId) return;

    const fetchSalesStats = async () => {
      setLoading(true);
      try {
        const now = new Date();

        // Helper dates
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // -------- Offline Orders --------
        const offlineOrdersRef = collection(db, "stores", storeId, "offlineOrders");
        const offlineSnapshot = await getDocs(offlineOrdersRef);

        let offlineToday = 0, offlineWeek = 0, offlineMonth = 0;
        offlineSnapshot.forEach(doc => {
          const order = doc.data();
          if (!order.createdAt) return;
          const orderDate = order.createdAt.toDate();
          const revenue = order.totalPrice || getOrderRevenue(order); // fallback for offline
          if (orderDate >= startOfToday) offlineToday += revenue;
          if (orderDate >= startOfWeek) offlineWeek += revenue;
          if (orderDate >= startOfMonth) offlineMonth += revenue;
        });

        // -------- Online Orders --------
        const onlineOrdersRef = collection(db, "stores", storeId, "orders");
        const onlineSnapshot = await getDocs(onlineOrdersRef);

        let onlineToday = 0, onlineWeek = 0, onlineMonth = 0;
        onlineSnapshot.forEach(doc => {
          const order = doc.data();
          if (!order.createdAt) return;
          const orderDate = order.createdAt.toDate();
          const revenue = getOrderRevenue(order); // ✅ must calculate
          if (orderDate >= startOfToday) onlineToday += revenue;
          if (orderDate >= startOfWeek) onlineWeek += revenue;
          if (orderDate >= startOfMonth) onlineMonth += revenue;
        });

        setOfflineStats({ today: offlineToday, weekly: offlineWeek, monthly: offlineMonth });
        setOnlineStats({ today: onlineToday, weekly: onlineWeek, monthly: onlineMonth });
      } catch (error) {
        console.error("Error fetching sales stats:", error);
      }
      setLoading(false);
    };

    fetchSalesStats();
  }, [storeId]);

  if (loading) return <div className="p-6 text-center">Loading dashboard...</div>;

  // Data for charts
  const barData = [
    { name: "Today", Online: onlineStats.today, Offline: offlineStats.today },
    { name: "This Week", Online: onlineStats.weekly, Offline: offlineStats.weekly },
    { name: "This Month", Online: onlineStats.monthly, Offline: offlineStats.monthly },
  ];

  const pieData = [
    { name: "Online", value: onlineStats.monthly },
    { name: "Offline", value: offlineStats.monthly },
  ];

  const COLORS = ["#3b82f6", "#22c55e"]; // blue, green

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📊 Store Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded shadow text-center border border-blue-300">
          <p className="text-gray-600 mb-2">Online Today</p>
          <p className="text-2xl font-bold text-blue-600">PKR {onlineStats.today.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded shadow text-center border border-blue-300">
          <p className="text-gray-600 mb-2">Online This Week</p>
          <p className="text-2xl font-bold text-blue-600">PKR {onlineStats.weekly.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded shadow text-center border border-green-300">
          <p className="text-gray-600 mb-2">Offline Today</p>
          <p className="text-2xl font-bold text-green-600">PKR {offlineStats.today.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded shadow text-center border border-green-300">
          <p className="text-gray-600 mb-2">Offline This Week</p>
          <p className="text-2xl font-bold text-green-600">PKR {offlineStats.weekly.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Grouped Bar Chart */}
        <div className="bg-white p-6 rounded shadow border">
          <h2 className="text-xl font-semibold mb-4">Online vs Offline Sales</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `PKR ${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="Online" fill="#3b82f6" />
              <Bar dataKey="Offline" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded shadow border">
          <h2 className="text-xl font-semibold mb-4">Sales Distribution (This Month)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                outerRadius={120}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip formatter={(value) => `PKR ${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
