// src/components/ProductListing.jsx
import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import FloatingCart from "./FloatingCart";
import { useLanguage } from "../context/LanguageContext";
import { translations } from "../locales/translations";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // ✅ Auth context
import toast, { Toaster } from "react-hot-toast"; // ✅ Toast

// --- LanguageSwitcher remains unchanged ---
const LanguageSwitcher = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="text-sm text-blue-600 underline float-right"
    >
      {language === "en" ? "اردو" : "English"}
    </button>
  );
};

// --- ProductCard with toast ---
const ProductCard = ({ product }) => {
  const { language } = useLanguage();
  const t = translations[language];
  const { addToCart } = useCart();

  // Weight/Volume state
  const [selectedKg, setSelectedKg] = useState(1);
  const [selectedGram, setSelectedGram] = useState(0);
  const [selectedLiters, setSelectedLiters] = useState(1);
  const [selectedMl, setSelectedMl] = useState(0);

  // Quantity state (for pieces & dozens)
  const [selectedQty, setSelectedQty] = useState(1);

  let calculatedPrice = 0;
  let displayWeight = "";

  if (product.unit === "Kg") {
    const totalGrams = selectedKg * 1000 + selectedGram;
    calculatedPrice = totalGrams
      ? Math.round((product.price / 1000) * Number(totalGrams))
      : 0;
    displayWeight = `${selectedKg}kg${selectedGram > 0 ? ` + ${selectedGram}g` : ""}`;
  } else if (product.unit === "Liters") {
    const totalMl = selectedLiters * 1000 + selectedMl;
    calculatedPrice = totalMl
      ? Math.round((product.price / 1000) * Number(totalMl))
      : 0;
    displayWeight = `${selectedLiters}L${selectedMl > 0 ? ` + ${selectedMl}ml` : ""}`;
  } else if (product.unit === "Pieces") {
    calculatedPrice = product.price * selectedQty;
    displayWeight = `${selectedQty} Piece${selectedQty > 1 ? "s" : ""}`;
  } else if (product.unit === "Dozens") {
    calculatedPrice = product.price * selectedQty; // price stored per dozen in DB
    displayWeight = `${selectedQty} Dozen${selectedQty > 1 ? "s" : ""}`;
  }

  const handleAddToCart = () => {
    if (calculatedPrice === 0) {
      alert("Please select a valid quantity");
      return;
    }

    let finalQuantity = 1;

    if (product.unit === "Kg") {
      finalQuantity = (selectedKg * 1000 + selectedGram) / 1000; // convert to kg
    } else if (product.unit === "Liters") {
      finalQuantity = (selectedLiters * 1000 + selectedMl) / 1000; // convert to L
    } else if (product.unit === "Pieces" || product.unit === "Dozens") {
      finalQuantity = selectedQty;
    }

    addToCart({
      ...product,
      name: {
        en: product.name?.[language] || product.name,
        ur: product.name?.[language] || product.name,
      },
      subcategory: product.subcategory?.[language] || "",
      price: calculatedPrice,   // ✅ total price
      basePrice: product.price, // ✅ per unit base price
      quantity: finalQuantity,  // ✅ now correct for Kg, L, Pieces, Dozens
      weight: displayWeight,    // readable string
    });

    // ✅ Toast notification
    toast.success(`${product.name?.[language] || product.name} added to cart!`, {
      duration: 2000,
    });
  };

  const imageUrl =
    product.imageUrl && product.imageUrl.trim() !== ""
      ? product.imageUrl
      : product.image && product.image.trim() !== ""
      ? product.image
      : `/default-images/${product.category?.toLowerCase() || "default"}.jpg`;

  const isOutOfStock = !product.inventory || product.inventory <= 0;

  return (
    <div className="bg-white rounded-2xl shadow hover:shadow-lg transition duration-300 w-full max-w-xs relative">
      {isOutOfStock && (
        <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
          Out of Stock
        </div>
      )}
      <img
        src={imageUrl}
        alt={product.name?.[language] || product.name}
        className="w-full h-48 object-cover rounded-t-2xl"
        onError={(e) => {
          e.target.src = "/default-images/default.jpg";
        }}
      />
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800">
          {product.name?.[language] || product.name}
        </h2>
        <p className="text-sm text-gray-500 mb-1">
          {product.subcategory?.[language] || ""}
        </p>

        {/* Dynamic dropdowns based on unit */}
        {product.unit === "Kg" && (
          <div className="flex gap-2 mb-2">
            <select
              value={selectedKg}
              onChange={(e) => setSelectedKg(Number(e.target.value))}
              className="p-1 border rounded-md text-sm w-full"
            >
              {Array.from({ length: 21 }, (_, i) => (
                <option key={i} value={i}>
                  {i} kg
                </option>
              ))}
            </select>

            <select
              value={selectedGram}
              onChange={(e) => setSelectedGram(Number(e.target.value))}
              className="p-1 border rounded-md text-sm w-full"
            >
              {[0, 100, 200, 250, 300, 400, 500, 600, 700, 750, 800, 900].map((g) => (
                <option key={g} value={g}>
                  {g} g
                </option>
              ))}
            </select>
          </div>
        )}

        {product.unit === "Liters" && (
          <div className="flex gap-2 mb-2">
            <select
              value={selectedLiters}
              onChange={(e) => setSelectedLiters(Number(e.target.value))}
              className="p-1 border rounded-md text-sm w-full"
            >
              {Array.from({ length: 11 }, (_, i) => (
                <option key={i} value={i}>
                  {i} L
                </option>
              ))}
            </select>

            <select
              value={selectedMl}
              onChange={(e) => setSelectedMl(Number(e.target.value))}
              className="p-1 border rounded-md text-sm w-full"
            >
              {product.category === "Dairy"
                ? [0, 250, 500].map((ml) => (
                    <option key={ml} value={ml}>
                      {ml} ml
                    </option>
                  ))
                : [0, 100, 200, 250, 300, 400, 500, 600, 700, 750, 800, 900].map((ml) => (
                    <option key={ml} value={ml}>
                      {ml} ml
                    </option>
                  ))}
            </select>
          </div>
        )}

        {(product.unit === "Pieces" || product.unit === "Dozens") && (
          <div className="mb-2">
            <select
              value={selectedQty}
              onChange={(e) => setSelectedQty(Number(e.target.value))}
              className="p-1 border rounded-md text-sm w-full"
            >
              {Array.from({ length: 200 }, (_, i) => {
                const qty = i + 1;
                return (
                  <option key={qty} value={qty}>
                    {qty} {product.unit}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <p className="text-xl font-bold text-green-600 mb-3">
          PKR {calculatedPrice}
        </p>

        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || calculatedPrice === 0}
          className={`w-full py-2 rounded-md font-medium text-white ${
            isOutOfStock || calculatedPrice === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {t.addToCart}
        </button>
      </div>

      {/* ✅ Toaster for this card */}
      <Toaster />
    </div>
  );
};

// --- ProductListing remains unchanged ---
const formatPhoneForWhatsapp = (phone) => {
  if (!phone) return "";
  if (phone.startsWith("0")) {
    return "92" + phone.slice(1);
  }
  if (phone.startsWith("+92")) {
    return phone.replace("+", "");
  }
  return phone;
};

const ProductListing = () => {
  const { language } = useLanguage();
  const t = translations[language];
  const { storeSlug } = useParams();
  const { currentUser: user, logout } = useAuth(); // ✅ fixed naming

  const [products, setProducts] = useState([]);
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [loadingHours, setLoadingHours] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [storeName, setStoreName] = useState("My Grocery Store");
  const [storePhone, setStorePhone] = useState("+92 300 1234567");

  // ✅ dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchWorkingHours = async () => {
      try {
        const storesRef = collection(db, "stores");
        const q = query(storesRef, where("storeSlug", "==", storeSlug));
        const storeSnapshot = await getDocs(q);

        if (!storeSnapshot.empty) {
          const storeDoc = storeSnapshot.docs[0];
          const generalDocRef = doc(db, "stores", storeDoc.id, "settings", "general");
          const generalSnap = await getDoc(generalDocRef);

          if (generalSnap.exists()) {
            const data = generalSnap.data();
            setOpenTime(data.openTime || "06:00");
            setCloseTime(data.closeTime || "22:00");
            setStoreName(data.storeName || "My Grocery Store");
            setStorePhone(data.phone || "+92 300 1234567");
          }
        }
      } catch (error) {
        console.error("Error fetching working hours:", error);
      }
      setLoadingHours(false);
    };

    const fetchProductsForStore = async () => {
      try {
        const storesRef = collection(db, "stores");
        const q = query(storesRef, where("storeSlug", "==", storeSlug));
        const storeSnapshot = await getDocs(q);

        if (storeSnapshot.empty) {
          setProducts([]);
          setLoadingProducts(false);
          setError("No store found for this slug.");
          return;
        }

        const storeDoc = storeSnapshot.docs[0];
        const productsRef = collection(db, "stores", storeDoc.id, "products");

        const unsubscribe = onSnapshot(
          productsRef,
          (snapshot) => {
            const productsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setProducts(productsData);
            setLoadingProducts(false);
            setError("");
          },
          (error) => {
            console.error("Error fetching products:", error);
            setError("Failed to load products.");
            setLoadingProducts(false);
          }
        );

        return unsubscribe;
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setError("Failed to load products.");
        setLoadingProducts(false);
      }
    };

    fetchWorkingHours();
    fetchProductsForStore();
  }, [storeSlug]);

  const filteredProducts = products.filter((product) => {
    const productName = product.name?.[language] || product.name || "";
    return productName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    if (!product.category) return acc;
    if (!acc[product.category]) acc[product.category] = [];
    acc[product.category].push(product);
    return acc;
  }, {});

  const categoryOrder = ["Rice", "Daal", "Oils & Ghee"];

  const sortedCategories = Object.keys(groupedProducts).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  const formatTime = (time24) => {
    if (!time24) return "";
    const [hourStr, minStr] = time24.split(":");
    let hour = parseInt(hourStr, 10);
    const min = minStr;
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${min} ${ampm}`;
  };

  const handleScrollToCategory = (category) => {
    const safeId = category.replace(/\s+/g, "-");
    const element = document.getElementById(safeId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loadingProducts) return <div className="p-6">Loading products...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      {!loadingHours && (
        <div className="w-full bg-green-600 py-3">
          <div className="max-w-6xl mx-auto px-4 flex justify-between items-center dp-block-on-mobile">
            <p className="text-left text-white mb-0 text-sm wk-hours">
              🕒 Store Hours: {formatTime(openTime)} – {formatTime(closeTime)}
            </p>
            <div className="flex items-center gap-3 text-white text-sm ml-auto">
              <span className="flex items-center custom-icon"><svg
  xmlns="http://www.w3.org/2000/svg"
  fill="white"
  viewBox="0 0 20 20"
  stroke="none"
  width="20"
  height="20"
>
  <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.07 21 3 13.93 3 5c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.46.57 3.58.11.33.03.7-.24 1.01l-2.21 2.2z" />
</svg> {storePhone}</span>

              {/* ✅ Customer Auth Dropdown */}
              {!user ? (
                <Link
                  to={`/${storeSlug}/login`}
                  className="bg-white text-green-600 px-3 py-1 rounded-md text-sm font-medium"
                >
                  Login / Signup
                </Link>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="bg-white text-green-600 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1"
                  >
                    Hi, {user.displayName || "Customer"} <span>▼</span>
                  </button>

                  {dropdownOpen && (
  <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden animate-fade-in">
    <Link
      to={`/${storeSlug}/my-orders`}
      className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 transition"
      onClick={() => setDropdownOpen(false)}
    >
      My Orders
    </Link>
    <button
      onClick={() => {
        logout();
        setDropdownOpen(false);
      }}
      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition"
    >
      Logout
    </button>
  </div>
)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search input */}
      <div className="max-w-6xl mx-auto px-4 py-4 relative gap-10 flex items-center dp-block-on-mobile">
        <h2 className="font-bold text-4xl text-center">
          <img
            className="max-w-[260px] custom-logo"
            src="../store-logo.png"
            alt="Grocery Store"
          />
        </h2>
        <input
          type="text"
          placeholder={t.searchProducts || "Search products..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-width border border-gray-300 rounded-md px-4 ml-auto max-h-[60px]"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label="Clear search"
            title="Clear search"
            style={{ fontSize: "18px", fontWeight: "bold", color: "red" }}
          >
            &times;
          </button>
        )}
        {storePhone && (
          <a
            href={`https://wa.me/${formatPhoneForWhatsapp(storePhone)}?text=Hello%20I%20want%20to%20order`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 whatsapp-btn rounded-full bg-green-500 text-white hover:bg-green-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.47 3.5 1.37 5.02L2 22l5.12-1.34A9.97 9.97 0 0 0 12.04 22c5.52 0 10-4.48 10-10s-4.48-10-10-10m0 18c-1.56 0-3.08-.4-4.44-1.15l-.32-.18-3.04.8.82-2.96-.2-.34A8.09 8.09 0 0 1 4 12c0-4.42 3.6-8.04 8.04-8.04 4.42 0 8.04 3.6 8.04 8.04s-3.6 8.04-8.04 8.04m4.57-6.08c-.25-.12-1.47-.73-1.7-.82-.23-.08-.4-.12-.57.12-.17.25-.65.82-.8.99-.15.17-.3.19-.55.06-.25-.12-1.05-.39-2-1.25-.74-.66-1.25-1.47-1.4-1.72-.15-.25-.02-.39.1-.51.1-.1.25-.27.37-.4.12-.14.17-.23.25-.38.08-.15.04-.28-.02-.39-.06-.12-.57-1.37-.78-1.88-.2-.49-.4-.42-.57-.43-.15-.01-.32-.01-.5-.01-.17 0-.46.06-.7.33-.23.25-.9.88-.9 2.15 0 1.27.92 2.5 1.05 2.67.12.17 1.8 2.75 4.36 3.85.61.26 1.08.41 1.45.52.61.19 1.16.16 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.18-.48-.3z" />
            </svg>
          </a>
        )}
      </div>

      {/* Banner Section */}
      <div
        className="relative h-64 md:h-80 w-full overflow-hidden mb-6 shadow-md banner-section"
        style={{
          backgroundImage: "url(../banner.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-center text-white px-4">
          <h1 className="text-3xl md:text-5xl font-bold capitalize">{storeName}</h1>
          <p className="mt-2 text-md md:text-xl">
            Freshness Delivered to Your Doorstep
          </p>
        </div>
      </div>

      {/* ✅ Categories Navigation */}
      <div className="mx-auto mt-10 px-4 mb-4 flex items-center">
        <div className="flex flex-wrap gap-2 items-center mr-auto">
          {sortedCategories.map((category) => (
            <button
              key={category}
              onClick={() => handleScrollToCategory(category)}
              className="px-4 py-2 rounded-full bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition"
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="max-w-6xl mx-auto px-4 py-4 text-red-600 font-semibold">
          {error}
        </div>
      )}

      {sortedCategories.map((category) => (
        <div key={category} id={category} className="py-8 px-4">
          <h2 className="text-2xl font-bold mb-4 text-gray-700 border-b border-gray-300 pb-1">
            {category}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 place-items-center">
            {groupedProducts[category].map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      ))}

      <FloatingCart />
    </div>
  );
};

export default ProductListing;
