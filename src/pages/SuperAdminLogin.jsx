// src/pages/SuperAdminLogin.jsx
import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const SUPER_ADMIN_EMAIL = "admin@example.com";
const SUPER_ADMIN_PASSWORD = "yourSuperSecretPassword"; // ideally environment variable

const SuperAdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (email !== SUPER_ADMIN_EMAIL) {
      setError("Unauthorized email");
      setLoading(false);
      return;
    }

    if (password !== SUPER_ADMIN_PASSWORD) {
      setError("Incorrect password");
      setLoading(false);
      return;
    }

    try {
      // Sign in using Firebase Auth with hardcoded creds
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/super-admin/dashboard"); // super admin dashboard route
    } catch (err) {
      setError("Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow-md max-w-sm w-full space-y-4"
      >
        <h2 className="text-2xl font-bold text-center">Super Admin Login</h2>
        {error && <p className="text-red-500">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border p-2 rounded w-full"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border p-2 rounded w-full"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white py-2 rounded w-full hover:bg-blue-700 transition"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
};

export default SuperAdminLogin;
