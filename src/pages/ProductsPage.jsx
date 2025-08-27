// src/pages/ProductsPage.jsx
import React, { useEffect, useState } from "react";
import { auth, db, storage } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ProductsPage = () => {
  const [storeId, setStoreId] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [newProduct, setNewProduct] = useState({
    name: "",
    weight: "",
    price: "",
    category: "",
    inventory: 0, // 🔹 NEW FIELD
    imageFile: null,
  });

  const [editingProductId, setEditingProductId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    weight: "",
    price: "",
    category: "",
    inventory: 0, // 🔹 NEW FIELD
    imageFile: null,
    imageUrl: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Get store document id for current logged in user
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          setError("User not logged in");
          setLoading(false);
          return;
        }
        const storesRef = collection(db, "stores");
        const q = query(storesRef, where("storeOwnerId", "==", user.uid));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setError("Store not found for this user.");
          setLoading(false);
          return;
        }
        const storeDoc = snapshot.docs[0];
        setStoreId(storeDoc.id);
      } catch (err) {
        console.error("Error fetching store:", err);
        setError("Failed to fetch store.");
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, []);

  // Fetch categories from Firestore
  useEffect(() => {
    if (!storeId) return;

    const fetchCategories = async () => {
      try {
        const categoriesRef = collection(db, "stores", storeId, "categories");
        const snapshot = await getDocs(categoriesRef);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(data);
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };

    fetchCategories();
  }, [storeId]);

  // Fetch products whenever storeId changes
  useEffect(() => {
    if (!storeId) return;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const productsRef = collection(db, "stores", storeId, "products");
        const snapshot = await getDocs(productsRef);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(data);
        setError("");
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("Failed to fetch products.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [storeId]);

  // Upload image to storage and get URL
  const uploadImageAndGetUrl = async (file, productId) => {
    if (!file) return null;
    const imageRef = ref(storage, `product-images/${productId}-${file.name}`);
    await uploadBytes(imageRef, file);
    const url = await getDownloadURL(imageRef);
    return url;
  };

  // Add new product
  const handleAddProduct = async (e) => {
    e.preventDefault();

    if (!storeId) {
      alert("Store not found for this user.");
      return;
    }

    const { name, weight, price, category, inventory, imageFile } = newProduct;

    if (!name || !weight || !price || !category) {
      alert("Please fill in all fields including category");
      return;
    }

    try {
      const productsRef = collection(db, "stores", storeId, "products");
      const docRef = await addDoc(productsRef, {
        name,
        weight,
        price: Number(price),
        category,
        inventory: Number(inventory), // 🔹 NEW FIELD
        imageUrl: "",
      });

      let imageUrl = "";

      if (imageFile) {
        imageUrl = await uploadImageAndGetUrl(imageFile, docRef.id);
      } else {
        const selectedCategory = categories.find((c) => c.name === category);
        imageUrl = selectedCategory?.imageUrl || "/default-images/default.jpg";
      }

      await updateDoc(doc(db, "stores", storeId, "products", docRef.id), {
        imageUrl,
      });

      setProducts((prev) => [
        ...prev,
        {
          id: docRef.id,
          name,
          weight,
          price: Number(price),
          category,
          inventory: Number(inventory), // 🔹 NEW
          imageUrl,
        },
      ]);

      setNewProduct({
        name: "",
        weight: "",
        price: "",
        category: "",
        inventory: 0, // reset
        imageFile: null,
      });
    } catch (err) {
      console.error("Error adding product:", err);
      alert("Failed to add product.");
    }
  };

  // Editing handlers
  const startEditing = (product) => {
    setEditingProductId(product.id);
    setEditFormData({
      name: product.name,
      weight: product.weight,
      price: product.price,
      category: product.category,
      inventory: product.inventory ?? 0, // 🔹 NEW
      imageFile: null,
      imageUrl: product.imageUrl || "",
    });
  };

  const cancelEditing = () => {
    setEditingProductId(null);
    setEditFormData({
      name: "",
      weight: "",
      price: "",
      category: "",
      inventory: 0,
      imageFile: null,
      imageUrl: "",
    });
  };

  const handleEditChange = (field, value) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async (id) => {
    if (!storeId) {
      alert("Store not found for this user.");
      return;
    }

    const { name, weight, price, category, inventory, imageFile, imageUrl } =
      editFormData;

    if (!name || !weight || !price || !category) {
      alert("Please fill in all fields including category");
      return;
    }

    try {
      let updatedImageUrl = imageUrl;

      if (imageFile) {
        updatedImageUrl = await uploadImageAndGetUrl(imageFile, id);
      }

      await updateDoc(doc(db, "stores", storeId, "products", id), {
        name,
        weight,
        price: Number(price),
        category,
        inventory: Number(inventory), // 🔹 NEW
        imageUrl: updatedImageUrl,
      });

      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                name,
                weight,
                price: Number(price),
                category,
                inventory: Number(inventory),
                imageUrl: updatedImageUrl,
              }
            : p
        )
      );

      cancelEditing();
    } catch (err) {
      console.error("Error updating product:", err);
      alert("Failed to update product.");
    }
  };

  const handleDelete = async (id) => {
    if (!storeId) {
      alert("Store not found for this user.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this product?"))
      return;

    try {
      await deleteDoc(doc(db, "stores", storeId, "products", id));
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Failed to delete product.");
    }
  };

  const handlePriceChange = async (id, newPrice) => {
    if (!storeId) {
      alert("Store not found for this user.");
      return;
    }

    try {
      await updateDoc(doc(db, "stores", storeId, "products", id), {
        price: Number(newPrice),
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, price: Number(newPrice) } : p
        )
      );
    } catch (err) {
      console.error("Error updating price:", err);
      alert("Failed to update price.");
    }
  };

  if (loading) return <p className="p-6 text-center">Loading...</p>;
  if (error) return <p className="p-6 text-center text-red-600">{error}</p>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-center">🛠️ Manage Products</h1>

      {/* Add New Product Form */}
      <form
        onSubmit={handleAddProduct}
        className="flex flex-wrap gap-4 items-end border p-4 rounded-lg bg-gray-50 block-on-mobile"
      >
        <input
          type="text"
          placeholder="Name"
          value={newProduct.name}
          onChange={(e) =>
            setNewProduct({ ...newProduct, name: e.target.value })
          }
          className="border p-2 rounded w-40"
        />
        <input
          type="text"
          placeholder="Weight"
          value={newProduct.weight}
          onChange={(e) =>
            setNewProduct({ ...newProduct, weight: e.target.value })
          }
          className="border p-2 rounded w-40"
        />
        <input
          type="number"
          placeholder="Price (Rs)"
          value={newProduct.price}
          onChange={(e) =>
            setNewProduct({ ...newProduct, price: e.target.value })
          }
          className="border p-2 rounded w-40"
        />
        <input
          type="number"
          placeholder="Inventory"
          value={newProduct.inventory}
          onChange={(e) =>
            setNewProduct({ ...newProduct, inventory: e.target.value })
          }
          className="border p-2 rounded w-40"
        />
        <select
          value={newProduct.category}
          onChange={(e) =>
            setNewProduct({ ...newProduct, category: e.target.value })
          }
          className="border p-2 rounded w-40"
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        <input
          type="file"
          accept="image/*"
          onChange={(e) =>
            setNewProduct({ ...newProduct, imageFile: e.target.files[0] })
          }
          className="border p-1 rounded w-64"
        />

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Product
        </button>
      </form>

      {/* Product Table */}
      {products.length === 0 ? (
  <p>No products found.</p>
) : (
  <div className="overflow-x-auto md:overflow-x-visible">
    <table className="w-full border text-sm md:text-base">
      <thead className="hidden md:table-header-group">
        <tr className="bg-gray-100">
          <th className="p-2 text-left">Image</th>
          <th className="p-2 text-left">Name</th>
          <th className="p-2 text-left">Weight</th>
          <th className="p-2 text-left">Price (Rs)</th>
          <th className="p-2 text-left">Inventory</th>
          <th className="p-2 text-left">Category</th>
          <th className="p-2 text-center">Actions</th>
        </tr>
      </thead>
      <tbody>
        {products.map((prod) => {
          const selectedCategory = categories.find(
            (c) => c.name === prod.category
          );
          const imgSrc =
            prod.imageUrl && prod.imageUrl !== ""
              ? prod.imageUrl
              : selectedCategory?.imageUrl || "/default-images/default.jpg";

          return editingProductId === prod.id ? (
            // EDIT MODE
            <tr
              key={prod.id}
              className="border-t block md:table-row md:border-0 md:mb-0 mb-4"
            >
              {/* Image */}
              <td className="p-2 block md:table-cell">
                <span className="md:hidden font-semibold">Image: </span>
                <img
                  src={
                    editFormData.imageFile
                      ? URL.createObjectURL(editFormData.imageFile)
                      : imgSrc
                  }
                  alt={editFormData.name}
                  className="w-16 h-16 object-cover rounded mb-2"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleEditChange("imageFile", e.target.files[0])
                  }
                  className="mt-1 block"
                />
              </td>

              {/* Name */}
              <td className="p-2 block md:table-cell">
                <span className="md:hidden font-semibold">Name: </span>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => handleEditChange("name", e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                />
              </td>

              {/* Weight */}
              <td className="p-2 block md:table-cell">
                <span className="md:hidden font-semibold">Weight: </span>
                <input
                  type="text"
                  value={editFormData.weight}
                  onChange={(e) => handleEditChange("weight", e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                />
              </td>

              {/* Price */}
              <td className="p-2 block md:table-cell">
                <span className="md:hidden font-semibold">Price: </span>
                <input
                  type="number"
                  value={editFormData.price}
                  onChange={(e) => handleEditChange("price", e.target.value)}
                  className="border rounded px-2 py-1 w-24"
                />
              </td>

              {/* Inventory */}
              <td className="p-2 block md:table-cell">
                <span className="md:hidden font-semibold">Inventory: </span>
                <input
                  type="number"
                  value={editFormData.inventory}
                  onChange={(e) =>
                    handleEditChange("inventory", e.target.value)
                  }
                  className="border rounded px-2 py-1 w-24"
                />
              </td>

              {/* Category */}
              <td className="p-2 block md:table-cell">
                <span className="md:hidden font-semibold">Category: </span>
                <select
                  value={editFormData.category}
                  onChange={(e) =>
                    handleEditChange("category", e.target.value)
                  }
                  className="border rounded px-2 py-1 w-full"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </td>

              {/* Actions */}
              <td className="p-2 flex gap-2 justify-center md:table-cell">
                <button
                  onClick={() => saveEdit(prod.id)}
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={cancelEditing}
                  className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </td>
            </tr>
          ) : (
            // VIEW MODE
            <tr
              key={prod.id}
              className="border-t block md:table-row md:border-0 md:mb-0 mb-4"
            >
              {/* Image */}
              <td className="p-2 flex items-center gap-2 md:table-cell">
                <img
                  src={imgSrc}
                  alt={prod.name}
                  className="w-16 h-16 object-cover rounded"
                />
                {/* Show label only on mobile */}
                <span className="font-semibold md:hidden">{prod.name}</span>
              </td>

              {/* Name */}
              <td className="p-2 block md:table-cell md:whitespace-nowrap">
                <span className="md:hidden font-semibold">Name: </span>
                {prod.name}
              </td>

              {/* Weight */}
              <td className="p-2 block md:table-cell md:whitespace-nowrap">
                <span className="md:hidden font-semibold">Weight: </span>
                {prod.weight}
              </td>

              {/* Price */}
              <td className="p-2 block md:table-cell md:whitespace-nowrap">
                <span className="md:hidden font-semibold">Price: </span>
                <input
                  type="number"
                  value={prod.price}
                  onChange={(e) =>
                    handlePriceChange(prod.id, e.target.value)
                  }
                  className="border rounded px-2 py-1 w-24"
                />
              </td>

              {/* Inventory */}
              <td className="p-2 block md:table-cell md:whitespace-nowrap">
                <span className="md:hidden font-semibold">Inventory: </span>
                {prod.inventory ?? 0}
              </td>

              {/* Category */}
              <td className="p-2 block md:table-cell md:whitespace-nowrap">
                <span className="md:hidden font-semibold">Category: </span>
                {prod.category}
              </td>

              {/* Actions */}
              <td className="p-2 flex gap-2 justify-start md:justify-center md:table-cell order-first md:order-none">
                <button
                  onClick={() => startEditing(prod)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(prod.id)}
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
)}


    </div>
  );
};

export default ProductsPage;
