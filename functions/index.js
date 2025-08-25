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
      ultraMsgToken: "bvalkk0hg1rw2hd8",
      ultraMsgInstanceId: "instance138135",
      // Always your number as sender
      myPhone: "+923058427519",
      // Store owner's phone from Firestore
      storePhone: storeData.storePhone || null,
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

// 🛒 Format cart items (with quantity, price, and weight if available)
function formatItems(cartItems) {
  return (Array.isArray(cartItems) ? cartItems : [])
    .map((item) => {
      const itemName = typeof item.name === "object" ? item.name.en : item.name;
      const qty = item.quantity ? ` x${item.quantity}` : "";
      const weight = item.weight ? ` (${item.weight})` : "";
      const price = item.price ? ` - Rs ${item.price}` : "";
      return `${itemName}${weight}${qty}${price}`;
    })
    .join("\n") || "No items listed";
}

// 💰 Calculate total price (including delivery if applicable)
function calculateTotalPrice(order) {
  const itemsTotal = (order.cartItems || []).reduce((sum, item) => {
    const price = Number(item.price || 0);
    const qty = Number(item.quantity || 1);
    return sum + price * qty;
  }, 0);
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

  const { ultraMsgInstanceId, ultraMsgToken, myPhone, storePhone } = ultraMsgInfo;

  logger.info(`New order in store ${storeId}:`, order);

  const itemsText = formatItems(order.cartItems);
  const totalPrice = calculateTotalPrice(order);
  const formattedPrice = formatPrice(totalPrice);
  const statusText = order.status || "Pending";

  // Store owner & admin message
  const ownerMessage = `🛒 *New Order Received*\n\nCustomer: ${order.fullName || "N/A"}\nPhone: ${
    order.phone || "N/A"
  }\nItems:\n${itemsText}\n\n*Total Price: Rs ${formattedPrice}*\nStatus: ${statusText}`;

  // Customer message
  const customerMessage = `✅ *Thank you for your order!*\n\nHi ${
    order.fullName || "Customer"
  }, we have received your order.\nWe’ll notify you once it’s ready.\n\nItems:\n${itemsText}\n\n*Total Price: Rs ${formattedPrice}*\nStatus: ${statusText}`;

  // ✅ Always send New Order notification to your number
  await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, myPhone, ownerMessage);

  // ✅ Also send to store owner if they have a phone number
  if (storePhone) {
    await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, storePhone, ownerMessage);
  }

  // ✅ Send confirmation to customer
  if (order.phone) {
    await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, order.phone, customerMessage);
  }
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

    // Send only to customer, skip if same as store owner
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

function formatItemss(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const itemName = typeof item.name === "object" ? item.name.en : item.name;
      const qty = item.quantity ? ` x${item.quantity}` : "";
      const weight = item.weight ? ` (${item.weight})` : "";
      const price = item.price ? ` - Rs ${item.price}` : "";
      return `${itemName}${weight}${qty}${price}`;
    })
    .join("\n") || "No items listed";
}


// 📌 Trigger 4: New Offline Order Created
exports.notifyOnNewOfflineOrder = onDocumentCreated(
  "stores/{storeId}/offlineOrders/{orderId}",
  async (event) => {
    const orderSnap = event.data;
    if (!orderSnap) return;

    const order = orderSnap.data();
    if (!order) return;

    const storeId = event.params.storeId;
    const ultraMsgInfo = await getStoreUltraMsgInfo(storeId);
    if (!ultraMsgInfo) return;

    const { ultraMsgInstanceId, ultraMsgToken, myPhone, storePhone } = ultraMsgInfo;

    logger.info(`🛒 New offline order in store ${storeId}:`, order);

    // ✅ Use "items" (correct field name from Firestore)
    const items = order.items || [];
    const itemsText = formatItemss(items);

    // ✅ Calculate total price using the correct field
    const totalPrice = items.reduce((sum, item) => sum + (item.price || 0), 0);
    const formattedPrice = formatPrice(totalPrice);

    const statusText = order.status || "offline";

    // Store owner & admin message
    const ownerMessage = `🛒 *New Offline Order Recorded*\n\nCustomer: ${
      order.fullName || "N/A"
    }\nPhone: ${order.customerPhone || "N/A"}\nItems:\n${itemsText}\n\n*Total Price: Rs ${formattedPrice}*\nStatus: ${statusText}`;

    // Customer message
    const customerMessage = `✅ *Thank you for shopping with us!*\n\nHi ${
      order.fullName || "Customer"
    }, your offline order has been recorded.\n\nItems:\n${itemsText}\n\n*Total Price: Rs ${formattedPrice}*\nStatus: ${statusText}`;

    // Send to your number
    await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, myPhone, ownerMessage);

    // Send to store owner
    if (storePhone) {
      await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, storePhone, ownerMessage);
    }

    // Send to customer
    if (order.customerPhone) {
      await sendWhatsApp(ultraMsgInstanceId, ultraMsgToken, order.customerPhone, customerMessage);
    }
  }
);

