// src/pages/CategoriesPage.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db, storage } from "../firebase";
import { useStore } from "../context/StoreContext";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const CategoriesPage = () => {
  const { storeId } = useStore();
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch categories
  useEffect(() => {
    if (!storeId) return;

    const unsub = onSnapshot(
      collection(db, "stores", storeId, "categories"),
      (snap) => {
        setCategories(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      }
    );

    return () => unsub();
  }, [storeId]);

  // Add new category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);

    try {
      let imageUrl = "";

      // Upload image if provided
      if (newCategoryImage) {
        const imageRef = ref(
          storage,
          `stores/${storeId}/categories/${Date.now()}-${newCategoryImage.name}`
        );
        await uploadBytes(imageRef, newCategoryImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, "stores", storeId, "categories"), {
        name: newCategoryName,
        image: imageUrl,
        createdAt: serverTimestamp(),
      });

      setNewCategoryName("");
      setNewCategoryImage(null);
    } catch (error) {
      console.error("Error adding category:", error);
    }

    setLoading(false);
  };

  // Delete category
  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?"))
      return;

    try {
      await deleteDoc(doc(db, "stores", storeId, "categories", id));
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Manage Categories</h2>

      {/* Add category form */}
      <form
        onSubmit={handleAddCategory}
        className="mb-6 flex flex-col sm:flex-row gap-4"
      >
        <input
          type="text"
          placeholder="Category name"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="flex-1 p-2 border rounded-lg"
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setNewCategoryImage(e.target.files[0])}
          className="flex-1"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Adding..." : "Add Category"}
        </button>
      </form>

      {/* Categories list */}
      {categories.length === 0 ? (
        <p className="text-gray-500">No categories added yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white shadow-md rounded-xl p-4 flex flex-col items-center"
            >
              {cat.image ? (
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-24 h-24 object-cover rounded-full mb-3"
                />
              ) : (
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-3 text-gray-500">
                  No Image
                </div>
              )}
              <h3 className="text-lg font-semibold">{cat.name}</h3>
              <button
                onClick={() => handleDeleteCategory(cat.id)}
                className="mt-3 text-red-600 text-sm hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
