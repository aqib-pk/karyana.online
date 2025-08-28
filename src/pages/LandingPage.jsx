// src/pages/LandingPage.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import {
  FaStore,
  FaBoxOpen,
  FaShoppingCart,
  FaMoneyBillWave,
  FaWhatsapp,
  FaSearch,
} from "react-icons/fa";

import defaultStoreImage from "/store-img.jpg";

const LandingPage = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadStores = async () => {
      try {
        const snap = await getDocs(collection(db, "stores"));

        const storesData = await Promise.all(
          snap.docs.map(async (storeDoc) => {
            const storeData = { id: storeDoc.id, ...storeDoc.data() };

            // ✅ Fetch nested settings/general document
            const settingsRef = doc(db, "stores", storeDoc.id, "settings", "general");
            const settingsSnap = await getDoc(settingsRef);

            if (settingsSnap.exists()) {
              storeData.settings = { general: settingsSnap.data() };
            }

            return storeData;
          })
        );

        setStores(storesData);
      } catch (error) {
        console.error("Error loading stores:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStores();
  }, []);

  // ✅ Filter stores based on search query (store name or city)
  const filteredStores = stores.filter((store) => {
    const name = store.storeName?.toLowerCase() || "";
    const city = store.settings?.general?.city?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || city.includes(query);
  });

  return (
    <div className="w-full">
      {/* Banner Section */}
      <section
        className="relative black-overlay bg-cover bg-center h-[500px] flex items-center justify-center text-white"
        style={{ backgroundImage: "url('../banner.jpg')" }}
      >
        <div className="rounded-lg relative text-center max-w-2xl custom-banner">
          <img src="store-logo.png" alt="Karyana.Online" className="main-logo" />
          <h1 className="text-4xl font-bold mb-6">
            Grow Your Grocery Business Online
          </h1>
          <p className="px-20 mb-8">
            Get your own online store with products, orders, and customer
            management — all in one place.
          </p>
          <Link
            to="/store-owner-signup"
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* ✅ Stores Section with Search */}
      <section className="py-16 bg-gray-50 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Our Stores</h2>

          {/* Search Input */}
          <div className="mb-8 flex justify-center">
            <div className="relative w-full">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search stores by name or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {loading ? (
            <p className="text-gray-500">Loading stores...</p>
          ) : filteredStores.length === 0 ? (
            <p className="text-gray-500">No stores found matching your search.</p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredStores.map((store) => {
                const logoUrl =
                  store.settings?.general?.logoUrl || defaultStoreImage;
                const city = store.settings?.general?.city || "Unknown City";

                return (
                  <Link
                    key={store.id}
                    to={`/${store.storeSlug || ""}`}
                    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition duration-300 transform hover:-translate-y-2"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="store-img mb-4">
                        <img
                          src={logoUrl}
                          alt={store.storeName}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-1 px-4">
                        {store.storeName}
                      </h3>

                      <p className="text-sm text-gray-500 px-4">{city}</p>

                      <span className="mt-4 inline-block px-4 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full mb-6">
                        Visit Store
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="p-6 bg-white shadow rounded-lg">
              <FaStore className="text-green-500 text-4xl mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Sign Up</h3>
              <p>Create your online store in just minutes.</p>
            </div>
            <div className="p-6 bg-white shadow rounded-lg">
              <FaBoxOpen className="text-green-500 text-4xl mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Add Products</h3>
              <p>Upload products with images & prices.</p>
            </div>
            <div className="p-6 bg-white shadow rounded-lg">
              <FaShoppingCart className="text-green-500 text-4xl mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Start Selling</h3>
              <p>Customers place orders online easily.</p>
            </div>
            <div className="p-6 bg-white shadow rounded-lg">
              <FaMoneyBillWave className="text-green-500 text-4xl mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Get Paid</h3>
              <p>Receive payments & deliver orders quickly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              "Easy-to-use dashboard",
              "Mobile-friendly store",
              "Real-time order notifications",
              "Customizable store design",
              "Unlimited products",
              "Fast setup & launch",
            ].map((feature, idx) => (
              <div key={idx} className="p-6 bg-green-50 rounded-lg shadow">
                <p className="font-medium">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 bg-gray-50 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Pricing</h2>
          <div className="bg-white shadow rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-4">Standard Plan</h3>
            <p className="text-4xl font-extrabold text-green-500">
              5000 PKR <span className="text-lg font-normal">/ month</span>
            </p>
            <ul className="mt-6 space-y-2">
              <li>✅ Full access to all features</li>
              <li>✅ Unlimited products</li>
              <li>✅ Free support</li>
              <li>✅ Instant setup</li>
            </ul>
            <Link
              to="/store-owner-signup"
              className="mt-6 inline-block px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">What Our Customers Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Ali Khan", text: "This app doubled my sales in just a month!" },
              { name: "Sara Ahmed", text: "Super easy to use and my customers love it." },
              { name: "Bilal Hussain", text: "Best decision for my store's growth!" },
            ].map((t, idx) => (
              <div key={idx} className="bg-white shadow p-6 rounded-lg">
                <p className="italic mb-4">"{t.text}"</p>
                <h4 className="font-semibold">{t.name}</h4>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              { q: "Do I need technical skills?", a: "No, our platform is beginner-friendly." },
              { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription anytime." },
              {
                q: "How fast can I get started?",
                a: "You can launch your store the same day you sign up.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white p-6 rounded-lg shadow">
                <h4 className="font-semibold mb-2">{faq.q}</h4>
                <p>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 text-center px-4">
        <h2 className="text-3xl font-bold mb-4">Have Questions?</h2>
        <p className="mb-4">We’re here to help you start your online store.</p>
        <div className="space-x-4">
          <a
            href="mailto:imaqib@outlook.online"
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Email Us
          </a>
          <a
            href="https://wa.me/923058427519"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 inline-flex items-center"
          >
            <FaWhatsapp className="mr-2" /> WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
