// src/pages/StoreOwnerSignUp.jsx
import React, { useState } from "react";
import { auth, db } from "../firebase";
import { slugify } from "../utils/slugify";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  addDoc,
  Timestamp,
  getDocs,
  doc,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

const StoreOwnerSignUp = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
    storeName: "",
    storePhone: "",
    ultraMsgInstanceId: "",
    ultraMsgToken: "",
  });

  const [showWhatsAppFields, setShowWhatsAppFields] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const subscriptionPrice = 6000; // fixed monthly fee

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const user = userCredential.user;

      const subscriptionStart = Timestamp.now();

      // Next billing date = 30 days later
      const subscriptionNextBilling = Timestamp.fromDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      );

      const storeData = {
        storeName: form.storeName,
        storeSlug: slugify(form.storeName),
        storePhone: form.storePhone,
        storeEmail: form.email,
        storeOwnerId: user.uid,
        createdAt: subscriptionStart,
        subscriptionPlan: "Monthly",
        subscriptionPrice: subscriptionPrice,
        subscriptionStart: subscriptionStart,
        subscriptionNextBilling: subscriptionNextBilling,
        subscriptionStatus: "pending_payment", // Set to pending_payment on signup
      };

      if (showWhatsAppFields) {
        if (!form.ultraMsgInstanceId || !form.ultraMsgToken) {
          setError("Please fill both UltraMsg Instance ID and Token.");
          setLoading(false);
          return;
        }
        storeData.ultraMsgInstanceId = form.ultraMsgInstanceId;
        storeData.ultraMsgToken = form.ultraMsgToken;
      }

      // Create new store doc
      const storeRef = await addDoc(collection(db, "stores"), storeData);

      // Copy default products into new store's products subcollection
      const defaultProductsSnapshot = await getDocs(
        collection(db, "defaultProducts")
      );

      const batch = writeBatch(db);

      defaultProductsSnapshot.forEach((docSnap) => {
        const productData = docSnap.data();
        const productRef = doc(db, "stores", storeRef.id, "products", docSnap.id);
        batch.set(productRef, productData);
      });

      await batch.commit();

      // Redirect to payment page to complete subscription
      navigate("/store-owner/payment");
    } catch (err) {
      console.error("Sign up error:", err);
      setError(err.message || "Failed to create account");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md max-w-sm w-full space-y-4"
      >
        <h2 className="text-2xl font-bold text-center">Store Owner Sign Up</h2>

        {error && <p className="text-red-500">{error}</p>}

        <input
          type="text"
          name="storeName"
          placeholder="Store Name"
          value={form.storeName}
          onChange={handleChange}
          required
          className="border p-2 rounded w-full"
        />

        <input
          type="text"
          name="storePhone"
          placeholder="Store Phone"
          value={form.storePhone}
          onChange={handleChange}
          required
          className="border p-2 rounded w-full"
        />

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          className="border p-2 rounded w-full"
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
          className="border p-2 rounded w-full"
        />

        <div className="border p-2 rounded w-full bg-gray-100 text-gray-800">
          Monthly Subscription: <strong>₨ {subscriptionPrice}</strong>
        </div>

        <button
          type="button"
          onClick={() => setShowWhatsAppFields((prev) => !prev)}
          className="text-blue-600 underline hover:text-blue-800"
        >
          WhatsApp Integration
        </button>

        {showWhatsAppFields && (
          <div className="space-y-3">
            <input
              type="text"
              name="ultraMsgInstanceId"
              placeholder="UltraMsg Instance ID"
              value={form.ultraMsgInstanceId}
              onChange={handleChange}
              className="border p-2 rounded w-full"
              required={showWhatsAppFields}
            />
            <input
              type="text"
              name="ultraMsgToken"
              placeholder="UltraMsg Token"
              value={form.ultraMsgToken}
              onChange={handleChange}
              className="border p-2 rounded w-full"
              required={showWhatsAppFields}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white py-2 rounded w-full hover:bg-green-700 transition"
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>

        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{" "}
          <Link to="/admin-login" className="text-green-600 hover:underline">
            Log in here
          </Link>
        </p>
      </form>
    </div>
  );
};

export default StoreOwnerSignUp;
