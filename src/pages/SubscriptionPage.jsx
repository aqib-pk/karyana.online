// src/pages/SubscriptionPage.jsx
import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { db, storage } from "../firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const SubscriptionPage = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const auth = getAuth();

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const storesRef = collection(db, "stores");
        const q = query(storesRef, where("storeOwnerId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const storeDoc = querySnapshot.docs[0];
          setSubscription({ id: storeDoc.id, ...storeDoc.data() });
        } else {
          setSubscription(null);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [auth]);

  // Handle payment proof upload
  const handleProofSubmit = async () => {
    if (!file || !subscription) {
      alert("Please upload payment proof!");
      return;
    }

    try {
      setSubmitting(true);
      const storageRef = ref(storage, `paymentProofs/${auth.currentUser.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const storeRef = doc(db, "stores", subscription.id);
      await updateDoc(storeRef, {
        paymentProof: downloadURL,
        subscriptionStatus: "pending_verification",
      });

      alert("Payment proof submitted! Waiting for admin verification.");
      setShowModal(false);
      setFile(null);
    } catch (error) {
      console.error("Error uploading proof:", error);
      alert("Error submitting proof. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading subscription...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Subscription</h1>

      {subscription ? (
        <div>
          <p><strong>Plan:</strong> {subscription.subscriptionPlan}</p>
          <p><strong>Price:</strong> Rs. {subscription.subscriptionPrice}</p>
          <p>
            <strong>Status:</strong>{" "}
            <span
              className={
                subscription.subscriptionStatus === "active"
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {subscription.subscriptionStatus}
            </span>
          </p>
          <p>
            <strong>Start Date:</strong>{" "}
            {subscription.subscriptionStart?.toDate
              ? subscription.subscriptionStart.toDate().toLocaleDateString()
              : new Date(subscription.subscriptionStart).toLocaleDateString()}
          </p>
          <p>
            <strong>Next Billing:</strong>{" "}
            {subscription.subscriptionNextBilling?.toDate
              ? subscription.subscriptionNextBilling.toDate().toLocaleDateString()
              : new Date(subscription.subscriptionNextBilling).toLocaleDateString()}
          </p>

          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Renew Subscription
          </button>
        </div>
      ) : (
        <p>No subscription details found.</p>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <h2 className="text-xl font-bold mb-4">Renew Subscription</h2>
            <p className="mb-2">Please make payment to the JazzCash number below:</p>
            <div className="mb-4 p-3 bg-gray-100 rounded">
              <p><strong>JazzCash Number:</strong> <span className="text-blue-600">+923058427519</span></p>
              <p><strong>Amount:</strong> Rs. {subscription.subscriptionPrice}</p>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files[0])}
              className="mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleProofSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                {submitting ? "Submitting..." : "Submit Proof"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
