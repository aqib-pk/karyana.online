// src/pages/PaymentPage.jsx
import React, { useState } from "react";
import { db, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, Timestamp } from "firebase/firestore";

const PaymentPage = ({ storeId }) => {
  const [uploading, setUploading] = useState(false);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [transactionId, setTransactionId] = useState("");
  const [message, setMessage] = useState("");

  const jazzCashNumber = "03XX-XXXXXXX"; // Replace with your JazzCash number

  const handleFileChange = (e) => {
    setScreenshotFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!screenshotFile) {
      setMessage("Please upload payment screenshot");
      return;
    }
    setUploading(true);

    try {
      // Upload screenshot to Firebase Storage
      const storageRef = ref(storage, `payment_proofs/${storeId}/${Date.now()}_${screenshotFile.name}`);
      await uploadBytes(storageRef, screenshotFile);
      const downloadURL = await getDownloadURL(storageRef);

      // Save payment request in Firestore
      await addDoc(collection(db, "paymentRequests"), {
        storeId,
        transactionId: transactionId || null,
        screenshotURL: downloadURL,
        status: "pending", // admin will update this later
        createdAt: Timestamp.now(),
      });

      setMessage("Payment proof submitted successfully. Please wait for verification.");
      setScreenshotFile(null);
      setTransactionId("");
    } catch (error) {
      console.error("Error uploading payment proof:", error);
      setMessage("Failed to submit payment proof. Please try again.");
    }
    setUploading(false);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white shadow rounded mt-6">
      <h2 className="text-xl font-semibold mb-4">Renew Subscription via JazzCash</h2>
      <p className="mb-2">
        Please send the payment to JazzCash number:{" "}
        <span className="font-bold text-lg">{jazzCashNumber}</span>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Transaction ID (optional)</label>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Enter JazzCash transaction ID"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Upload Payment Screenshot *</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>

        <button
          type="submit"
          disabled={uploading}
          className={`w-full py-2 rounded text-white ${uploading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
        >
          {uploading ? "Uploading..." : "Submit Payment Proof"}
        </button>
      </form>

      {message && <p className="mt-4 text-center text-sm">{message}</p>}
    </div>
  );
};

export default PaymentPage;
