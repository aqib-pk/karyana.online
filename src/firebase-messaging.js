// src/firebase-messaging.js
import { messaging } from "./firebase";
import { getToken, onMessage } from "firebase/messaging";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

/**
 * Request Notification permission + get FCM token
 * Called ONLY from a user action (like button click)
 */
export const requestPermission = async (storeId = "defaultStore") => {
  try {
    // 🔔 Ask user explicitly (must be triggered by click)
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      // ✅ Get token from Firebase Messaging
      const token = await getToken(messaging, {
        vapidKey: "BFpJy1-jCkJ8KTNmnGH3vegLzrN3pTUtQj0ga_qEW0TUU3rqOeySzJMLxyfUWBImuHBtIFKCSaR7F6IcYO7LZv4",
      });

      console.log("✅ FCM Token:", token);

      // ✅ Save token to Firestore under the store collection
      await setDoc(doc(db, "stores", storeId, "tokens", token), { token });

      return token;
    } else {
      console.warn("❌ Notification permission denied by user.");
      return null;
    }
  } catch (err) {
    console.error("🔥 Error getting FCM token:", err);
    return null;
  }
};

/**
 * Foreground listener (runs when app is open in a tab)
 */
onMessage(messaging, (payload) => {
  console.log("📩 Foreground push received:", payload);

  if (payload?.notification) {
    const { title, body } = payload.notification;

    // 🔔 Show browser notification while user is on the app
    new Notification(title || "New Alert", {
      body: body || "You have a new notification.",
      icon: "/logo192.png",
    });
  }
});
