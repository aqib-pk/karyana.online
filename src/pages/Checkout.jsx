import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext"; // ✅ to get currentUser

const Checkout = ({ onClose, storeId: propStoreId }) => {
  const [formData, setFormData] = useState({
    fullName: "",
    address: "",
    phone: "",
    paymentMethod: "cod",
    deliveryOption: "pickup",
  });

  const [deliveryRate, setDeliveryRate] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { cartItems, clearCart } = useCart();
  const { currentUser } = useAuth(); // ✅ get logged-in user

  // ✅ Resolve storeId from prop, localStorage, or URL
  const [storeId, setStoreId] = useState(propStoreId || null);

  useEffect(() => {
    if (!propStoreId) {
      const savedStoreId = localStorage.getItem("storeId");
      if (savedStoreId) {
        setStoreId(savedStoreId);
      } else {
        const match = window.location.pathname.match(/store\/([^/]+)/);
        if (match) {
          setStoreId(match[1]);
          localStorage.setItem("storeId", match[1]);
        }
      }
    }
  }, [propStoreId]);

  // ✅ Fetch delivery rate
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "delivery"));
        if (snap.exists()) {
          setDeliveryRate(snap.data().rate || 0);
        } else {
          setDeliveryRate(0);
        }
      } catch (error) {
        console.error("Error fetching delivery rate:", error);
        setDeliveryRate(0);
      }
    };
    fetchRate();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!storeId) {
      alert("Store information missing. Cannot place order.");
      return;
    }

    if (cartItems.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    function cleanData(obj) {
      if (Array.isArray(obj)) {
        return obj.map(cleanData);
      } else if (obj && typeof obj === "object") {
        const cleaned = {};
        for (const key in obj) {
          cleaned[key] = obj[key] === undefined ? null : cleanData(obj[key]);
        }
        return cleaned;
      }
      return obj;
    }

    try {
      setLoading(true);

      const subtotal = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      const deliveryCharges =
        formData.deliveryOption === "delivery" ? deliveryRate : 0;
      const total = subtotal + deliveryCharges;

      // ✅ Common order data
      const dataToSubmit = {
        ...cleanData(formData),
        cartItems: cleanData(cartItems),
        deliveryCharges,
        total,
        createdAt: Timestamp.now(),
        status: "pending",
        storeId,
      };

      // ✅ Extended order data for top-level `orders`
      const topLevelOrderData = {
        ...dataToSubmit,
        createdAt: serverTimestamp(),
        customerId: currentUser?.uid || null,
        customerName: formData.fullName,
        storeSlug: window.location.pathname.split("/")[1] || null,
      };

      console.log("Submitting order:", topLevelOrderData);

      // 1️⃣ Save to store owner's subcollection
      await addDoc(collection(db, "stores", storeId, "orders"), dataToSubmit);

      // 2️⃣ Save to top-level orders (for customer "My Orders" page)
      await addDoc(collection(db, "orders"), topLevelOrderData);

      // 3️⃣ Update inventory for each product
      for (const item of cartItems) {
        try {
          const productRef = doc(db, "stores", storeId, "products", item.id);
          await updateDoc(productRef, {
            inventory: increment(-item.weightKg),
          });
        } catch (err) {
          console.error(`Failed to update inventory for ${item.name}`, err);
        }
      }

      setShowSuccess(true);
      clearCart();

      setFormData({
        fullName: "",
        address: "",
        phone: "",
        paymentMethod: "cod",
        deliveryOption: "pickup",
      });

      setTimeout(() => {
        setShowSuccess(false);
        if (onClose) onClose();
      }, 2000);
    } catch (error) {
      console.error("Error adding order to Firestore:", error);
      alert("Error submitting order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-center">Checkout</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="fullName"
          placeholder="Full Name"
          value={formData.fullName}
          onChange={handleChange}
          required
          className="w-full border p-2 rounded-md"
          disabled={loading}
        />
        <textarea
          name="address"
          placeholder="Address"
          value={formData.address}
          onChange={handleChange}
          required
          className="w-full border p-2 rounded-md"
          disabled={loading}
        />
        <input
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          required
          pattern="^(\+92|0)?3\d{9}$"
          className="w-full border p-2 rounded-md"
          disabled={loading}
        />

        <select
          name="deliveryOption"
          value={formData.deliveryOption}
          onChange={handleChange}
          className="w-full border p-2 rounded-md"
          disabled={loading}
        >
          <option value="pickup">Pickup (Free)</option>
          <option value="delivery">
            Home Delivery (+PKR {deliveryRate !== null ? deliveryRate : "..."})
          </option>
        </select>

        <select
          name="paymentMethod"
          value={formData.paymentMethod}
          onChange={handleChange}
          className="w-full border p-2 rounded-md"
          disabled={loading}
        >
          <option value="cod">Cash on Delivery</option>
          <option value="bank">Bank Transfer</option>
          <option value="easypaisa">Easypaisa / JazzCash</option>
        </select>

        <button
          type="submit"
          disabled={deliveryRate === null || loading}
          className={`w-full py-2 rounded-md font-semibold transition ${
            deliveryRate === null || loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin inline-block w-5 h-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
              Placing Order...
            </>
          ) : (
            "Confirm Order"
          )}
        </button>
      </form>

      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm w-full">
            <h2 className="text-xl font-bold text-green-600 mb-2">
              🎉 Order Placed!
            </h2>
            <p className="text-gray-700 mb-4">
              Thank you! Your order has been successfully placed.
            </p>
            <button
              onClick={() => {
                setShowSuccess(false);
                if (onClose) onClose();
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
