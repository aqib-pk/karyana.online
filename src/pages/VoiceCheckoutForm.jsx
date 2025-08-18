// VoiceCheckoutForm.jsx
import React, { useState, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const VoiceCheckoutForm = ({ storeId }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const recognitionRef = useRef(null);

  const startRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = false;

      recognition.onstart = () => setRecording(true);
      recognition.onend = () => setRecording(false);
      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setVoiceTranscript(text);
      };

      recognitionRef.current = recognition;
    }

    recognitionRef.current.start();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !phone || !address || !voiceTranscript) {
      alert("Please fill all fields and record your order!");
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, "stores", storeId, "orders"), {
        type: "voice",
        customerName: name,
        customerPhone: phone,
        customerAddress: address,
        voiceOrder: voiceTranscript,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      alert("Order submitted successfully!");
      setName("");
      setPhone("");
      setAddress("");
      setVoiceTranscript("");
    } catch (err) {
      console.error("Failed to submit order:", err);
      alert("Failed to submit order. Try again!");
    }

    setSubmitting(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4">Voice Order Checkout</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 border rounded-md"
        />
        <input
          type="tel"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="p-2 border rounded-md"
        />
        <textarea
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="p-2 border rounded-md"
        />
        <div className="flex flex-col items-start">
          <button
            type="button"
            onClick={startRecording}
            className={`px-4 py-2 rounded-md text-white ${
              recording ? "bg-red-500 animate-pulse" : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {recording ? "Recording..." : "Record Voice Order"}
          </button>
          {voiceTranscript && (
            <p className="mt-2 text-gray-700">You said: "{voiceTranscript}"</p>
          )}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className={`px-4 py-2 rounded-md text-white ${
            submitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {submitting ? "Submitting..." : "Submit Order"}
        </button>
      </form>
    </div>
  );
};

export default VoiceCheckoutForm;
