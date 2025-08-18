// src/pages/StoresPage.jsx
import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { slugify } from "../utils/slugify"; // ✅ Import slugify

const StoresPage = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStore, setNewStore] = useState({
    storeName: "",
    storePhone: "",
    storeEmail: "",
    storeOwnerId: "",
    subscriptionStart: "",
    isSuspended: false,
  });

  useEffect(() => {
    const fetchAndUpdateStores = async () => {
      setLoading(true);
      setError("");
      try {
        const storesRef = collection(db, "stores");
        const snapshot = await getDocs(storesRef);

        const updatedStores = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const subscriptionEndDate = data.subscriptionEnd
              ? data.subscriptionEnd.toDate
                ? data.subscriptionEnd.toDate()
                : new Date(data.subscriptionEnd)
              : null;

            const now = new Date();
            const isExpired = subscriptionEndDate && subscriptionEndDate < now;

            if (isExpired && !data.isExpired) {
              await updateDoc(doc(db, "stores", docSnap.id), {
                isExpired: true,
              });
            }

            return {
              id: docSnap.id,
              ...data,
              isExpired,
            };
          })
        );

        updatedStores.sort((a, b) => b.isExpired - a.isExpired);
        setStores(updatedStores);
      } catch (err) {
        console.error("Error fetching stores:", err);
        setError("Failed to load stores.");
      }
      setLoading(false);
    };

    fetchAndUpdateStores();
  }, []);

  const calculateEndDate = (startDate) => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + 1);
    return date;
  };

  const handleAddStore = async () => {
    if (
      !newStore.storeName ||
      !newStore.storePhone ||
      !newStore.storeEmail ||
      !newStore.storeOwnerId ||
      !newStore.subscriptionStart
    ) {
      alert("Please fill in all fields");
      return;
    }

    const startDate = new Date(newStore.subscriptionStart);
    const endDate = calculateEndDate(startDate);

    try {
      await addDoc(collection(db, "stores"), {
        ...newStore,
        storeSlug: slugify(newStore.storeName), // ✅ Save slug
        oldSlugs: [],
        subscriptionStart: Timestamp.fromDate(startDate),
        subscriptionEnd: Timestamp.fromDate(endDate),
        createdAt: new Date(),
        isExpired: false,
      });
      alert("Store added successfully");
      setShowAddForm(false);
      setNewStore({
        storeName: "",
        storePhone: "",
        storeEmail: "",
        storeOwnerId: "",
        subscriptionStart: "",
        isSuspended: false,
      });
    } catch (err) {
      console.error("Error adding store:", err);
    }
  };

  const toggleSuspension = async (storeId, currentStatus) => {
    try {
      await updateDoc(doc(db, "stores", storeId), {
        isSuspended: !currentStatus,
      });
      alert(`Store ${currentStatus ? "activated" : "suspended"}`);
      setStores((prev) =>
        prev.map((store) =>
          store.id === storeId
            ? { ...store, isSuspended: !currentStatus }
            : store
        )
      );
    } catch (err) {
      console.error("Error updating suspension:", err);
    }
  };

  const updateSubscriptionEnd = async (storeId, newEndDate) => {
    const endDate = new Date(newEndDate);
    try {
      await updateDoc(doc(db, "stores", storeId), {
        subscriptionEnd: Timestamp.fromDate(endDate),
        isExpired: endDate < new Date(),
      });
      alert("Subscription end date updated");
      setStores((prev) =>
        prev.map((store) =>
          store.id === storeId
            ? {
                ...store,
                subscriptionEnd: Timestamp.fromDate(endDate),
                isExpired: endDate < new Date(),
              }
            : store
        )
      );
    } catch (err) {
      console.error("Error updating subscription end date:", err);
    }
  };

  const handleNameChange = async (storeId, currentName, newName, currentSlug, oldSlugs) => {
    if (!newName.trim()) return alert("Store name cannot be empty");
    if (newName === currentName) return; // No change

    const newSlug = slugify(newName);

    try {
      await updateDoc(doc(db, "stores", storeId), {
        storeName: newName,
        storeSlug: newSlug,
        oldSlugs: Array.from(new Set([...(oldSlugs || []), currentSlug])),
      });

      alert("Store name updated with slug history");
      setStores((prev) =>
        prev.map((store) =>
          store.id === storeId
            ? { ...store, storeName: newName, storeSlug: newSlug, oldSlugs: [...(oldSlugs || []), currentSlug] }
            : store
        )
      );
    } catch (err) {
      console.error("Error updating store name:", err);
    }
  };

  const formatDateForInput = (timestamp) => {
    if (!timestamp) return "";
    if (timestamp.toDate) {
      return timestamp.toDate().toISOString().split("T")[0];
    }
    return new Date(timestamp).toISOString().split("T")[0];
  };

  if (loading) return <p>Loading stores...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">All Stores</h1>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "Cancel" : "Add Store Owner"}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-100 p-4 mb-4 rounded shadow">
          <h2 className="font-semibold mb-2">Add New Store Owner</h2>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Store Name"
              value={newStore.storeName}
              onChange={(e) =>
                setNewStore({ ...newStore, storeName: e.target.value })
              }
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Phone"
              value={newStore.storePhone}
              onChange={(e) =>
                setNewStore({ ...newStore, storePhone: e.target.value })
              }
              className="border p-2 rounded"
            />
            <input
              type="email"
              placeholder="Email"
              value={newStore.storeEmail}
              onChange={(e) =>
                setNewStore({ ...newStore, storeEmail: e.target.value })
              }
              className="border p-2 rounded"
            />
            <input
              type="text"
              placeholder="Owner ID"
              value={newStore.storeOwnerId}
              onChange={(e) =>
                setNewStore({ ...newStore, storeOwnerId: e.target.value })
              }
              className="border p-2 rounded"
            />
            <input
              type="date"
              value={newStore.subscriptionStart}
              onChange={(e) =>
                setNewStore({
                  ...newStore,
                  subscriptionStart: e.target.value,
                })
              }
              className="border p-2 rounded"
            />
          </div>
          <button
            onClick={handleAddStore}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Save Store
          </button>
        </div>
      )}

      <table className="min-w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="p-3">Store Name</th>
            <th className="p-3">Phone</th>
            <th className="p-3">Email</th>
            <th className="p-3">Owner ID</th>
            <th className="p-3">Subscription Start</th>
            <th className="p-3">Subscription End</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((store) => (
            <tr key={store.id} className="border-t hover:bg-gray-50">
              <td className="p-3">
                <input
                  type="text"
                  defaultValue={store.storeName}
                  onBlur={(e) =>
                    handleNameChange(
                      store.id,
                      store.storeName,
                      e.target.value,
                      store.storeSlug,
                      store.oldSlugs
                    )
                  }
                  className="border p-1 rounded w-full"
                />
              </td>
              <td className="p-3">{store.storePhone}</td>
              <td className="p-3">{store.storeEmail}</td>
              <td className="p-3 break-all">{store.storeOwnerId}</td>
              <td className="p-3">
                <input
                  type="date"
                  value={formatDateForInput(store.subscriptionStart)}
                  readOnly
                  disabled
                  className="border p-1 rounded bg-gray-100 cursor-not-allowed"
                />
              </td>
              <td className="p-3">
                <input
                  type="date"
                  value={formatDateForInput(store.subscriptionEnd)}
                  onChange={(e) =>
                    updateSubscriptionEnd(store.id, e.target.value)
                  }
                  className="border p-1 rounded"
                />
              </td>
              <td className="p-3">
                <span
                  className={`px-2 py-1 rounded-full text-white text-sm font-semibold ${
                    store.isExpired ? "bg-red-500" : "bg-green-500"
                  }`}
                >
                  {store.isExpired ? "Expired" : "Active"}
                </span>
              </td>
              <td className="p-3">
                <button
                  onClick={() =>
                    toggleSuspension(store.id, store.isSuspended)
                  }
                  className={`px-3 py-1 rounded text-white ${
                    store.isSuspended ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  {store.isSuspended ? "Activate" : "Suspend"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StoresPage;
