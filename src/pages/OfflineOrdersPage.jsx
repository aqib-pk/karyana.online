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
  const [customerPhone, setCustomerPhone] = useState(""); // ✅ NEW
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
        initialWeights[p.id] = { kg: 1, gram: 0 };
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

  // ✅ Format weight helper (decimal KG instead of kg+g)
  const formatWeight = (grams) => {
    const totalKg = grams / 1000;
    return Number.isInteger(totalKg) ? `${totalKg}kg` : `${totalKg.toFixed(2)}kg`;
  };

  const addItem = (product) => {
    const weight = weightSelections[product.id] || { kg: 1, gram: 0 };
    const addedGrams = weight.kg * 1000 + weight.gram;
    if (addedGrams === 0) {
      alert("Please select a weight greater than 0");
      return;
    }

    setSelectedItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);

      if (existingIndex !== -1) {
        const updatedItems = [...prev];
        const existing = updatedItems[existingIndex];

        const newTotalGrams = existing.totalGrams + addedGrams;
        const newPrice = Math.round((product.price / 1000) * newTotalGrams);

        updatedItems[existingIndex] = {
          ...existing,
          totalGrams: newTotalGrams,
          weight: formatWeight(newTotalGrams),
          price: newPrice,
        };

        return updatedItems;
      }

      // New item
      const newItem = {
        ...product,
        totalGrams: addedGrams,
        weight: formatWeight(addedGrams),
        price: Math.round((product.price / 1000) * addedGrams),
      };

      return [...prev, newItem];
    });
  };

  const removeItem = (id) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const calculateTotalPrice = () => {
    return selectedItems.reduce((sum, item) => sum + item.price, 0);
  };

  const handleWeightChange = (productId, key, value) => {
    setWeightSelections((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [key]: Number(value),
      },
    }));
  };

  const handleSubmit = async () => {
  if (!storeId) {
    alert("Store ID not found, cannot save offline order.");
    return;
  }
  if (selectedItems.length === 0) {
    alert("Please add at least one item");
    return;
  }
  setSubmitting(true);

  try {
    const offlineOrdersRef = collection(db, "stores", storeId, "offlineOrders");

    await addDoc(offlineOrdersRef, {
      items: selectedItems.map(({ id, name, price, weight }) => ({
        id,
        name,
        price,
        weight,
      })),
      totalPrice: calculateTotalPrice(),
      customerName,
      customerPhone, // ✅ save phone
      status: "offline",
      orderType: "offline",
      paymentMethod,
      createdAt: Timestamp.now(),
    });

    // ✅ Build WhatsApp message
    if (customerPhone) {
      const formattedItems = selectedItems
        .map(
          (item) => `• ${item.name} (${item.weight}) - Rs ${item.price}`
        )
        .join("\n");

      const whatsappMessage = `✅ Thank you for shopping with us!\n\nHi ${
        customerName || "Customer"
      }, your offline order has been recorded.\n\nItems:\n${formattedItems}\n\nTotal Price: Rs ${calculateTotalPrice()}\nStatus: Offline`;

      const phoneNumber = customerPhone.startsWith("92")
        ? customerPhone
        : `92${customerPhone.replace(/^0+/, "")}`; // ✅ convert 0300... → 92300...

      window.open(
        `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`,
        "_blank"
      );
    }

    alert("Offline order created successfully!");
    setSelectedItems([]);
    setCustomerName("");
    setCustomerPhone(""); // ✅ reset phone
    setPaymentMethod("Cash");

    const resetWeights = {};
    products.forEach((p) => {
      resetWeights[p.id] = { kg: 1, gram: 0 };
    });
    setWeightSelections(resetWeights);
  } catch (err) {
    console.error(err);
    alert("Failed to create offline order");
  }

  setSubmitting(false);
};


  const handlePrint = () => {
    const printContents = document.getElementById("printArea").innerHTML;
    const printWindow = window.open("", "", "height=600,width=800");
    printWindow.document.write(`
      <html>
        <head><title>Print Bill</title></head>
        <body>${printContents}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-6">
      {/* Customer info & payment */}
      <div className="mt-6 max-w-md offline-info">
        <label className="block mb-1 font-semibold">Customer Name (optional)</label>
        <input
          type="text"
          className="border p-2 rounded w-full"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />

        <label className="block mb-1 font-semibold mt-4">Customer Phone (optional)</label>
        <input
          type="text"
          className="border p-2 rounded w-full"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          placeholder="03XXXXXXXXX"
        />

        <label className="block mb-1 font-semibold mt-4">Payment Method</label>
        <select
          className="border p-2 rounded w-full"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
        </select>

        <button
          disabled={submitting}
          onClick={handleSubmit}
          className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 mt-6 w-full"
        >
          {submitting ? "Saving..." : "Save Offline Order"}
        </button>
      </div>

      {/* Product list */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold mb-4">Create Offline Order</h1>

        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        />

        <div>
          <h2 className="font-semibold mb-2">Select Products</h2>

          {sortedCategories.length === 0 && <p>No products found.</p>}

          {sortedCategories.map((category) => (
            <div key={category} className="mb-8">
              <h3 className="text-xl font-bold mb-4 border-b border-gray-300 pb-1">
                {category}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {groupedProducts[category].map((product) => {
                  const imageUrl =
                    product.imageUrl && product.imageUrl.trim() !== ""
                      ? product.imageUrl
                      : product.image && product.image.trim() !== ""
                      ? product.image
                      : "/default-images/others.jpg";

                  const weight = weightSelections[product.id] || { kg: 1, gram: 0 };
                  const totalGrams = weight.kg * 1000 + weight.gram;
                  const calculatedPrice = totalGrams
                    ? Math.round((product.price / 1000) * totalGrams)
                    : 0;

                  return (
                    <div
                      key={product.id}
                      className="bg-white rounded-2xl shadow hover:shadow-lg cursor-pointer transition duration-300 p-4 flex flex-col items-center"
                    >
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-40 object-cover rounded-2xl mb-3"
                        onError={(e) => (e.target.src = "/default-images/others.jpg")}
                      />
                      <h4 className="text-lg font-semibold text-gray-800 text-center">
                        {product.name}
                      </h4>
                      <div className="flex gap-2 mt-3 mb-3">
                        <select
                          value={weight.kg}
                          onChange={(e) => handleWeightChange(product.id, "kg", e.target.value)}
                          className="p-1 border rounded-md text-sm"
                        >
                          {Array.from({ length: 21 }, (_, i) => (
                            <option key={i} value={i}>
                              {i} kg
                            </option>
                          ))}
                        </select>

                        <select
                          value={weight.gram}
                          onChange={(e) => handleWeightChange(product.id, "gram", e.target.value)}
                          className="p-1 border rounded-md text-sm"
                        >
                          {[0, 100, 150, 200, 250, 300, 400, 500, 600, 700, 750, 800, 900].map(
                            (g) => (
                              <option key={g} value={g}>
                                {g} g
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      {/* ✅ Live calculated price */}
                      <p className="text-xl font-bold text-green-600 mb-3">
                        PKR {calculatedPrice}
                      </p>

                      <button
                        onClick={() => addItem(product)}
                        className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 w-full"
                      >
                        Add to Cart
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart */}
      <div className="w-80 fixed top-20 right-5 bg-white shadow-lg rounded p-4 max-h-[80vh] overflow-auto">
        <h2 className="text-xl font-semibold mb-4">Order Items</h2>
        {selectedItems.length === 0 && <p>No items selected.</p>}
        {selectedItems.map((item) => (
          <div
            key={item.id}
            className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2"
          >
            <div>
              <div className="font-semibold">{item.name}</div>
              <div className="text-sm text-gray-600">{item.weight}</div>
            </div>
            <div className="text-green-600 font-bold">PKR {item.price}</div>
            <button
              onClick={() => removeItem(item.id)}
              className="text-red-500 ml-2"
              title="Remove item"
            >
              &times;
            </button>
          </div>
        ))}
        {selectedItems.length > 0 && (
          <>
            <div className="mt-2 pt-2 font-bold flex justify-between text-lg">
              <span>Total:</span>
              <span>PKR {calculateTotalPrice()}</span>
            </div>
            <button
              onClick={handlePrint}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Print Bill
            </button>
          </>
        )}
      </div>

      {/* Print area */}
      <div id="printArea" style={{ display: "none" }}>
        <h2 className="text-xl font-bold mb-2">Store</h2>
        <p>Customer: {customerName || "Walk-in"}</p>
        <p>Phone: {customerPhone || "-"}</p> {/* ✅ Show phone */}
        <p>Date: {new Date().toLocaleString()}</p>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #000", textAlign: "left" }}>Item</th>
              <th style={{ borderBottom: "1px solid #000", textAlign: "right" }}>Weight</th>
              <th style={{ borderBottom: "1px solid #000", textAlign: "right" }}>Price (PKR)</th>
            </tr>
          </thead>
          <tbody>
            {selectedItems.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td style={{ textAlign: "right" }}>{item.weight}</td>
                <td style={{ textAlign: "right" }}>{item.price}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="2" style={{ textAlign: "right", fontWeight: "bold" }}>Total:</td>
              <td style={{ textAlign: "right", fontWeight: "bold" }}>PKR {calculateTotalPrice()}</td>
            </tr>
          </tfoot>
        </table>
        <p style={{ marginTop: 20 }}>Thank you for your purchase!</p>
      </div>
    </div>
  );
};

export default OfflineOrdersPage;
