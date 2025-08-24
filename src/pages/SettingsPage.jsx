import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, storage } from "../firebase";
import { useStore } from "../context/StoreContext";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  getAuth,
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
} from "firebase/auth";

const SettingsPage = () => {
  const { storeId } = useStore();

  const [deliveryRate, setDeliveryRate] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [city, setCity] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Password states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!storeId) return; // Wait for storeId

    const deliveryDocRef = doc(db, "stores", storeId, "settings", "delivery");
    const generalDocRef = doc(db, "stores", storeId, "settings", "general");

    const fetchSettings = async () => {
      try {
        const deliverySnap = await getDoc(deliveryDocRef);
        if (deliverySnap.exists()) {
          setDeliveryRate(deliverySnap.data().rate || "");
        } else {
          setDeliveryRate("");
        }

        const generalSnap = await getDoc(generalDocRef);
        if (generalSnap.exists()) {
          const data = generalSnap.data();
          setStoreName(data.storeName || "");
          setStoreAddress(data.address || "");
          setStorePhone(data.phone || "");
          setOpenTime(data.openTime || "06:00");
          setCloseTime(data.closeTime || "22:00");
          setCity(data.city || "");
          setLogoUrl(data.logoUrl || "");
        } else {
          setStoreName("");
          setStoreAddress("");
          setStorePhone("");
          setOpenTime("05:00");
          setCloseTime("22:00");
          setCity("");
          setLogoUrl("");
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        setOpenTime("05:00");
        setCloseTime("22:00");
      }
      setLoading(false);
    };

    fetchSettings();
  }, [storeId]);

  const handleLogoUpload = async () => {
    if (!logoFile || !storeId) return null;

    const storageRef = ref(storage, `storeLogos/${storeId}/${logoFile.name}`);
    await uploadBytes(storageRef, logoFile);
    return await getDownloadURL(storageRef);
  };

  const saveSettings = async () => {
    if (!storeId) {
      alert("Store ID not found, cannot save settings.");
      return;
    }
    if (!deliveryRate) return alert("Please enter a delivery rate");
    if (!storeName) return alert("Please enter store name");
    if (!storePhone) return alert("Please enter store phone number");
    if (!openTime) return alert("Please enter store opening time");
    if (!closeTime) return alert("Please enter store closing time");

    const deliveryDocRef = doc(db, "stores", storeId, "settings", "delivery");
    const generalDocRef = doc(db, "stores", storeId, "settings", "general");

    try {
      let uploadedLogoUrl = logoUrl;

      if (logoFile) {
        uploadedLogoUrl = await handleLogoUpload();
        setLogoUrl(uploadedLogoUrl);
      }

      await setDoc(deliveryDocRef, { rate: parseFloat(deliveryRate) });

      await setDoc(
        generalDocRef,
        {
          storeName: storeName,
          address: storeAddress,
          phone: storePhone,
          openTime,
          closeTime,
          city,
          logoUrl: uploadedLogoUrl,
        },
        { merge: true }
      );

      alert("Settings updated successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings.");
    }
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      return alert("Please fill all password fields.");
    }
    if (newPassword !== confirmPassword) {
      return alert("New passwords do not match.");
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user || !user.email) {
        return alert("No user found. Please log in again.");
      }

      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      alert("Password updated successfully!");
    } catch (error) {
      console.error("Error updating password:", error);
      alert("Failed to update password. Please check your old password.");
    }
  };

  if (!storeId) {
    return <div>Loading store data...</div>;
  }

  if (loading) {
    return <div>Loading settings...</div>;
  }

  return (
    <div className="p-6 max-w-10xl mx-auto">
      <h1 className="text-xl font-bold mb-6">Store Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left column - Store Settings */}
        <div>
          <label className="block mb-1 font-semibold">Store Name</label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="border p-2 w-full mb-4"
            placeholder="Enter store name"
          />

          <label className="block mb-1 font-semibold">City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border p-2 w-full mb-4"
            placeholder="Enter city name"
          />

          <label className="block mb-1 font-semibold">Store Logo</label>
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Store Logo"
              className="w-20 h-20 mb-2 rounded-full object-cover border"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files[0])}
            className="border p-2 w-full mb-4"
          />

          <label className="block mb-1 font-semibold">Store Address</label>
          <textarea
            value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)}
            className="border p-2 w-full mb-4"
            placeholder="Enter store address"
            rows={3}
          />

          <label className="block mb-1 font-semibold">Store Phone Number</label>
          <input
            type="tel"
            value={storePhone}
            onChange={(e) => setStorePhone(e.target.value)}
            className="border p-2 w-full mb-4"
            placeholder="Enter store phone number"
          />

          <hr className="my-6" />

          <label className="block mb-1 font-semibold">Delivery Rate (PKR)</label>
          <input
            type="number"
            value={deliveryRate}
            onChange={(e) => setDeliveryRate(e.target.value)}
            className="border p-2 w-full mb-6"
            placeholder="Enter delivery rate"
          />

          <h2 className="text-lg font-semibold mb-2">Working Hours (Default)</h2>
          <div className="flex items-center space-x-4 mb-6">
            <div>
              <label className="block mb-1">Open Time</label>
              <input
                type="time"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="border p-2 w-32"
              />
            </div>
            <div>
              <label className="block mb-1">Close Time</label>
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="border p-2 w-32"
              />
            </div>
          </div>

          <button
            onClick={saveSettings}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Save All Settings
          </button>
        </div>

        {/* Right column - Change Password */}
        <div className="border rounded-lg p-4 shadow bg-white h-fit">
          <h2 className="text-lg font-semibold mb-4">Change Password</h2>

          <label className="block mb-1 font-semibold">Old Password</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="border p-2 w-full mb-4"
            placeholder="Enter old password"
          />

          <label className="block mb-1 font-semibold">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="border p-2 w-full mb-4"
            placeholder="Enter new password"
          />

          <label className="block mb-1 font-semibold">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border p-2 w-full mb-6"
            placeholder="Confirm new password"
          />

          <button
            onClick={handlePasswordChange}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
