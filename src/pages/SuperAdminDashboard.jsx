// src/pages/SuperAdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const SuperAdminDashboard = () => {
  const [totalStores, setTotalStores] = useState(0);
  const [topStores, setTopStores] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storesSnapshot = await getDocs(collection(db, "stores"));
        setTotalStores(storesSnapshot.size);

        let storeStats = [];

        for (const storeDoc of storesSnapshot.docs) {
          const storeData = storeDoc.data();

          // Handle different possible store name keys
          const storeName =
            storeData.storeName || storeData.name || "Unnamed Store";

          const ordersRef = collection(db, "stores", storeDoc.id, "orders");
          const ordersSnapshot = await getDocs(ordersRef);

          let orderCount = ordersSnapshot.size;
          let salesTotal = 0;

          ordersSnapshot.forEach((order) => {
            const orderData = order.data();

            // Try different possible keys for total price
            let price =
              orderData.totalPrice ??
              orderData.total ??
              orderData.amount ??
              0;

            // Convert to number safely (handles strings like "1,200" or "1200.50")
            if (typeof price === "string") {
              price = Number(price.replace(/[^0-9.-]+/g, ""));
            }

            salesTotal += Number(price) || 0;
          });

          storeStats.push({
            id: storeDoc.id,
            name: storeName,
            orders: orderCount,
            sales: salesTotal,
          });
        }

        // Sort by sales descending
        const sortedStores = storeStats
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);

        setTopStores(sortedStores);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Super Admin Dashboard</h1>

      {/* Total Stores */}
      <div className="bg-white shadow p-6 rounded-lg mb-8">
        <h2 className="text-gray-500 text-sm">Total Stores</h2>
        <p className="text-3xl font-bold">{totalStores}</p>
      </div>

      {/* Top Stores */}
      <div className="bg-white shadow p-6 rounded-lg">
        <h2 className="text-lg font-bold mb-4">Top Stores (by Sales)</h2>
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Store Name</th>
              <th className="p-2 border">Orders</th>
              <th className="p-2 border">Sales (Rs)</th>
            </tr>
          </thead>
          <tbody>
            {topStores.map((store) => (
              <tr key={store.id}>
                <td className="p-2 border">{store.name}</td>
                <td className="p-2 border">{store.orders}</td>
                <td className="p-2 border">{store.sales.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
