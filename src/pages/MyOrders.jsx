// src/pages/MyOrders.jsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useParams } from "react-router-dom";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const MyOrders = () => {
  const { currentUser, customer } = useAuth();
  const { storeSlug } = useParams();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!currentUser || !storeSlug) return;

    const q = query(
      collection(db, "orders"),
      where("customerId", "==", currentUser.uid),
      where("storeSlug", "==", storeSlug)
    );

    const unsub = onSnapshot(q, (snap) => {
      const fetchedOrders = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort orders by createdAt descending (most recent first)
      fetchedOrders.sort((a, b) => {
        const aDate = a.createdAt?.toDate
          ? a.createdAt.toDate()
          : new Date(0);
        const bDate = b.createdAt?.toDate
          ? b.createdAt.toDate()
          : new Date(0);
        return bDate - aDate;
      });

      setOrders(fetchedOrders);
    });

    return () => unsub();
  }, [currentUser, storeSlug]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-green-50">
        <p className="text-gray-600 text-lg">
          Please login to view your orders.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Page header */}
        <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          My Orders{" "}
          {customer?.name && (
            <span className="text-green-600 capitalize">– {customer.name}</span>
          )}
        </h2>

        {/* Orders list */}
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center bg-white shadow-md rounded-xl p-10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-gray-300 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3h18M9 7h6m-9 4h12m-7 4h7M4 21h16"
              />
            </svg>
            <p className="text-gray-500 text-lg">No orders found yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white shadow-md rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-gray-800">
                    Order:{" "}
                    <span className="text-gray-600 font-normal">
                      #{order.id.slice(0, 6)}
                    </span>
                  </h3>
                </div>

                {/* Items */}
                {order.cartItems && order.cartItems.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 mb-2">Items</h4>
                    <ul className="divide-y divide-gray-100">
                      {order.cartItems.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex justify-between py-2 text-sm text-gray-700"
                        >
                          <span>
                            {item.name?.en || item.name}{" "}
                            {item.weight && (
                              <span className="text-gray-400">
                                ({item.weight})
                              </span>
                            )}
                          </span>
                          <span>
                            {item.price} Rs
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Footer */}
                <div className="text-sm text-gray-600">
                  <p className="mb-1">
                    <span className="font-medium">Date:</span>{" "}
                    {order.createdAt?.toDate
                      ? order.createdAt.toDate().toLocaleString()
                      : ""}
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    Total: Rs {order.total?.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
