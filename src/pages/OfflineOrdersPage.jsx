import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, Timestamp, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useStore } from "../context/StoreContext";

const OfflineOrdersPage = () => {
  const { storeId } = useStore();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [weightSelections, setWeightSelections] = useState({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    const productsRef = collection(db, "stores", storeId, "products");
    const q = query(productsRef, orderBy("name"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
      setFilteredProducts(productsData);

      const initialWeights = {};
      productsData.forEach(p => {
        if (p.unit === "Kg") initialWeights[p.id] = { kg: 1, gram: 0 };
        else if (p.unit === "Liters") initialWeights[p.id] = { liters: 1, ml: 0 };
        else initialWeights[p.id] = { quantity: 1 };
      });
      setWeightSelections(initialWeights);
    });

    return () => unsubscribe();
  }, [storeId]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        (product.name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const category = product.category || "Others";
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {});

  const categoryOrder = ["Rice", "Daal", "Oils & Ghee"];
  const sortedCategories = Object.keys(groupedProducts).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  // --- Format units like ProductListing.jsx ---
  const formatItemUnit = (item) => {
    if (item.unit === "Kg") {
      const totalGrams = (item.kg || 0) * 1000 + (item.gram || 0);
      const kgPart = Math.floor(totalGrams / 1000);
      const gPart = totalGrams % 1000;
      return `${kgPart}kg${gPart ? ` + ${gPart}g` : ""}`;
    } else if (item.unit === "Liters") {
      const totalMl = (item.liters || 0) * 1000 + (item.ml || 0);
      const litersPart = Math.floor(totalMl / 1000);
      const mlPart = totalMl % 1000;
      return `${litersPart}L${mlPart ? ` + ${mlPart}ml` : ""}`;
    } else if (item.unit === "Pieces") {
      return (item.quantity || 1) + ((item.quantity || 1) > 1 ? " Pieces" : " Piece");
    } else if (item.unit === "Dozens") {
      return (item.quantity || 1) + ((item.quantity || 1) > 1 ? " Dozens" : " Dozen");
    }
    return "";
  };

  const addItem = (product) => {
    const weight = weightSelections[product.id] || {};
    let price = product.price;
    let displayWeight = "";
    let newItemData = {};

    if (product.unit === "Kg") {
      const totalGrams = (weight.kg || 0) * 1000 + (weight.gram || 0);
      if (!totalGrams) { alert("Select weight > 0"); return; }
      price = Math.round((product.price / 1000) * totalGrams);
      displayWeight = formatItemUnit({ ...weight, unit: "Kg" });
      newItemData = { kg: weight.kg, gram: weight.gram, totalGrams: totalGrams };
    } else if (product.unit === "Liters") {
      const totalMl = (weight.liters || 0) * 1000 + (weight.ml || 0);
      if (!totalMl) { alert("Select volume > 0"); return; }
      price = Math.round((product.price / 1000) * totalMl);
      displayWeight = formatItemUnit({ ...weight, unit: "Liters" });
      newItemData = { liters: weight.liters, ml: weight.ml, totalMl: totalMl };
    } else { // Pieces or Dozens
      const qty = weight.quantity || 1;
      price = product.price * qty;
      displayWeight = formatItemUnit({ ...weight, unit: product.unit || "Pieces" });
      newItemData = { quantity: qty };
    }

    setSelectedItems(prev => {
      const existingIndex = prev.findIndex(i => i.id === product.id);
      if (existingIndex !== -1) {
        // Update existing item by adding quantity/weight
        const updatedItems = [...prev];
        const existing = updatedItems[existingIndex];

        if (product.unit === "Kg") {
          const newTotalGrams = (existing.totalGrams || 0) + newItemData.totalGrams;
          updatedItems[existingIndex] = {
            ...existing,
            kg: Math.floor(newTotalGrams / 1000),
            gram: newTotalGrams % 1000,
            totalGrams: newTotalGrams,
            weight: formatItemUnit({ kg: Math.floor(newTotalGrams / 1000), gram: newTotalGrams % 1000, unit: "Kg" }),
            price: Math.round((product.price / 1000) * newTotalGrams),
          };
        } else if (product.unit === "Liters") {
          const newTotalMl = (existing.totalMl || 0) + newItemData.totalMl;
          updatedItems[existingIndex] = {
            ...existing,
            liters: Math.floor(newTotalMl / 1000),
            ml: newTotalMl % 1000,
            totalMl: newTotalMl,
            weight: formatItemUnit({ liters: Math.floor(newTotalMl / 1000), ml: newTotalMl % 1000, unit: "Liters" }),
            price: Math.round((product.price / 1000) * newTotalMl),
          };
        } else { // Pieces or Dozens
          const newQty = (existing.quantity || 0) + (newItemData.quantity || 0);
          updatedItems[existingIndex] = {
            ...existing,
            quantity: newQty,
            weight: formatItemUnit({ quantity: newQty, unit: product.unit }),
            price: product.price * newQty,
          };
        }

        return updatedItems;
      }

      // New item
      return [...prev, { ...product, ...newItemData, weight: displayWeight, price }];
    });
  };

  const removeItem = (id) => setSelectedItems(prev => prev.filter(i => i.id !== id));
  const calculateTotalPrice = () => selectedItems.reduce((sum, item) => sum + item.price, 0);

  const handleWeightChange = (productId, key, value) => {
    setWeightSelections(prev => ({
      ...prev,
      [productId]: { ...prev[productId], [key]: Number(value) }
    }));
  };

  const handleSubmit = async () => {
  if (!storeId || !selectedItems.length || !customerName.trim() || !customerPhone.trim()) {
    alert("Fill all required fields and add at least one item"); return;
  }
  const phoneRegex = /^(\+92|0)?3\d{9}$/;
  if (!phoneRegex.test(customerPhone)) { alert("Invalid phone number"); return; }

  setSubmitting(true);
  try {
    const offlineOrdersRef = collection(db, "stores", storeId, "offlineOrders");
    await addDoc(offlineOrdersRef, {
      items: selectedItems.map(({ id, name, price, weight }) => ({ id, name, price, weight })),
      totalPrice: calculateTotalPrice(),
      customerName,
      customerPhone,
      status: "offline",
      orderType: "offline",
      paymentMethod,
      createdAt: Timestamp.now(),
    });
    setShowSuccessModal(true); // show success popup
    setSelectedItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMethod("Cash");
    
    const resetWeights = {};
    products.forEach(p => {
      if (p.unit === "Kg") resetWeights[p.id] = { kg: 1, gram: 0 };
      else if (p.unit === "Liters") resetWeights[p.id] = { liters: 1, ml: 0 };
      else resetWeights[p.id] = { quantity: 1 };
    });
    setWeightSelections(resetWeights);

    setShowModal(false); // close modal **after** save is done
    setTimeout(() => setShowSuccessModal(false), 3000);
  } catch (err) {
    console.error(err); 
    alert("Failed to create offline order");
  }
  setSubmitting(false);
};

  const handlePrint = () => {
    const printContents = document.getElementById("printArea").innerHTML;
    const printWindow = window.open("", "", "height=600,width=800");
    printWindow.document.write(`<html><head><title>Print Bill</title></head><body>${printContents}</body></html>`);
    printWindow.document.close(); printWindow.print();
  };

  return (
    
    <div className="p-6">
      {showSuccessModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm text-center">
      <h2 className="text-xl font-bold mb-2">✅ Success</h2>
      <p>Your order has been saved successfully!</p>
      <button 
        onClick={() => setShowSuccessModal(false)} 
        className="mt-4 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
      >
        Close
      </button>
    </div>
  </div>
)}
      {/* Selected Items Cart */}
      <div className="w-80 fixed top-20 right-5 bg-white shadow-lg rounded p-4 max-h-[80vh] overflow-auto not-fixed-on-tablet z-40">
        <h2 className="text-xl font-semibold mb-4">Order Items</h2>
        {selectedItems.length === 0 && <p>No items selected.</p>}
        {selectedItems.map(item => (
          <div key={item.id} className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
            <div>
              <div className="font-semibold">{item.name}</div>
              <div className="text-sm text-gray-600">{item.weight}</div>
            </div>
            <div className="text-green-600 font-bold">PKR {item.price}</div>
            <button onClick={() => removeItem(item.id)} className="text-red-500 ml-2">&times;</button>
          </div>
        ))}
        {selectedItems.length > 0 && (
          <>
            <div className="mt-2 pt-2 font-bold flex justify-between text-lg">
              <span>Total:</span>
              <span>PKR {calculateTotalPrice()}</span>
            </div>
            
            <button 
              onClick={() => setShowModal(true)} 
              className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              Save Order
            </button>
          </>
        )}
      </div>

      {/* Modal for Customer Info */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Customer Info</h2>
            
            <label className="block mb-1 font-semibold">Customer Name</label>
            <input 
              type="text" 
              className="border p-2 rounded w-full" 
              value={customerName} 
              onChange={e => setCustomerName(e.target.value)} 
            />

            <label className="block mb-1 font-semibold mt-4">Customer Phone</label>
            <input 
              type="text" 
              className="border p-2 rounded w-full" 
              placeholder="03XXXXXXXXX"
              value={customerPhone} 
              onChange={e => setCustomerPhone(e.target.value)} 
            />

            <label className="block mb-1 font-semibold mt-4">Payment Method</label>
            <select 
              className="border p-2 rounded w-full" 
              value={paymentMethod} 
              onChange={e => setPaymentMethod(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
            </select>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowModal(false)} 
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button 
  disabled={submitting}
  onClick={handleSubmit}
  className={`bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 flex items-center justify-center gap-2 ${submitting ? "opacity-70 cursor-not-allowed" : ""}`}
>
  {submitting ? (
    <>
      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
      Saving...
    </>
  ) : "Save Order"}
</button>
              <button 
                onClick={handlePrint} 
                className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Listing */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4">Create Offline Order</h1>
        <input type="text" placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border p-2 rounded w-full mb-4" />
        {sortedCategories.length === 0 && <p>No products found.</p>}
        {sortedCategories.map(category => (
          <div key={category} className="mb-8">
            <h3 className="text-xl font-bold mb-4 border-b border-gray-300 pb-1">{category}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {groupedProducts[category].map(product => {
                const imageUrl = product.imageUrl?.trim() || product.image?.trim() || "/default-images/others.jpg";
                const weight = weightSelections[product.id] || {};
                let calculatedPrice = product.price;

                if (product.unit === "Kg") calculatedPrice = Math.round(((weight.kg || 0) * 1000 + (weight.gram || 0)) * (product.price / 1000));
                else if (product.unit === "Liters") calculatedPrice = Math.round(((weight.liters || 0) * 1000 + (weight.ml || 0)) * (product.price / 1000));
                else calculatedPrice = product.price * (weight.quantity || 1);

                return (
                  <div key={product.id} className="bg-white rounded-2xl shadow hover:shadow-lg cursor-pointer transition duration-300 p-4 flex flex-col items-center">
                    <img src={imageUrl} alt={product.name} className="w-full h-40 object-cover rounded-2xl mb-3" onError={e => e.target.src="/default-images/others.jpg"} />
                    <h4 className="text-lg font-semibold text-gray-800 text-center">{product.name}</h4>
                    <div className="flex gap-2 mt-3 mb-3">
                      {product.unit === "Kg" && <>
                        <select value={weight.kg} onChange={e => handleWeightChange(product.id, "kg", e.target.value)} className="p-1 border rounded-md text-sm">{Array.from({ length: 21 }, (_, i) => <option key={i} value={i}>{i} kg</option>)}</select>
                        <select value={weight.gram} onChange={e => handleWeightChange(product.id, "gram", e.target.value)} className="p-1 border rounded-md text-sm">{[0,100,150,200,250,300,400,500,600,700,750,800,900].map(g=><option key={g} value={g}>{g} g</option>)}</select>
                      </>}
                      {product.unit === "Liters" && <>
                        <select value={weight.liters} onChange={e => handleWeightChange(product.id, "liters", e.target.value)} className="p-1 border rounded-md text-sm">{Array.from({ length: 21 }, (_, i) => <option key={i} value={i}>{i} L</option>)}</select>
                        <select value={weight.ml} onChange={e => handleWeightChange(product.id, "ml", e.target.value)} className="p-1 border rounded-md text-sm">{[0,50,100,150,200,250,300,400,500,600,700,750,800,900].map(ml=><option key={ml} value={ml}>{ml} ml</option>)}</select>
                      </>}
                      {(product.unit === "Pieces" || product.unit === "Dozens") && (
  <div className="flex gap-2 mt-3 mb-3 w-full justify-center">
    <select
      value={weightSelections[product.id]?.quantity || 1}
      onChange={(e) =>
        setWeightSelections(prev => ({
          ...prev,
          [product.id]: {
            ...prev[product.id],
            quantity: Number(e.target.value),
          },
        }))
      }
      className="p-1 border rounded-md text-sm w-full"
    >
      {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
        <option key={num} value={num}>
          {product.unit === "Dozens" ? `${num} Dozen` : `${num} pcs`}
        </option>
      ))}
    </select>
  </div>
)}
                    </div>
                    <p className="text-xl font-bold text-green-600 mb-3">PKR {calculatedPrice}</p>
                    <button onClick={()=>addItem(product)} className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 w-full">Add to Cart</button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Print Area */}
      <div id="printArea" style={{ display:"none" }}>
        <h2 className="text-xl font-bold mb-2">Store</h2>
        <p>Customer: {customerName || "Walk-in"}</p>
        <p>Phone: {customerPhone || "-"}</p>
        <p>Date: {new Date().toLocaleString()}</p>
        <table style={{width:"100%", borderCollapse:"collapse", marginTop:10}}>
          <thead><tr><th style={{borderBottom:"1px solid #000", textAlign:"left"}}>Item</th><th style={{borderBottom:"1px solid #000", textAlign:"right"}}>Weight</th><th style={{borderBottom:"1px solid #000", textAlign:"right"}}>Price (PKR)</th></tr></thead>
          <tbody>{selectedItems.map(item=><tr key={item.id}><td>{item.name}</td><td style={{textAlign:"right"}}>{item.weight}</td><td style={{textAlign:"right"}}>{item.price}</td></tr>)}</tbody>
          <tfoot><tr><td colSpan="2" style={{textAlign:"right", fontWeight:"bold"}}>Total:</td><td style={{textAlign:"right", fontWeight:"bold"}}>PKR {calculateTotalPrice()}</td></tr></tfoot>
        </table>
        <p style={{marginTop:20}}>Thank you for your purchase!</p>
      </div>
    </div>
    
  );
};

export default OfflineOrdersPage;
