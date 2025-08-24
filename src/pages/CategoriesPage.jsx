import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { useParams } from "react-router-dom";

const CategoriesPage = () => {
  const { storeSlug } = useParams();
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    if (!storeSlug) return;
    const unsub = onSnapshot(
      collection(db, "stores", storeSlug, "categories"),
      (snapshot) => {
        setCategories(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      }
    );
    return () => unsub();
  }, [storeSlug]);

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    await addDoc(collection(db, "stores", storeSlug, "categories"), {
      name: newCategory.trim(),
    });
    setNewCategory("");
  };

  const deleteCategory = async (id) => {
    await deleteDoc(doc(db, "stores", storeSlug, "categories", id));
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Manage Categories</h1>

      {/* Add Category Form */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Enter category name"
          className="border p-2 rounded w-full"
        />
        <button
          onClick={addCategory}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Add
        </button>
      </div>

      {/* Category List */}
      <ul className="space-y-2">
        {categories.map((cat) => (
          <li
            key={cat.id}
            className="flex justify-between items-center border p-2 rounded"
          >
            <span>{cat.name}</span>
            <button
              onClick={() => deleteCategory(cat.id)}
              className="bg-red-500 text-white px-2 py-1 rounded"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoriesPage;
