// src/pages/AdminCopyProducts.jsx
import React, { useState } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";

const AdminCopyProducts = () => {
  const [storeId, setStoreId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCopy = async () => {
    if (!storeId.trim()) {
      setMessage("Please enter a valid Store ID.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const productsRef = collection(db, "stores", storeId, "products");
      const defaultProductsRef = collection(db, "defaultProducts");

      const productsSnapshot = await getDocs(productsRef);
      if (productsSnapshot.empty) {
        setMessage("No products found for this store.");
        setLoading(false);
        return;
      }

      for (const productDoc of productsSnapshot.docs) {
        const data = productDoc.data();
        await addDoc(defaultProductsRef, data);
      }

      setMessage(`Copied ${productsSnapshot.size} products from store ${storeId} to defaultProducts.`);
    } catch (err) {
      console.error(err);
      setMessage("Error copying products. Check console for details.");
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Copy Store Products to Default Products</h2>

      <input
        type="text"
        placeholder="Enter Store ID"
        value={storeId}
        onChange={(e) => setStoreId(e.target.value)}
        className="border p-2 rounded w-full mb-4"
      />

      <button
        onClick={handleCopy}
        disabled={loading}
        className="bg-blue-600 text-white py-2 rounded w-full hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? "Copying..." : "Copy Products"}
      </button>

      {message && (
        <p className={`mt-4 ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
};
  
export default AdminCopyProducts;
