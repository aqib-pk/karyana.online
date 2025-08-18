// src/pages/SuperAdminLayout.jsx
import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { auth } from "../firebase";

const SuperAdminLayout = () => {
  const navigate = useNavigate();

  const logout = async () => {
    await auth.signOut();
    navigate("/super-admin");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-gray-800 text-white p-4 flex flex-col">
        <h1 className="text-2xl font-bold mb-8">Super Admin</h1>
        <nav className="flex flex-col space-y-2">
          <NavLink
            to="/super-admin/dashboard"
            className={({ isActive }) =>
              isActive ? "bg-gray-700 px-3 py-2 rounded" : "px-3 py-2 rounded hover:bg-gray-700"
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/super-admin/stores"
            className={({ isActive }) =>
              isActive ? "bg-gray-700 px-3 py-2 rounded" : "px-3 py-2 rounded hover:bg-gray-700"
            }
          >
            Manage Stores
          </NavLink>
          {/* New link for Payment Verification */}
          <NavLink
            to="/super-admin/payments"
            className={({ isActive }) =>
              isActive ? "bg-gray-700 px-3 py-2 rounded" : "px-3 py-2 rounded hover:bg-gray-700"
            }
          >
            Payment Verification
          </NavLink>
          <button
            onClick={logout}
            className="mt-auto bg-red-600 hover:bg-red-700 px-3 py-2 rounded"
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 bg-gray-100 p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default SuperAdminLayout;
