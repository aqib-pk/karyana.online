// src/pages/AdminCopyProducts.jsx
import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

const AdminCopyProducts = () => {
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 🔹 Fetch all stores on mount
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const storesRef = collection(db, "stores");
        const snapshot = await getDocs(storesRef);
        const storeList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setStores(storeList);
      } catch (error) {
        console.error("Error fetching stores:", error);
      }
    };

    fetchStores();
  }, []);

  const handleCopy = async () => {
    if (!selectedStoreId) {
      setMessage("Please select a store.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const productsRef = collection(db, "stores", selectedStoreId, "products");
      const defaultProductsRef = collection(db, "defaultProducts");

      const productsSnapshot = await getDocs(productsRef);
      if (productsSnapshot.empty) {
        setMessage("No products found for this store.");
        setLoading(false);
        return;
      }

      const batch = writeBatch(db);

      productsSnapshot.forEach((productDoc) => {
        const data = productDoc.data();
        const newDocRef = doc(defaultProductsRef); // new random doc id
        batch.set(newDocRef, data);
      });

      await batch.commit();

      setMessage(
        `Copied ${productsSnapshot.size} products from store ${selectedStoreId} to defaultProducts.`
      );
    } catch (err) {
      console.error(err);
      setMessage("Error copying products. Check console for details.");
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">
        Copy Store Products to Default Products
      </h2>

      <select
        value={selectedStoreId}
        onChange={(e) => setSelectedStoreId(e.target.value)}
        className="border p-2 rounded w-full mb-4"
      >
        <option value="">Select a store</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name || store.id}
          </option>
        ))}
      </select>

      <button
        onClick={handleCopy}
        disabled={loading}
        className="bg-blue-600 text-white py-2 rounded w-full hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? "Copying..." : "Copy Products"}
      </button>

      {message && (
        <p
          className={`mt-4 ${
            message.includes("Error") ? "text-red-600" : "text-green-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default AdminCopyProducts;
