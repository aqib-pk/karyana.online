// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";
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
  const { language } = useLanguage();
  const [offlineStats, setOfflineStats] = useState({ today: 0, weekly: 0, monthly: 0 });
  const [onlineStats, setOnlineStats] = useState({ today: 0, weekly: 0, monthly: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const getOrderRevenue = (order) => {
    const itemsTotal =
      (order.cartItems || order.items)?.reduce((sum, item) => sum + Number(item.price || 0), 0) || 0;
    const deliveryFee =
      order.deliveryOption === "delivery" ? Number(order.deliveryCharges || 0) : 0;
    return order.totalPrice || itemsTotal + deliveryFee;
  };

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let allOnlineOrdersData = [];
    let allOfflineOrdersData = [];

    // -------- Offline Orders Listener --------
    const offlineOrdersRef = collection(db, "stores", storeId, "offlineOrders");
    const unsubscribeOffline = onSnapshot(offlineOrdersRef, (snapshot) => {
      let offlineToday = 0,
        offlineWeek = 0,
        offlineMonth = 0;
      const allOfflineOrders = [];

      snapshot.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() };

        // Normalize items for offline orders
        if (!order.cartItems && order.items) {
          order.cartItems = order.items;
        }

        // Ensure totalPrice exists
        if (!order.totalPrice) {
          order.totalPrice = getOrderRevenue(order);
        }

        if (!order.createdAt) return;
        const orderDate = order.createdAt.toDate();
        if (orderDate >= startOfToday) offlineToday += order.totalPrice;
        if (orderDate >= startOfWeek) offlineWeek += order.totalPrice;
        if (orderDate >= startOfMonth) offlineMonth += order.totalPrice;
        allOfflineOrders.push(order);
      });

      setOfflineStats({ today: offlineToday, weekly: offlineWeek, monthly: offlineMonth });
      allOfflineOrdersData = allOfflineOrders;
      updateTopItems(allOnlineOrdersData, allOfflineOrdersData);
      updateRecentOrders(allOnlineOrdersData, allOfflineOrdersData);
    });

    // -------- Online Orders Listener --------
    const onlineOrdersRef = collection(db, "stores", storeId, "orders");
    const unsubscribeOnline = onSnapshot(onlineOrdersRef, (snapshot) => {
      let onlineToday = 0,
        onlineWeek = 0,
        onlineMonth = 0;
      const allOnlineOrders = [];

      snapshot.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() };
        if (!order.createdAt) return;
        const orderDate = order.createdAt.toDate();
        const revenue = getOrderRevenue(order);
        if (orderDate >= startOfToday) onlineToday += revenue;
        if (orderDate >= startOfWeek) onlineWeek += revenue;
        if (orderDate >= startOfMonth) onlineMonth += revenue;
        allOnlineOrders.push(order);
      });

      setOnlineStats({ today: onlineToday, weekly: onlineWeek, monthly: onlineMonth });
      allOnlineOrdersData = allOnlineOrders;
      updateTopItems(allOnlineOrdersData, allOfflineOrdersData);
      updateRecentOrders(allOnlineOrdersData, allOfflineOrdersData);
    });

    // -------- Products Listener (Low Stock) --------
    const productsRef = collection(db, "stores", storeId, "products");
    const unsubscribeProducts = onSnapshot(productsRef, (snapshot) => {
      const products = snapshot.docs.map((doc) => doc.data());
      const lowStock = products
        .filter((item) => Number(item.inventory || 0) < 10)
        .sort((a, b) => Number(a.inventory) - Number(b.inventory))
        .slice(0, 5);
      setLowStockItems(lowStock);
    });

    // -------- Helper: Update Top Items --------
    const updateTopItems = (onlineOrders, offlineOrders) => {
      const allOrders = [...onlineOrders, ...offlineOrders];
      const itemMap = {};

      allOrders.forEach((order) => {
        (order.cartItems || []).forEach((item) => {
          const key = item.id || item.name?.en || item.name?.ur || item.name;
          if (!key) return;

          if (!itemMap[key]) {
            itemMap[key] = { ...item, totalQuantity: 0 };
          }

          // Determine quantity based on unit
          let quantity = Number(item.quantity || 0);

          if (!quantity && item.weight) {
            // Parse numbers from weight string for offline orders
            const weightMatch = item.weight.match(/([\d.]+)\s*(kg|g|L|ml|Piece|Pieces|pcs|Dozen|dozen)/i);
            if (weightMatch) {
              const num = parseFloat(weightMatch[1]);
              const unit = weightMatch[2].toLowerCase();
              if (unit === "dozen") quantity = num * 12;
              else quantity = num; // pcs, pieces, kg, g, L, ml treated as 1 unit per order item
            } else {
              quantity = 1;
            }
          }

          itemMap[key].totalQuantity += quantity;
        });
      });

      const sortedItems = Object.values(itemMap)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5);

      setTopItems(sortedItems);
      setLoading(false);
    };

    // -------- Helper: Update Recent Orders --------
    const updateRecentOrders = (onlineOrders, offlineOrders) => {
      const allOrders = [...onlineOrders, ...offlineOrders];
      const ordersWithDate = allOrders.filter((o) => o.createdAt);
      ordersWithDate.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());
      setRecentOrders(ordersWithDate.slice(0, 5));
    };

    return () => {
      unsubscribeOffline();
      unsubscribeOnline();
      unsubscribeProducts();
    };
  }, [storeId, language]);

  if (loading) return <div className="p-6 text-center">Loading dashboard...</div>;

  const barData = [
    { name: "Today", Online: onlineStats.today, Offline: offlineStats.today },
    { name: "This Week", Online: onlineStats.weekly, Offline: offlineStats.weekly },
    { name: "This Month", Online: onlineStats.monthly, Offline: offlineStats.monthly },
  ];

  const pieData = [
    { name: "Online", value: onlineStats.monthly },
    { name: "Offline", value: offlineStats.monthly },
  ];

  const COLORS = ["#3b82f6", "#22c55e"];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📊 Store Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded shadow text-center border border-blue-300">
          <p className="text-gray-600 mb-2">Online Today</p>
          <p className="text-2xl font-bold text-blue-600">
            PKR {onlineStats.today.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded shadow text-center border border-blue-300">
          <p className="text-gray-600 mb-2">Online This Week</p>
          <p className="text-2xl font-bold text-blue-600">
            PKR {onlineStats.weekly.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded shadow text-center border border-green-300">
          <p className="text-gray-600 mb-2">Offline Today</p>
          <p className="text-2xl font-bold text-green-600">
            PKR {offlineStats.today.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded shadow text-center border border-green-300">
          <p className="text-gray-600 mb-2">Offline This Week</p>
          <p className="text-2xl font-bold text-green-600">
            PKR {offlineStats.weekly.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
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

        <div className="bg-white p-6 rounded shadow border">
          <h2 className="text-xl font-semibold mb-4">Sales Distribution (This Month)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={120} label>
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

      {/* Top Selling Items & Low Stock Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
        <div className="bg-white p-6 rounded shadow border">
          <h2 className="text-xl font-semibold mb-4">🔥 Top Selling Items</h2>
          {topItems.length === 0 ? (
            <p className="text-gray-500">No sales data yet.</p>
          ) : (
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Item</th>
                  <th className="p-2 text-left">Quantity Sold</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">
                      {typeof item.name === "string"
                        ? item.name
                        : item.name?.[language] || item.name?.en || item.name?.ur || "Unnamed"}
                    </td>
                    <td className="p-2 font-semibold">{item.totalQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white p-6 rounded shadow border">
          <h2 className="text-xl font-semibold mb-4">⚠️ Low Stock Items</h2>
          {lowStockItems.length === 0 ? (
            <p className="text-gray-500">No low stock items.</p>
          ) : (
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Item</th>
                  <th className="p-2 text-left">Inventory</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.map((item, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">
                      {typeof item.name === "string"
                        ? item.name
                        : item.name?.[language] || item.name?.en || item.name?.ur || "Unnamed"}
                    </td>
                    <td className="p-2 font-semibold">{item.inventory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white p-6 rounded shadow border">
        <h2 className="text-xl font-semibold mb-4">🛒 Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <p className="text-gray-500">No recent orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Customer</th>
                  <th className="p-2 text-left">Items</th>
                  <th className="p-2 text-left">Total</th>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t">
                    <td className="p-2">{order.fullName || order.customerName || "Guest"}</td>
                    <td className="p-2">
  {order.cartItems?.map((item, i) => {
    const quantity = item.quantity || 1;
    const unit = item.unit || "pcs";
    const name =
      item.name?.[language] || item.name?.en || item.name?.ur || item.name || "Unnamed";

    // Use weight if it exists, otherwise quantity + unit
    const displayQuantity = item.weight ? item.weight : `${quantity} ${unit}`;

    return (
      <div key={i}>
        {name} ({displayQuantity})
      </div>
    );
  })}
</td>
                    <td className="p-2 font-semibold">
                      PKR {getOrderRevenue(order).toLocaleString()}
                    </td>
                    <td className="p-2">{order.createdAt?.toDate().toLocaleDateString()}</td>
                    <td className="p-2">{order.status || "Pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
