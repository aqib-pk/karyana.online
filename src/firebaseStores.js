import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";  // your firebase.js file

async function createStore(storeData) {
  try {
    const docRef = await addDoc(collection(db, "stores"), storeData);
    console.log("Store created with ID: ", docRef.id);
    return docRef.id; // This is the auto-generated storeId
  } catch (error) {
    console.error("Error adding store: ", error);
  }
}

// Example usage:
createStore({
  storeName: "My New Store",
  storeOwnerId: "UID-from-auth",
  storeEmail: "store@example.com",
  storePhone: "+92 300 1234567",
});