/* eslint-disable */
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// Helper: get UltraMsg credentials and phone from Firestore for storeId
async function getStoreUltraMsgInfo(storeId) {
  try {
    const storeDoc = await admin.firestore().collection("stores").doc(storeId).get();
    if (!storeDoc.exists) {
      logger.error(`Store ${storeId} not found in Firestore`);
      return null;
    }
    const storeData = storeDoc.data();
    return {
      ultraMsgToken: "8vvteee4po6klwbo",
      ultraMsgInstanceId: "instance140641",
      myPhone: "+923134927600", // Always your number as sender
      storePhone: storeData.storePhone || null,
      storeName: storeData.storeName || "Your Store", // ✅ Add storeName
    };
  } catch (error) {
    logger.error(`Error fetching store data for ${storeId}:`, error.message);
    return null;
  }
}

// WhatsApp sender
async function sendWhatsApp(instanceId, token, to, body) {
  try {
    await axios.post(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
      token,
      to,
      body,
    });
    logger.info(`✅ WhatsApp sent to ${to} from instance ${instanceId}`);
  } catch (error) {
    logger.error(`❌ Error sending WhatsApp to ${to}:`, error.message);
  }
}

// 🛒 Format cart items
function formatItems(cartItems) {
  return (Array.isArray(cartItems) ? cartItems : [])
    .map((item) => {
      const itemName = typeof item.name === "object" ? item.name.en : item.name;
      const qty = Number(item.quantity || 1);
      const weight = item.weight ? ` (${item.weight})` : "";
      const price = Number(item.price || 0); // already total, not per unit

      return `${itemName}${weight}  - Rs ${price}`;
    })
    .join("\n") || "No items listed";
}

function calculateTotalPrice(order) {
  const itemsTotal = (order.cartItems || []).reduce((sum, item) => {
    return sum + Number(item.price || 0); // ✅ no * qty
  }, 0);
  const deliveryCharge = order.deliveryOption === "delivery" ? Number(order.deliveryCharges || 0) : 0;
  return itemsTotal + deliveryCharge;
}

// 🤑 Number formatter
function formatPrice(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/* ----------------------------- TRIGGERS ----------------------------- */

// 📌 Trigger 1: New Order Created
exports.notifyOnNewOrder = onDocumentCreated("stores/{storeId}/orders/{orderId}", async (event) => {
  const orderSnap = event.data;
  if (!orderSnap) return;

  const order = orderSnap.data();
  if (!order) return;

  const storeId = event.params.storeId;
  const ultraMsgInfo = await getStoreUltraMsgInfo(storeId);
  if (!ultraMsgInfo) return;

  const { ultraMsgInstanceId, ultraMsgToken, myPhone, storePhone, storeName } = ultraMsgInfo;

  const itemsText = formatItems(order.cartItems);
  const totalPrice = calculateTotalPrice(order);
  const formattedPrice = formatPrice(totalPrice);
  const statusText = order.status || "Pending";

  const ownerMessage = `🛒 *New Order in ${storeName}*\n\nCustomer: ${order.fullName || "N/A"}\nPhone: ${
    order.phone || "N/A"
  }\nItems:\n${itemsText}\n\n*Total Price: Rs ${formattedPrice}*\nStatus: ${statusText}`;

  const customerMessage = `✅ *Thank you for your order at ${storeName}!*\n\nHi ${
    order.fullName || "Customer"
  }, we have received your order.\nWe’ll notify you once it’s ready.\n\nItems:\n${itemsText}\n\n*Total Price: Rs ${formattedPrice}*\nStatus: ${statusText}`;

  await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, myPhone, ownerMessage);
  if (storePhone) await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, storePhone, ownerMessage);
  if (order.phone) await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, order.phone, customerMessage);
});

// 📌 Trigger 2: Status changes to "Ready"
exports.notifyOnStatusReady = onDocumentUpdated("stores/{storeId}/orders/{orderId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after) return;

  if ((before.status || "").toLowerCase() !== "ready" && (after.status || "").toLowerCase() === "ready") {
    const storeId = event.params.storeId;
    const ultraMsgInfo = await getStoreUltraMsgInfo(storeId);
    if (!ultraMsgInfo) return;

    const { ultraMsgInstanceId, ultraMsgToken, myPhone, storePhone, storeName } = ultraMsgInfo;

    const itemsText = formatItems(after.cartItems);
    const totalPrice = calculateTotalPrice(after);
    const formattedPrice = formatPrice(totalPrice);

    const message = `📢 *Order Ready at ${storeName}*\n\nHi ${
      after.fullName || "Customer"
    }, your order is now ready.\n\nItems:\n${itemsText}\n\n*Total Price: Rs ${formattedPrice}*\nStatus: Ready ✅`;

    if (after.phone) await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, after.phone, message);
    if (storePhone) await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, storePhone, message);
    await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, myPhone, message);
  }
});

// 📌 Trigger 3: Status changes to "Shipped"
exports.notifyOnStatusShipped = onDocumentUpdated("stores/{storeId}/orders/{orderId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after) return;

  if (before.status !== "shipped" && after.status === "shipped" && after.deliveryOption === "delivery") {
    const storeId = event.params.storeId;
    const ultraMsgInfo = await getStoreUltraMsgInfo(storeId);
    if (!ultraMsgInfo) return;

    const { ultraMsgInstanceId, ultraMsgToken, storeName } = ultraMsgInfo;

    const itemsText = formatItems(after.cartItems);
    const totalPrice = calculateTotalPrice(after);
    const formattedPrice = formatPrice(totalPrice);

    const message = `📦 *Order Shipped from ${storeName}*\n\nHi ${
      after.fullName || "Customer"
    }, your order is on its way.\n\nItems:\n${itemsText}\n\n*Total Price: Rs ${formattedPrice}*\nStatus: Shipped 🚚`;

    if (after.phone) await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, after.phone, message);
  }
});

// 📌 Trigger 4: New Offline Order Created
exports.notifyOnNewOfflineOrder = onDocumentCreated("stores/{storeId}/offlineOrders/{orderId}", async (event) => {
  const orderSnap = event.data;
  if (!orderSnap) return;

  const order = orderSnap.data();
  if (!order) return;

  const storeId = event.params.storeId;
  const ultraMsgInfo = await getStoreUltraMsgInfo(storeId);
  if (!ultraMsgInfo) return;

  const { ultraMsgInstanceId, ultraMsgToken, myPhone, storePhone, storeName } = ultraMsgInfo;

  const items = order.items || [];
  const itemsText = formatItems(items);
  const totalPrice = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const formattedPrice = formatPrice(totalPrice);
  const statusText = order.status || "offline";

  const ownerMessage = `🛒 *New Offline Order in ${storeName}*\n\nCustomer: ${
    order.customerName || "N/A"
  }\nPhone: ${order.customerPhone || "N/A"}\nItems:\n${itemsText}\n\n*Total Price: Rs ${formattedPrice}*\nStatus: ${statusText}`;

  const customerMessage = `✅ *Thank you for shopping at ${storeName}!*\n\nHi ${
    order.customerName || "Customer"
  }, Here are your ordered items.\n\nItems:\n${itemsText}\n\n*Total Price: Rs ${formattedPrice}*\nStatus: ${statusText}`;

  await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, myPhone, ownerMessage);
  if (storePhone) await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, storePhone, ownerMessage);
  if (order.customerPhone) await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, order.customerPhone, customerMessage);
});
