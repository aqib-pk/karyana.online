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
      ultraMsgToken: storeData.ultraMsgToken,
      ultraMsgInstanceId: storeData.ultraMsgInstanceId,
      storePhone: storeData.storePhone,
    };
  } catch (error) {
    logger.error(`Error fetching store data for ${storeId}:`, error.message);
    return null;
  }
}

// Modified sendWhatsApp to accept dynamic token and instanceId
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

// 🛒 Format cart items (each on new line, no quantity)
function formatItems(cartItems) {
  return (Array.isArray(cartItems) ? cartItems : [])
    .map((item) => {
      const itemName = typeof item.name === "object" ? item.name.en : item.name;
      const weight = item.weight ? ` (${item.weight})` : "";
      return `${itemName}${weight}`;
    })
    .join("\n") || "No items listed";
}

// 💰 Calculate total price (including delivery if applicable)
function calculateTotalPrice(order) {
  const itemsTotal = (order.cartItems || []).reduce((sum, item) => sum + Number(item.price || 0), 0);
  const deliveryCharge = order.deliveryOption === "delivery" ? Number(order.deliveryCharges || 0) : 0;
  return itemsTotal + deliveryCharge;
}

// 🤑 Format number with commas for thousands
function formatPrice(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 📌 Trigger 1: New Order Created
exports.notifyOnNewOrder = onDocumentCreated("stores/{storeId}/orders/{orderId}", async (event) => {
  const orderSnap = event.data;
  if (!orderSnap) return;

  const order = orderSnap.data();
  if (!order) return;

  const storeId = event.params.storeId;
  const ultraMsgInfo = await getStoreUltraMsgInfo(storeId);
  if (!ultraMsgInfo) return;

  const { ultraMsgInstanceId, ultraMsgToken, storePhone } = ultraMsgInfo;

  logger.info(`New order in store ${storeId}:`, order);

  const itemsText = formatItems(order.cartItems);
  const totalPrice = calculateTotalPrice(order);
  const formattedPrice = formatPrice(totalPrice);
  const statusText = order.status || "Pending";

  // Store owner message
  const ownerMessage = `🛒 *New Order Received*\n\nCustomer: ${order.fullName || "N/A"}\nPhone: ${
    order.phone || "N/A"
  }\nItems:\n${itemsText}\n\n*Total Price: Rs ${formattedPrice}*\nStatus: ${statusText}`;

  // Customer message
  const customerMessage = `✅ *Thank you for your order!*\n\nHi ${
    order.fullName || "Customer"
  }, we have received your order.\nWe’ll notify you once it’s ready.\n\nItems:\n${itemsText}\n\n*Total Price: Rs ${formattedPrice}*\nStatus: ${statusText}`;

  await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, storePhone, ownerMessage);
  if (order.phone) await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, order.phone, customerMessage);
});

// 📌 Trigger 2: Status changes to "Ready"
exports.notifyOnStatusReady = onDocumentUpdated("stores/{storeId}/orders/{orderId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after) return;

  if (before.status !== "ready" && after.status === "ready") {
    const storeId = event.params.storeId;
    const ultraMsgInfo = await getStoreUltraMsgInfo(storeId);
    if (!ultraMsgInfo) return;

    const { ultraMsgInstanceId, ultraMsgToken, storePhone } = ultraMsgInfo;

    logger.info(`Order ${event.params.orderId} in store ${storeId} is ready.`);

    const itemsText = formatItems(after.cartItems);
    const totalPrice = calculateTotalPrice(after);
    const formattedPrice = formatPrice(totalPrice);

    const message = `📢 *Your order is ready for pickup!*\n\nHi ${
      after.fullName || "Customer"
    }, your order is now ready.\n\nItems:\n${itemsText}\n\n*Total Price: Rs ${formattedPrice}*\nStatus: Ready ✅`;

    // Send only to customer, skip if customer phone is same as store owner phone
    if (after.phone && after.phone !== storePhone) {
      await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, after.phone, message);
    }
  }
});

// 📌 Trigger 3: Status changes to "Shipped" (home delivery only)
exports.notifyOnStatusShipped = onDocumentUpdated("stores/{storeId}/orders/{orderId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after) return;

  if (before.status !== "shipped" && after.status === "shipped") {
    if (after.deliveryOption === "delivery") {
      const storeId = event.params.storeId;
      const ultraMsgInfo = await getStoreUltraMsgInfo(storeId);
      if (!ultraMsgInfo) return;

      const { ultraMsgInstanceId, ultraMsgToken } = ultraMsgInfo;

      logger.info(`Order ${event.params.orderId} in store ${storeId} has shipped.`);

      const itemsText = formatItems(after.cartItems);
      const totalPrice = calculateTotalPrice(after);
      const formattedPrice = formatPrice(totalPrice);

      const message = `📦 *Your order has been shipped!*\n\nHi ${
        after.fullName || "Customer"
      }, your order is on its way.\n\nItems:\n${itemsText}\n\n*Total Price: Rs ${formattedPrice}*\nStatus: Shipped 🚚`;

      if (after.phone) await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, after.phone, message);
    }
  }
});
