// src/components/EnableNotificationsButton.jsx
import React from "react";
import { requestPermission } from "../firebase-messaging";

export default function EnableNotificationsButton({ storeId }) {
  return (
    <button
      className="px-4 py-2 bg-green-600 text-white rounded-lg"
      onClick={() => requestPermission(storeId)}
    >
      Enable Notifications
    </button>
  );
}
