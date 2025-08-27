import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

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
  setCartItems((prev) => {
    const existingIndex = prev.findIndex(
      (item) => item.id === product.id
    );

    if (existingIndex !== -1) {
      const updatedItems = [...prev];
      const existing = updatedItems[existingIndex];

      updatedItems[existingIndex] = {
        ...existing,
        quantity: existing.quantity + product.quantity,
        price: parseFloat(
          ((existing.quantity + product.quantity) * existing.basePrice).toFixed(2)
        ),
        // Update weight string for display
        weight: `${existing.quantity + product.quantity} ${product.unit}`
      };

      return updatedItems;
    }

    // New item
    return [
      ...prev,
      {
        ...product,
        price: parseFloat((product.quantity * product.basePrice).toFixed(2)),
      },
    ];
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
