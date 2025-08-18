// // src/services/NotificationService.js
// import { getToken, onMessage } from "firebase/messaging";
// import { db, messaging } from "../firebase"; 
// import { doc, setDoc, getDoc } from "firebase/firestore";
// import { getDeviceId } from "../utils/deviceId"; // ✅ import deviceId util

// // 🔑 FCM VAPID key (for client token generation)
// const vapidKey = "BFpJy1-jCkJ8KTNmnGH3vegLzrN3pTUtQj0ga_qEW0TUU3rqOeySzJMLxyfUWBImuHBtIFKCSaR7F6IcYO7LZv4";

// // 🔑 Replace this with your actual Firebase Server Key
// const FIREBASE_SERVER_KEY = "AAAAXXXXXXXX:APA91bGQx...."; // ⚠️ Replace with real key

// // ✅ Request browser permission & save customer token
// export const requestPermissionAndSaveToken = async () => {
//   try {
//     const permission = await Notification.requestPermission();
//     if (permission === "granted") {
//       const token = await getToken(messaging, { vapidKey });

//       if (token) {
//         console.log("✅ FCM Token:", token);

//         const deviceId = getDeviceId();

//         // Save token in Firestore under "devices/{deviceId}"
//         await setDoc(
//           doc(db, "devices", deviceId),
//           { fcmToken: token },
//           { merge: true }
//         );

//         console.log("✅ Token saved for device:", deviceId);
//       }
//     } else {
//       console.log("❌ Notification permission denied.");
//     }
//   } catch (error) {
//     console.error("⚠️ Error getting permission or token", error);
//   }
// };

// // ✅ Simple function to just return the FCM token
// export const getFcmToken = async () => {
//   try {
//     const token = await getToken(messaging, { vapidKey });
//     if (token) {
//       console.log("✅ Retrieved FCM Token:", token);
//       return token;
//     } else {
//       console.warn("⚠️ No registration token available. Request permission.");
//       return null;
//     }
//   } catch (error) {
//     console.error("❌ Error getting FCM token:", error);
//     return null;
//   }
// };

// // ✅ Send push notification
// export const sendPushNotification = async (deviceId, title, body, clickAction) => {
//   try {
//     const deviceRef = doc(db, "devices", deviceId);
//     const deviceSnap = await getDoc(deviceRef);

//     if (deviceSnap.exists() && deviceSnap.data().fcmToken) {
//       const token = deviceSnap.data().fcmToken;

//       // Send notification via FCM REST API
//       await fetch("https://fcm.googleapis.com/fcm/send", {
//         method: "POST",
//         headers: {
//           Authorization: `key=${FIREBASE_SERVER_KEY}`, // 🔑 Now using real server key
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           to: token,
//           notification: {
//             title,
//             body,
//             click_action: clickAction,
//           },
//         }),
//       });

//       console.log("✅ Push notification sent to device:", deviceId);
//     } else {
//       console.log("⚠️ No FCM token found for device:", deviceId);
//     }
//   } catch (error) {
//     console.error("❌ Error sending notification:", error);
//   }
// };

// // ✅ Foreground messages
// export const onForegroundMessage = () => {
//   onMessage(messaging, (payload) => {
//     console.log("📩 Message received in foreground: ", payload);
//   });
// };

// // ✅ Added this missing export so App.jsx can import it
// export const initializeNotifications = async () => {
//   await requestPermissionAndSaveToken();
//   onForegroundMessage();
// };
