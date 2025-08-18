// /* eslint-disable */ // <-- disable linting if you don’t care about style

// const admin = require("firebase-admin");

// /**
//  * Send a push notification to a specific device
//  * @param {string} token - The FCM token of the target device
//  * @param {string} title - Notification title
//  * @param {string} body - Notification body
//  */
// const sendPushNotification = async (token, title, body) => {
//   try {
//     const message = {
//       notification: { title, body },
//       token,
//     };

//     const response = await admin.messaging().send(message);
//     console.log("✅ Notification sent:", response);
//     return response;
//   } catch (error) {
//     console.error("❌ Error sending notification:", error);
//     throw error;
//   }
// };

// module.exports = { sendPushNotification };
