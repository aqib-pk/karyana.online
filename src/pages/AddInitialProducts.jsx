// src/pages/AddInitialProducts.jsx
import React from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

const dummyProducts = [
  { name: "Milk", weight: "1L", price: 120 },
  { name: "Bread", weight: "500g", price: 80 },
  { name: "Eggs", weight: "12 pcs", price: 200 },
  { name: "Rice", weight: "5kg", price: 900 },
  { name: "Sugar", weight: "1kg", price: 150 },
];

const AddInitialProducts = () => {
  const handleAddProducts = async () => {
    try {
      for (const product of dummyProducts) {
        await addDoc(collection(db, "products"), product);
      }
      alert("Products added successfully!");
    } catch (error) {
      console.error("Error adding products:", error);
      alert("Something went wrong.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📦 Add Initial Products</h1>
      <button
        onClick={handleAddProducts}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Add Products
      </button>
    </div>
  );
};

export default AddInitialProducts;
