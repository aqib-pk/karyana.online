import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext'; // ✅ Make sure path is correct
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>     {/* ✅ Wrap LanguageProvider FIRST */}
      <CartProvider>       {/* ✅ Then CartProvider */}
        <App />
      </CartProvider>
    </LanguageProvider>
  </React.StrictMode>
);
