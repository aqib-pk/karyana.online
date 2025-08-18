import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useLanguage } from "../context/LanguageContext";
import { useCart } from "../context/CartContext";

const OfflineOrder = () => {
  const { language } = useLanguage();
  const { clearCart, cartItems, addToCart } = useCart();

  const [products, setProducts] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [loading, setLoading] = useState(true);

  // Fetch products to display/select
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Add product with selected weight to offline cart
  const handleAddToOfflineCart = (product, weightKg) => {
    // weightKg is number, e.g., 1.25 for 1kg + 250g
    const weightStr = weightKg < 1 ? `${weightKg * 1000}g` : `${weightKg}kg`;

    addToCart({
      ...product,
      quantity: 1,
      basePrice: product.price,
      price: Math.round(product.price * weightKg),
      weight: weightStr,
      name: {
        en: product.name?.en || product.name,
        ur: product.name?.ur || product.name,
      }
    });
  };

  // Submit offline order to Firestore
  const handleSubmitOfflineOrder = async () => {
    if (cartItems.length === 0) {
      alert("Add at least one product to place offline order.");
      return;
    }
    try {
      await addDoc(collection(db, "orders"), {
        items: cartItems,
        totalPrice: cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
        customerName,
        paymentMethod,
        status: "offline",
        orderType: "offline",
        createdAt: Timestamp.now(),
      });
      clearCart();
      alert("Offline order placed successfully!");
      setCustomerName("");
      setPaymentMethod("Cash");
    } catch (error) {
      console.error("Failed to place offline order:", error);
      alert("Failed to place offline order.");
    }
  };

  if (loading) return <div>Loading products...</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Create Offline Order</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {products.map(product => (
          <div key={product.id} className="border rounded p-3 shadow">
            <h3 className="font-semibold">{product.name?.[language] || product.name}</h3>
            <p>Price per kg: PKR {product.price}</p>
            {/* Simplify: just add button with fixed weight 1kg for demo */}
            <button
              onClick={() => handleAddToOfflineCart(product, 1)}
              className="mt-2 px-3 py-1 bg-green-600 text-white rounded"
            >
              Add 1 kg
            </button>
            {/* You can extend with weight selector UI */}
          </div>
        ))}
      </div>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Customer Name (optional):</label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="border p-2 rounded w-full"
          placeholder="Enter customer name"
        />
      </div>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Payment Method:</label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="border p-2 rounded w-full"
        >
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <button
        onClick={handleSubmitOfflineOrder}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded font-bold"
      >
        Place Offline Order ({cartItems.length} items)
      </button>
    </div>
  );
};

export default OfflineOrder;
