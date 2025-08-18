import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, query, where, doc } from "firebase/firestore";
import { db } from "../firebase";

const StoreAdminDashboard = () => {
  const { storeSlug } = useParams();
  const [orders, setOrders] = useState([]);
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Find store by slug
        const storesRef = collection(db, "stores");
        const storeQuery = query(storesRef, where("storeSlug", "==", storeSlug));
        const storeSnapshot = await getDocs(storeQuery);

        if (storeSnapshot.empty) {
          console.error("Store not found for slug:", storeSlug);
          return;
        }

        const storeDoc = storeSnapshot.docs[0];
        const storeData = storeDoc.data();
        setStoreName(storeData.storeName || storeData.name || "Unnamed Store");

        // Get orders for that store
        const ordersRef = collection(db, "stores", storeDoc.id, "orders");
        const ordersSnapshot = await getDocs(ordersRef);
        const ordersList = ordersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setOrders(ordersList);
      } catch (error) {
        console.error("Error fetching store data:", error);
      }
    };

    fetchData();
  }, [storeSlug]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        {storeName} - Admin Dashboard
      </h1>

      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-2 border">Order ID</th>
              <th className="p-2 border">Customer</th>
              <th className="p-2 border">Total Price</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="p-2 border">{order.id}</td>
                <td className="p-2 border">{order.customerName || "N/A"}</td>
                <td className="p-2 border">{order.totalPrice || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StoreAdminDashboard;
