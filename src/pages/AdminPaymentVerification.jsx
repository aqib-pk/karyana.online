// src/pages/AdminPaymentVerification.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  Timestamp,
} from "firebase/firestore";

const AdminPaymentVerification = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to stores with subscriptionStatus == 'pending_verification'
    const q = query(
      collection(db, "stores"),
      where("subscriptionStatus", "==", "pending_verification")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper to add 1 month to a date
  const addOneMonth = (date) => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + 1);
    return newDate;
  };

  // Approve payment request & extend subscription
  // Approve payment request & extend subscription
const handleApprove = async (request) => {
  try {
    const storeRef = doc(db, "stores", request.id);
    const storeSnap = await getDoc(storeRef);

    if (!storeSnap.exists()) {
      alert("Store data not found");
      return;
    }

    const storeData = storeSnap.data();

    // Decide new start date: today
    const today = new Date();

    // If subscription already active and not expired, extend from current next billing date
    let baseDate = today;
    if (
      storeData.subscriptionNextBilling &&
      storeData.subscriptionNextBilling.toDate &&
      storeData.subscriptionNextBilling.toDate() > today
    ) {
      baseDate = storeData.subscriptionNextBilling.toDate();
    }

    // Add 1 month to base date
    const newNextBillingDate = addOneMonth(baseDate);

    await updateDoc(storeRef, {
      subscriptionStatus: "active",
      subscriptionStart: Timestamp.fromDate(today),
      subscriptionNextBilling: Timestamp.fromDate(newNextBillingDate),
      paymentProofUrl: null, // clear after approval
    });

    alert(
      `✅ Payment approved. Subscription extended until ${newNextBillingDate.toDateString()}`
    );
  } catch (error) {
    console.error("Error approving payment:", error);
    alert("❌ Failed to approve payment. Check console.");
  }
};


  // Reject payment request
  const handleReject = async (request) => {
    try {
      const storeRef = doc(db, "stores", request.id);
      await updateDoc(storeRef, {
        subscriptionStatus: "rejected",
      });
      alert("Payment request rejected");
    } catch (error) {
      console.error("Error rejecting payment:", error);
      alert("Failed to reject payment. Check console.");
    }
  };

  if (loading) return <p>Loading payment requests...</p>;

  if (requests.length === 0) return <p>No pending payment requests found.</p>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Pending Payment Verifications</h1>
      <table className="min-w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-300 p-2">Store Name</th>
            <th className="border border-gray-300 p-2">Store Email</th>
            <th className="border border-gray-300 p-2">Store Phone</th>
            <th className="border border-gray-300 p-2">Screenshot</th>
            <th className="border border-gray-300 p-2">Submitted At</th>
            <th className="border border-gray-300 p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-gray-50">
              <td className="border border-gray-300 p-2">{req.storeName}</td>
              <td className="border border-gray-300 p-2 break-all">{req.storeEmail}</td>
              <td className="border border-gray-300 p-2">{req.storePhone}</td>
              <td className="border border-gray-300 p-2">
                <a
                  href={req.paymentProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  View Screenshot
                </a>
              </td>
              <td className="border border-gray-300 p-2">
                {req.createdAt?.toDate
                  ? req.createdAt.toDate().toLocaleString()
                  : new Date(req.createdAt).toLocaleString()}
              </td>
              <td className="border border-gray-300 p-2 space-x-2">
                <button
                  onClick={() => handleApprove(req)}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(req)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPaymentVerification;
