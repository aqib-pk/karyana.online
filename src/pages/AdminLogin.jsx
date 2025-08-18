import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const AdminLogin = () => {
  const { storeSlug } = useParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // 1. Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Find store for this user by UID
      const storesRef = collection(db, "stores");
      const storeQuery = query(storesRef, where("storeOwnerId", "==", user.uid));
      const storeSnapshot = await getDocs(storeQuery);

      if (storeSnapshot.empty) {
        setError("No store found for this account.");
        return;
      }

      const storeData = storeSnapshot.docs[0].data();

      // 3. Verify slug matches URL
      if (storeData.storeSlug !== storeSlug) {
        setError("You are not authorized for this store.");
        return;
      }

      // ✅ Success: Go to admin dashboard
      navigate(`/${storeSlug}/admin/dashboard`);
    } catch (err) {
      console.error(err);
      setError("Invalid email or password.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center px-4">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-xl font-bold text-center mb-4">
          Admin Login - {storeSlug}
        </h2>
        {error && <p className="text-red-500 mb-2 text-sm">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full border p-2 rounded-md"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border p-2 rounded-md"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition"
          >
            Login
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/store-owner-signup" className="text-green-600 hover:underline">
            Sign up here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
