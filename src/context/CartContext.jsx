import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

// Convert weights like "1kg + 250g" into kilograms
const convertToKg = (weightStr) => {
  if (!weightStr) return 0;

  const parts = weightStr.split("+").map((p) => p.trim());
  let totalKg = 0;

  parts.forEach((part) => {
    if (part.endsWith("kg")) {
      totalKg += parseFloat(part.replace("kg", ""));
    } else if (part.endsWith("g")) {
      totalKg += parseFloat(part.replace("g", "")) / 1000;
    }
  });

  return totalKg;
};

// Format KG to a readable format
const formatWeight = (weightKg) => {
  if (weightKg < 1) return `${Math.round(weightKg * 1000)}g`;
  return `${Number.isInteger(weightKg) ? weightKg : weightKg.toFixed(2)}kg`;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    const savedCart = localStorage.getItem("cartItems");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [totalPrice, setTotalPrice] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Update localStorage and total price when cart changes
  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
    const total = cartItems.reduce((sum, item) => sum + item.price, 0);
    setTotalPrice(total);
  }, [cartItems]);

  const addToCart = (product) => {
    const addedWeightKg = convertToKg(product.weight);
    const pricePerKg = product.basePrice || product.price;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);

      if (existingIndex !== -1) {
        const updatedItems = [...prev];
        const existing = updatedItems[existingIndex];

        const newWeightKg = existing.weightKg + addedWeightKg;
        const newWeightStr = formatWeight(newWeightKg);
        const newPrice = Math.round(pricePerKg * newWeightKg);

        updatedItems[existingIndex] = {
          ...existing,
          quantity: existing.quantity + 1,
          weightKg: newWeightKg,
          weight: newWeightStr,
          price: newPrice, // total price based on total weight
        };

        return updatedItems;
      }

      // New item case
      const unitPrice = Math.round(pricePerKg * addedWeightKg);
      const newItem = {
        id: product.id,
        name: product.name,
        image: product.image,
        quantity: 1,
        weightKg: addedWeightKg,
        weight: formatWeight(addedWeightKg),
        pricePerKg,
        price: unitPrice,
      };

      return [...prev, newItem];
    });

    setIsCartOpen(true);
  };

  const removeFromCart = (id, weight) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.id === id && item.weight === weight))
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("cartItems");
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        totalPrice,
        addToCart,
        removeFromCart,
        clearCart,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
