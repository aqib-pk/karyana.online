import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../locales/translations";
import Checkout from "../pages/Checkout";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useParams } from "react-router-dom";

const FloatingCart = () => {
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    clearCart,
  } = useCart();

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const uniqueItemsCount = cartItems.length;
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

  const { language } = useLanguage();
  const t = translations[language];

  const [showCheckout, setShowCheckout] = useState(false);
  const [storeId, setStoreId] = useState(null);
  const { storeSlug } = useParams();

  // ✅ Animation state
  const [bump, setBump] = useState(false);

  // Trigger bump animation when cartItems change
  useEffect(() => {
    if (cartItems.length === 0) return;

    setBump(true);
    const timer = setTimeout(() => setBump(false), 300); // animation duration
    return () => clearTimeout(timer);
  }, [cartItems]);

  // Fetch storeId
  useEffect(() => {
    const fetchStoreId = async () => {
      try {
        if (!storeSlug) return;
        const storesRef = collection(db, "stores");
        const q = query(storesRef, where("storeSlug", "==", storeSlug));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setStoreId(snapshot.docs[0].id);
        } else {
          console.error("No store found for slug:", storeSlug);
        }
      } catch (error) {
        console.error("Failed to fetch storeId in FloatingCart:", error);
      }
    };
    fetchStoreId();
  }, [storeSlug]);

  return (
    <>
      {/* Floating Cart Icon */}
      <div
        onClick={() => setIsCartOpen(!isCartOpen)}
        className={`fixed bottom-6 right-6 bg-green-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-pointer z-50 transition-transform duration-300 ${
          bump ? "animate-bump" : ""
        }`}
        title="Open Cart"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          className="w-6 h-6"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        {totalItems > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-xs px-2 py-0.5 rounded-full">
            {uniqueItemsCount}
          </span>
        )}
      </div>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed bottom-24 right-6 w-80 bg-white shadow-2xl rounded-xl p-4 z-50 max-h-[60vh] overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold">🛒 {t.cartItems || "Cart Items"}</h2>
            {cartItems.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to clear the cart?")) {
                    clearCart();
                  }
                }}
                className="text-red-500 text-xs font-semibold hover:underline"
              >
                🗑️ {t.clearCart || "Clear Cart"}
              </button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <p className="text-gray-500">{t.emptyCart || "Cart is empty."}</p>
          ) : (
            <>
              <ul className="divide-y">
                {cartItems.map((item) => (
                  <li
                    key={`${item.id}-${item.weight}`}
                    className="py-2 flex justify-between items-center text-sm"
                  >
                    <div className="flex flex-col">
                      <span>
                        {typeof item.name === "object" ? item.name[language] : item.name}
                      </span>
                      <span className="text-xs text-gray-500">{item.weight}</span>
                      <span className="text-xs text-gray-600">{Math.round(item.price)} Rs</span>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id, item.weight)}
                      className="text-red-500 hover:text-red-700 ml-2 text-sm"
                      title="Remove Item"
                    >
                      ❌
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-4 font-semibold text-right text-lg">
                Total: <span className="text-green-600">PKR {Math.round(totalPrice)}</span>
              </div>

              <button
                onClick={() => setShowCheckout(true)}
                className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-semibold transition"
              >
                {t.proceedToCheckout || "Proceed to Checkout"}
              </button>
            </>
          )}
        </div>
      )}

      {/* Checkout Popup Modal */}
      {showCheckout && storeId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-lg relative">
            <button
              onClick={() => setShowCheckout(false)}
              className="absolute top-2 right-4 text-gray-600 hover:text-black text-xl"
              title="Close"
            >
              &times;
            </button>
            <Checkout storeId={storeId} onClose={() => setShowCheckout(false)} />
          </div>
        </div>
      )}

      {/* Bump Animation CSS */}
      <style>
        {`
          @keyframes bump {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
          .animate-bump {
            animation: bump 0.3s ease-out;
          }
        `}
      </style>
    </>
  );
};

export default FloatingCart;