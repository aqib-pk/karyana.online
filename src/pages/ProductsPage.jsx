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

const categories = [
  "Rice",
  "Daal",
  "Spices",
  "Oils & Ghee",
  "Dairy",
  "Beverages",
  "Snacks",
  "Cleaning",
];

// Default images for categories (put these images in your public folder under /default-images)
const defaultCategoryImages = {
  Rice: "/default-images/rice.jpg",
  Daal: "/default-images/daal.jpg",
  Spices: "/default-images/spices.jpg",
  "Oils & Ghee": "/default-images/oils-ghee.jpg",
  Dairy: "/default-images/dairy.jpg",
  Beverages: "/default-images/beverages.jpg",
  Snacks: "/default-images/snacks.jpg",
  Cleaning: "/default-images/cleaning.jpg",
  Others: "/default-images/default.jpg",
};

const ProductsPage = () => {
  const [storeId, setStoreId] = useState(null);
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: "",
    weight: "",
    price: "",
    category: "",
    imageFile: null,
  });

  const [editingProductId, setEditingProductId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    weight: "",
    price: "",
    category: "",
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

  // Add new product inside store's products subcollection
  const handleAddProduct = async (e) => {
    e.preventDefault();

    if (!storeId) {
      alert("Store not found for this user.");
      return;
    }

    const { name, weight, price, category, imageFile } = newProduct;

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
        imageUrl: "",
      });

      let imageUrl = "";

      if (imageFile) {
        imageUrl = await uploadImageAndGetUrl(imageFile, docRef.id);
      } else {
        imageUrl =
          defaultCategoryImages[category] || defaultCategoryImages["Others"];
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
          imageUrl,
        },
      ]);

      setNewProduct({
        name: "",
        weight: "",
        price: "",
        category: "",
        imageFile: null,
      });
    } catch (err) {
      console.error("Error adding product:", err);
      alert("Failed to add product.");
    }
  };

  const startEditing = (product) => {
    setEditingProductId(product.id);
    setEditFormData({
      name: product.name,
      weight: product.weight,
      price: product.price,
      category: product.category,
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

    const { name, weight, price, category, imageFile, imageUrl } = editFormData;

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

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?"
    );
    if (!confirmDelete) return;

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

  if (loading) {
    return <p className="p-6 text-center">Loading...</p>;
  }

  if (error) {
    return <p className="p-6 text-center text-red-600">{error}</p>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-center">🛠️ Manage Products</h1>

      {/* Add New Product Form */}
      <form
        onSubmit={handleAddProduct}
        className="flex flex-wrap gap-4 items-end border p-4 rounded-lg bg-gray-50 pd-block"
      >
        {/* inputs same as before */}
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
        <select
          value={newProduct.category}
          onChange={(e) =>
            setNewProduct({ ...newProduct, category: e.target.value })
          }
          className="border p-2 rounded w-40"
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
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
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Product
        </button>
      </form>

      {/* ✅ Responsive Product Table */}
      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Image</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Weight</th>
                <th className="p-2 text-left">Price (Rs)</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((prod) => {
                const imgSrc =
                  prod.imageUrl && prod.imageUrl !== ""
                    ? prod.imageUrl
                    : defaultCategoryImages[prod.category] ||
                      defaultCategoryImages["Others"];

                return editingProductId === prod.id ? (
                  <tr key={prod.id} className="border-t">
                    <td className="p-2">
                      <img
                        src={
                          editFormData.imageFile
                            ? URL.createObjectURL(editFormData.imageFile)
                            : imgSrc
                        }
                        alt={editFormData.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handleEditChange("imageFile", e.target.files[0])
                        }
                        className="mt-2"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) =>
                          handleEditChange("name", e.target.value)
                        }
                        className="border rounded px-2 py-1 w-full"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={editFormData.weight}
                        onChange={(e) =>
                          handleEditChange("weight", e.target.value)
                        }
                        className="border rounded px-2 py-1 w-full"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={editFormData.price}
                        onChange={(e) =>
                          handleEditChange("price", e.target.value)
                        }
                        className="border rounded px-2 py-1 w-24"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={editFormData.category}
                        onChange={(e) =>
                          handleEditChange("category", e.target.value)
                        }
                        className="border rounded px-2 py-1 w-full"
                      >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2 flex gap-2 justify-center">
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
                  <tr key={prod.id} className="border-t">
                    <td className="p-2">
                      <img
                        src={imgSrc}
                        alt={prod.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    </td>
                    <td className="p-2">
                      {typeof prod.name === "object" ? prod.name.en : prod.name}
                    </td>
                    <td className="p-2">{prod.weight}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={prod.price}
                        onChange={(e) =>
                          handlePriceChange(prod.id, e.target.value)
                        }
                        className="border rounded px-2 py-1 w-24"
                      />
                    </td>
                    <td className="p-2">{prod.category}</td>
                    <td className="p-2 flex gap-2 justify-center mt-4">
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
