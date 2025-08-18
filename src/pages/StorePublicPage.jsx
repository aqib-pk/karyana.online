// src/pages/StorePublicPage.jsx
import React from "react";
import { useParams } from "react-router-dom";
import ProductListing from "../components/ProductListing";

const StorePublicPage = () => {
  const { storeSlug } = useParams();

  // Pass storeSlug to ProductListing
  return <ProductListing storeSlug={storeSlug} />;
};

export default StorePublicPage;