// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  // signup
  const signup = async (name, email, password) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(res.user, { displayName: name });

    await setDoc(doc(db, "customers", res.user.uid), {
      name,
      email,
      createdAt: new Date().toISOString(),
    });

    setCurrentUser(res.user);
    setCustomer({ name, email });
    return res.user;
  };

  // login
  const login = async (email, password) => {
    const res = await signInWithEmailAndPassword(auth, email, password);

    try {
      const snap = await getDoc(doc(db, "customers", res.user.uid));
      if (snap.exists()) {
        setCustomer(snap.data());
      }
    } catch (err) {
      console.error("Error fetching customer profile on login:", err);
    }

    setCurrentUser(res.user);
    return res.user;
  };

  // logout
  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setCustomer(null);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);

        // ✅ only fetch customer profile if needed (user logged in)
        try {
          const snap = await getDoc(doc(db, "customers", user.uid));
          if (snap.exists()) {
            setCustomer(snap.data());
          } else {
            setCustomer({
              name: user.displayName || "User",
              email: user.email,
            });
          }
        } catch (err) {
          console.error("Error fetching customer profile:", err);
        }
      } else {
        // ✅ guest browsing → don’t touch customers collection
        setCurrentUser(null);
        setCustomer(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, customer, signup, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
