import { useEffect, useState } from 'react';
import { db } from '../firebase/config';
import { ref, onValue } from 'firebase/database';

export default function ProductList() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const productRef = ref(db, 'products/');
    onValue(productRef, (snapshot) => {
      const data = snapshot.val();
      const productArray = data ? Object.entries(data).map(([id, item]) => ({ id, ...item })) : [];
      setProducts(productArray);
    });
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">All Products</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => (
          <div key={product.id} className="border p-2 rounded shadow">
            <img src={product.image} className="h-32 w-full object-cover mb-2" />
            <h3 className="font-semibold">{product.name}</h3>
            <p>PKR {product.price}</p>
            <button className="mt-2 bg-green-600 text-white px-3 py-1 rounded">Add to Cart</button>
          </div>
        ))}
      </div>
    </div>
  );
}
