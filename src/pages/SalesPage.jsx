import React, { useEffect, useState } from "react";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { useStore } from "../context/StoreContext";

const SalesPage = () => {
  const { storeId } = useStore();
  const [offlineStats, setOfflineStats] = useState({ today: 0, weekly: 0, monthly: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;

    const fetchSalesStats = async () => {
      setLoading(true);
      try {
        const now = new Date();
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

  const COLORS = ["#22c55e", "#16a34a", "#14532d"]; // different shades of green

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Sales Statistics</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow text-center border border-green-300">
          <p className="text-gray-600 mb-2">Today</p>
          <p className="text-3xl font-bold text-green-600">PKR {offlineStats.today.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow text-center border border-green-300">
          <p className="text-gray-600 mb-2">This Week</p>
          <p className="text-3xl font-bold text-green-600">PKR {offlineStats.weekly.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow text-center border border-green-300">
          <p className="text-gray-600 mb-2">This Month</p>
          <p className="text-3xl font-bold text-green-600">PKR {offlineStats.monthly.toLocaleString()}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-2xl shadow border border-green-300">
          <h2 className="text-xl font-semibold mb-4 text-green-700">Bar Chart</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `PKR ${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="Sales" fill="#22c55e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line Chart */}
        <div className="bg-white p-6 rounded-2xl shadow border border-green-300">
          <h2 className="text-xl font-semibold mb-4 text-green-700">Trend Line</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `PKR ${value.toLocaleString()}`} />
              <Line type="monotone" dataKey="Sales" stroke="#22c55e" strokeWidth={3} dot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow border border-green-300 col-span-1 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4 text-green-700">Sales Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey="Sales"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `PKR ${value.toLocaleString()}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default SalesPage;
