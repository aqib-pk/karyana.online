// src/pages/AdminLogin.jsx
import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

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
      // 1. Authenticate
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Get role from users collection
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setError("User not found in database.");
        return;
      }

      const userData = userSnap.data();

      // ✅ Super Admin login
      if (userData.role === "superadmin") {
        navigate("/super-admin/dashboard");
        return;
      }

      // ✅ Store Owner login
      if (userData.role === "storeOwner") {
        const storesRef = collection(db, "stores");
        const storeQuery = query(storesRef, where("storeOwnerId", "==", user.uid));
        const storeSnapshot = await getDocs(storeQuery);

        if (storeSnapshot.empty) {
          setError("No store found for this account.");
          return;
        }

        const storeData = storeSnapshot.docs[0].data();

        // If storeSlug is missing (e.g. login from /admin-login), auto-redirect to correct slug
        if (!storeSlug) {
          navigate(`/${storeData.storeSlug}/admin/dashboard`);
          return;
        }

        // If storeSlug exists, validate it
        if (storeData.storeSlug !== storeSlug) {
          setError("You are not authorized for this store.");
          return;
        }

        navigate(`/${storeSlug}/admin/dashboard`);
        return;
      }

      setError("Unauthorized: Role not recognized.");
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid email or password.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center items-center px-4">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-xl font-bold text-center mb-4">
          {storeSlug ? `Admin Login - ${storeSlug}` : "Super Admin Login"}
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
        {storeSlug && (
          <p className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link to="/store-owner-signup" className="text-green-600 hover:underline">
              Sign up here
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
