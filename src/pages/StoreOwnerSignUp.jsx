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
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";

const StoreOwnerSignUp = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
    storeName: "",
    storePhone: "",
    city: "", // ✅ city field stays
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const subscriptionPrice = 5000; // fixed monthly fee
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

      // ✅ Create new store doc
      const storeRef = await addDoc(collection(db, "stores"), storeData);

      // ✅ Save city + logoUrl inside settings.general
      await setDoc(
        doc(db, "stores", storeRef.id, "settings", "general"),
        {
          storeName: form.storeName,
          phone: form.storePhone,
          city: form.city,
          logoUrl: "",
        },
        { merge: true }
      );

      // ✅ Also create user doc in `users` collection
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role: "storeOwner",
        name: form.storeName,
        createdAt: serverTimestamp(),
      });

      // ✅ Copy default products into new store's products subcollection
      const defaultProductsSnapshot = await getDocs(
        collection(db, "defaultProducts")
      );

      const batch = writeBatch(db);
      defaultProductsSnapshot.forEach((docSnap) => {
        const productData = docSnap.data();
        const productRef = doc(
          db,
          "stores",
          storeRef.id,
          "products",
          docSnap.id
        );
        batch.set(productRef, productData);
      });

      await batch.commit();

      // ✅ Redirect to payment page to complete subscription
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
          pattern="^(\+92|0)?3\d{9}$"
          className="border p-2 rounded w-full"
        />

        {/* ✅ City Field */}
        <input
          type="text"
          name="city"
          placeholder="City"
          value={form.city}
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
