// src/pages/OrdersPage.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  doc,
  updateDoc,
  onSnapshot,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const OrdersPage = () => {
  const [storeId, setStoreId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState("");
  const [activeStatus, setActiveStatus] = useState("pending");

  // Fetch storeId of logged-in user
  useEffect(() => {
    const fetchStoreId = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setError("User not logged in");
          setLoadingOrders(false);
          return;
        }

        const storesRef = collection(db, "stores");
        const q = query(storesRef, where("storeOwnerId", "==", user.uid));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("Store not found for this user.");
          setLoadingOrders(false);
          return;
        }

        const storeDoc = snapshot.docs[0];
        setStoreId(storeDoc.id);
      } catch (err) {
        console.error("Error fetching store:", err);
        setError("Failed to fetch store.");
        setLoadingOrders(false);
      }
    };

    fetchStoreId();
  }, []);

  // Fetch orders once storeId is known
  useEffect(() => {
    if (!storeId) return;

    setLoadingOrders(true);
    const ordersRef = collection(db, "stores", storeId, "orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ordersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const statusPriority = {
          pending: 0,
          ready: 1,
          shipped: 2,
          delivered: 3,
          cancelled: 4,
        };

        const sortedOrders = ordersData.sort((a, b) => {
          const aPriority = statusPriority[a.status] ?? 99;
          const bPriority = statusPriority[b.status] ?? 99;
          return aPriority - bPriority;
        });

        setOrders(sortedOrders);
        setLoadingOrders(false);
        setError("");
      },
      (err) => {
        console.error("Failed to fetch orders:", err);
        setError("Failed to load orders.");
        setLoadingOrders(false);
      }
    );

    return () => unsubscribe();
  }, [storeId]);

  // Format phone for WhatsApp URL
  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    return `92${cleaned.replace(/^0/, "")}`;
  };

  // Update order status handler
  const handleStatusChange = async (orderId, newStatus) => {
    if (!storeId) {
      alert("Store not found for this user.");
      return;
    }
    try {
      await updateDoc(doc(db, "stores", storeId, "orders", orderId), {
        status: newStatus,
      });
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("❌ Failed to update order status.");
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "ready":
        return "bg-blue-100 text-blue-700";
      case "shipped":
        return "bg-purple-100 text-purple-700";
      case "delivered":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const capitalize = (text) => text?.charAt(0).toUpperCase() + text?.slice(1);

  const today = new Date();
  const ordersToday = orders.filter((o) => {
    const d = o.createdAt?.toDate?.();
    return (
      d &&
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  });

  const ordersThisMonth = orders.filter((o) => {
    const d = o.createdAt?.toDate?.();
    return (
      d &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  });

  const calcRevenue = (ordersList) =>
    ordersList.reduce((sum, o) => {
      const itemsTotal =
        o.cartItems?.reduce((s, i) => s + Number(i.price || 0), 0) || 0;
      return (
        sum +
        itemsTotal +
        (o.deliveryOption === "delivery" ? Number(o.deliveryCharges || 0) : 0)
      );
    }, 0);

  const filteredOrders = orders.filter(
    (o) => (o.status || "pending") === activeStatus
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-10">
      <h1 className="text-3xl font-bold text-center">📦 Online Orders</h1>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">📅 Orders Today</h3>
          <p className="text-xl font-bold text-green-600">{ordersToday.length}</p>
        </div>
        <div className="bg-white border rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">💰 Revenue Today</h3>
          <p className="text-xl font-bold text-blue-600">Rs {calcRevenue(ordersToday)}</p>
        </div>
        <div className="bg-white border rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">📦 Orders This Month</h3>
          <p className="text-xl font-bold text-purple-600">{ordersThisMonth.length}</p>
        </div>
        <div className="bg-white border rounded-lg shadow p-4">
          <h3 className="text-sm text-gray-500">💰 Revenue This Month</h3>
          <p className="text-xl font-bold text-indigo-600">Rs {calcRevenue(ordersThisMonth)}</p>
        </div>
      </section>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["pending", "ready", "shipped", "delivered", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setActiveStatus(status)}
            className={`px-4 py-1 rounded-full border font-medium text-sm transition ${
              activeStatus === status
                ? "bg-green-600 text-white border-green-600"
                : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
            }`}
          >
            {capitalize(status)}
          </button>
        ))}
      </div>

      {/* Order Management */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">🛒 Recent Orders</h2>
        {loadingOrders ? (
          <p className="text-gray-600">Loading orders...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : filteredOrders.length === 0 ? (
          <p className="text-gray-500">No orders found.</p>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const itemsTotal = order.cartItems?.reduce(
                (sum, item) => sum + Number(item.price || 0),
                0
              );
              const deliveryCharge =
                order.deliveryOption === "delivery"
                  ? Number(order.deliveryCharges || 0)
                  : 0;
              const totalPrice = itemsTotal + deliveryCharge;

              return (
                <div
                  key={order.id}
                  className="border border-gray-300 rounded-lg p-4 shadow-md bg-white"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Left */}
                    <div className="md:w-1/2">
                      <h2 className="font-semibold text-xl text-green-700 mb-2">
                        {order.fullName}
                      </h2>
                      <p>
                        <strong>📞 Phone:</strong> {order.phone}
                      </p>
                      <p>
                        <strong>🏠 Address:</strong> {order.address}
                      </p>
                      <p>
                        <strong>🚚 Delivery Method:</strong>{" "}
                        {order.deliveryOption === "delivery"
                          ? `Home Delivery (${deliveryCharge} Rs)`
                          : "Pickup"}
                      </p>
                      <p>
                        <strong>💳 Payment Method:</strong> {order.paymentMethod}
                      </p>
                      <p>
                        <strong>📅 Ordered At:</strong>{" "}
                        {order.createdAt?.toDate().toLocaleString() || "N/A"}
                      </p>

                      <div className="mt-3">
                        <label className="block font-semibold mb-1">📝 Status:</label>
                        <div className="flex items-center gap-3">
                          <select
                            value={order.status || "pending"}
                            onChange={(e) =>
                              handleStatusChange(order.id, e.target.value)
                            }
                            className="border p-2 rounded w-full md:w-auto"
                          >
                            <option value="pending">Pending</option>
                            <option value="ready">Ready</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${getStatusBadgeClass(
                              order.status
                            )}`}
                          >
                            {capitalize(order.status || "pending")}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-3">
                        <a
                          href={`tel:${order.phone}`}
                          className="bg-blue-600 text-white px-4 py-2 flex rounded hover:bg-blue-700 text-sm font-medium"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          📞 Call
                        </a>
                        <a
                          href={`https://wa.me/+${formatPhoneForWhatsApp(order.phone)}`}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm font-medium"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          💬 WhatsApp
                        </a>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="md:w-1/2">
                      <strong>🧺 Cart Items:</strong>
                      {order.cartItems?.length > 0 ? (
                        <>
                          <ul className="list-disc ml-6 mt-2 text-sm text-gray-700">
                            {order.cartItems.map((item, index) => (
                              <li key={index}>
                                {typeof item.name === "object"
                                  ? item.name.en
                                  : item.name}{" "}
                                ({item.weight}) – {item.price} Rs
                              </li>
                            ))}
                          </ul>
                          {deliveryCharge > 0 && (
                            <p className="mt-1 text-sm font-bold text-gray-600">
                              Delivery Charges: {deliveryCharge} Rs
                            </p>
                          )}
                          <p className="mt-2 border-t pt-2 text-left font-semibold text-green-800">
                            Total: {totalPrice} Rs
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-500 ml-2">No cart items recorded.</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default OrdersPage;
