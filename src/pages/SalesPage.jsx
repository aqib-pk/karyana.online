import React, { useEffect, useState } from "react";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useStore } from "../context/StoreContext"; // Import your store context

const SalesPage = () => {
  const { storeId } = useStore();  // Get current store ID
  const [offlineStats, setOfflineStats] = useState({ today: 0, weekly: 0, monthly: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return; // Wait for storeId

    const fetchSalesStats = async () => {
      setLoading(true);
      try {
        const now = new Date();

        // Helper dates
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const offlineOrdersRef = collection(db, "stores", storeId, "offlineOrders");
        const offlineSnapshot = await getDocs(offlineOrdersRef);

        let offlineToday = 0, offlineWeek = 0, offlineMonth = 0;
        offlineSnapshot.forEach(doc => {
          const order = doc.data();
          if (!order.createdAt) return;
          const orderDate = order.createdAt.toDate();
          if (orderDate >= startOfToday) offlineToday += order.totalPrice || 0;
          if (orderDate >= startOfWeek) offlineWeek += order.totalPrice || 0;
          if (orderDate >= startOfMonth) offlineMonth += order.totalPrice || 0;
        });

        setOfflineStats({ today: offlineToday, weekly: offlineWeek, monthly: offlineMonth });
      } catch (error) {
        console.error("Error fetching sales stats:", error);
      }
      setLoading(false);
    };

    fetchSalesStats();
  }, [storeId]);

  if (loading) return <div className="p-6 text-center">Loading sales stats...</div>;

  const data = [
    { name: "Today", Sales: offlineStats.today },
    { name: "This Week", Sales: offlineStats.weekly },
    { name: "This Month", Sales: offlineStats.monthly },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Sales Statistics</h1>

      {/* Offline Sales */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4 text-green-700">Offline Sales</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded shadow text-center border border-green-300">
            <p className="text-gray-600 mb-2">Today</p>
            <p className="text-3xl font-bold text-green-600">PKR {offlineStats.today.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded shadow text-center border border-green-300">
            <p className="text-gray-600 mb-2">This Week</p>
            <p className="text-3xl font-bold text-green-600">PKR {offlineStats.weekly.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded shadow text-center border border-green-300">
            <p className="text-gray-600 mb-2">This Month</p>
            <p className="text-3xl font-bold text-green-600">PKR {offlineStats.monthly.toLocaleString()}</p>
          </div>
        </div>

        {/* Chart */}
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `PKR ${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="Sales" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

export default SalesPage;
