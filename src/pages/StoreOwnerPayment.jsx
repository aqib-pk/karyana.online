import React, { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";

const StoreOwnerPayment = () => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStore = async () => {
      setLoading(true);
      setError("");
      try {
        const user = auth.currentUser;
        if (!user) {
          setError("Not logged in");
          setLoading(false);
          return;
        }

        // Find store doc for current logged-in user
        const storesRef = collection(db, "stores");
        const q = query(storesRef, where("storeOwnerId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setError("Store data not found");
          setLoading(false);
          return;
        }

        // Assuming one store per user
        const storeData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
        setStore(storeData);

        // Listen for realtime updates on store doc for subscriptionStatus changes
        const storeRef = doc(db, "stores", storeData.id);
        const unsubscribe = onSnapshot(storeRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setStore((prev) => ({ ...prev, ...data }));

            if (data.subscriptionStatus === "active") {
              setMessage("Your payment has been approved. Your subscription is now active.");
            } else if (data.subscriptionStatus === "pending_verification") {
              setMessage("Your payment is pending verification.");
            } else if (data.subscriptionStatus === "rejected") {
              setMessage("Your payment was rejected. Please contact support.");
            } else {
              setMessage("");
            }
          }
        });

        setLoading(false);

        // Cleanup listener on unmount
        return () => unsubscribe();
      } catch (err) {
        console.error(err);
        setError("Failed to fetch store data");
        setLoading(false);
      }
    };

    fetchStore();
  }, []);

  const handleFileChange = (e) => {
    setScreenshotFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!screenshotFile) {
      alert("Please upload payment screenshot");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      // Upload screenshot to Firebase Storage
      const storageRef = ref(storage, `payment_screenshots/${store.id}_${Date.now()}`);
      await uploadBytes(storageRef, screenshotFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Update store doc with payment proof and set subscriptionStatus to "pending_verification"
      await updateDoc(doc(db, "stores", store.id), {
        paymentProofUrl: downloadURL,
        subscriptionStatus: "pending_verification",
      });

      setMessage("Payment screenshot uploaded successfully! Awaiting verification.");
      setScreenshotFile(null);
    } catch (err) {
      console.error(err);
      setError("Failed to upload screenshot, please try again.");
    }

    setUploading(false);
  };

  if (loading) return <p>Loading store info...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Complete Your Payment</h2>
      <p className="mb-4">
        Please pay ₨ <strong>{store.subscriptionPrice}</strong> via JazzCash to the number: <strong>03058427519</strong>.
      </p>
      <p className="mb-4 text-sm text-gray-600">
        After payment, upload the payment screenshot below for verification.
      </p>

      {message && (
        <div
          className={`p-3 mb-4 rounded ${
            message.includes("approved")
              ? "bg-green-100 text-green-800"
              : message.includes("pending")
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message}
        </div>
      )}

      {/* Show Login button only if subscription is active */}
      {store?.subscriptionStatus === "active" && (
        <button
          onClick={() => navigate("/admin-login")}
          className="mb-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Login Now
        </button>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="border p-2 rounded w-full"
          disabled={store.subscriptionStatus === "active"}
        />
        <button
          type="submit"
          disabled={uploading || store.subscriptionStatus === "active"}
          className="bg-green-600 text-white py-2 rounded w-full hover:bg-green-700 transition disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Submit Payment Proof"}
        </button>
      </form>
    </div>
  );
};

export default StoreOwnerPayment;
