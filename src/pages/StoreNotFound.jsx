// src/pages/StoreNotFound.jsx
import React from "react";
import { Link } from "react-router-dom";

const StoreNotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <img
        src="/store-logo.png"
        alt="Logo"
        className="mb-6 custom-logo"
      />
      <h1 className="text-2xl font-bold text-gray-800 mb-2 mt-5">Store Not Found</h1>
      <p className="text-gray-600 mb-6 text-center">
        The store you are looking for does not exist.  
        Please check the link or go back to the homepage.
      </p>
      <Link
        to="/"
        className="px-5 py-2 rounded-xl bg-green-600 text-white font-medium shadow hover:bg-green-700 transition"
      >
        Back to Homepage
      </Link>
    </div>
  );
};

export default StoreNotFound;
