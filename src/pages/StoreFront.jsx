import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function StoreFront() {
  const { storeSlug } = useParams(); // was storeName before
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStoreProducts = async () => {
      try {
        const storesRef = collection(db, "stores");
        const q = query(storesRef, where("storeSlug", "==", storeSlug));
        const storeSnap = await getDocs(q);

        if (!storeSnap.empty) {
          const storeDoc = storeSnap.docs[0];
          const productsRef = collection(db, "stores", storeDoc.id, "products");
          const productsSnap = await getDocs(productsRef);
          const productsData = productsSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setProducts(productsData);
        }
      } catch (error) {
        console.error("Error fetching store products:", error);
      }
      setLoading(false);
    };

    fetchStoreProducts();
  }, [storeSlug]);

  if (loading) return <p>Loading...</p>;
  if (!products.length) return <p>No products found for {storeSlug}</p>;

  return (
    <div>
      <h1>{storeSlug.replace(/-/g, " ")}</h1>
      <div>
        {products.map((product) => (
          <div key={product.id}>
            <h3>{product.name}</h3>
            <p>Price: {product.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
