// src/pages/LandingPage.jsx
import React from "react";
import { Link } from "react-router-dom";
import { FaStore, FaBoxOpen, FaShoppingCart, FaMoneyBillWave, FaWhatsapp } from "react-icons/fa";

const LandingPage = () => {
  return (
    <div className="w-full">
      {/* Banner Section */}
      <section
        className="relative black-overlay bg-cover bg-center h-[500px] flex items-center justify-center text-white"
        style={{ backgroundImage: "url('../banner.jpg')" }} // put your banner image in public folder
      >
        <div className=" p-8 rounded-lg relative text-center max-w-2xl">
          <img src="store-logo.png" alt="Karyana.Online" className="main-logo" />
          <h1 className="text-4xl font-bold mb-6">Grow Your Grocery Business Online (Karyana.online)</h1>
          <p className="px-8 mb-8">
            Get your own online store with products, orders, and customer management — all in one place.
          </p>
          <Link
            to="/admin-login"
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
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
      <section className="py-16">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              "Easy-to-use dashboard",
              "Mobile-friendly store",
              "Real-time order notifications",
              "Customizable store design",
              "Unlimited products",
              "Fast setup & launch"
            ].map((feature, idx) => (
              <div key={idx} className="p-6 bg-green-50 rounded-lg shadow">
                <p className="font-medium">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">Pricing</h2>
          <div className="bg-white shadow rounded-lg p-8">
            <h3 className="text-2xl font-bold mb-4">Standard Plan</h3>
            <p className="text-4xl font-extrabold text-green-500">6000 PKR <span className="text-lg font-normal">/ month</span></p>
            <ul className="mt-6 space-y-2">
              <li>✅ Full access to all features</li>
              <li>✅ Unlimited products</li>
              <li>✅ Free support</li>
              <li>✅ Instant setup</li>
            </ul>
            <Link
              to="/admin-login"
              className="mt-6 inline-block px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-10">What Our Customers Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Ali Khan", text: "This app doubled my sales in just a month!" },
              { name: "Sara Ahmed", text: "Super easy to use and my customers love it." },
              { name: "Bilal Hussain", text: "Best decision for my store's growth!" }
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
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 text-center">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              { q: "Do I need technical skills?", a: "No, our platform is beginner-friendly." },
              { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription anytime." },
              { q: "How fast can I get started?", a: "You can launch your store the same day you sign up." }
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
      <section className="py-16 text-center">
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
