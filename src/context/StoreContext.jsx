import React, { createContext, useContext } from "react";

const StoreContext = createContext(null);

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ storeId, children }) => (
  <StoreContext.Provider value={{ storeId }}>
    {children}
  </StoreContext.Provider>
);
