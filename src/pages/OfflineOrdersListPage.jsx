import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { ClockIcon, CalendarDaysIcon, CalendarIcon } from "@heroicons/react/24/solid";
import { useStore } from "../context/StoreContext";

const OfflineOrdersListPage = () => {
  const { storeId } = useStore();
  const [offlineOrders, setOfflineOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Sales stats
  const [stats, setStats] = useState({
    today: { count: 0, revenue: 0 },
    week: { count: 0, revenue: 0 },
    month: { count: 0, revenue: 0 },
  });

  useEffect(() => {
    if (!storeId) return;

    const offlineOrdersRef = collection(db, "stores", storeId, "offlineOrders");
    const q = query(offlineOrdersRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOfflineOrders(orders);
      setLoading(false);
      calculateStats(orders);
    });

    return () => unsubscribe();
  }, [storeId]);

  const calculateStats = (orders) => {
    const now = new Date();

    const isToday = (date) => (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );

    const isThisWeek = (date) => {
      const firstDayOfWeek = new Date(now);
      firstDayOfWeek.setDate(now.getDate() - now.getDay() + 1);
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
      return date >= firstDayOfWeek && date <= lastDayOfWeek;
    };

    const isThisMonth = (date) => (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );

    let todayCount = 0, todayRevenue = 0, weekCount = 0, weekRevenue = 0, monthCount = 0, monthRevenue = 0;

    orders.forEach(order => {
      const createdAtDate = order.createdAt?.toDate();
      if (!createdAtDate) return;

      if (isToday(createdAtDate)) {
        todayCount++;
        todayRevenue += order.totalPrice || 0;
      }
      if (isThisWeek(createdAtDate)) {
        weekCount++;
        weekRevenue += order.totalPrice || 0;
      }
      if (isThisMonth(createdAtDate)) {
        monthCount++;
        monthRevenue += order.totalPrice || 0;
      }
    });

    setStats({
      today: { count: todayCount, revenue: todayRevenue },
      week: { count: weekCount, revenue: weekRevenue },
      month: { count: monthCount, revenue: monthRevenue },
    });
  };

  const handleDelete = async (orderId) => {
    if (!storeId) return alert("Store ID not found, cannot delete order.");
    if (!window.confirm("Are you sure you want to delete this offline order?")) return;

    setDeletingId(orderId);
    try {
      await deleteDoc(doc(db, "stores", storeId, "offlineOrders", orderId));
      alert("Offline order deleted successfully.");
    } catch (error) {
      console.error("Failed to delete offline order:", error);
      alert("Failed to delete offline order. Try again later.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div className="p-6">Loading offline orders...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Offline Orders List</h1>

      {/* Sales Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-10">
        <div className="bg-gradient-to-r from-green-400 to-green-600 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform cursor-default">
          <div className="flex items-center gap-3 mb-4">
            <ClockIcon className="h-8 w-8" />
            <h2 className="text-2xl font-bold">Today</h2>
          </div>
          <p className="text-white/90 mb-2"><span className="font-semibold">Orders:</span> {stats.today.count}</p>
          <p className="text-2xl font-extrabold">PKR {stats.today.revenue.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform cursor-default">
          <div className="flex items-center gap-3 mb-4">
            <CalendarDaysIcon className="h-8 w-8" />
            <h2 className="text-2xl font-bold">This Week</h2>
          </div>
          <p className="text-white/90 mb-2"><span className="font-semibold">Orders:</span> {stats.week.count}</p>
          <p className="text-2xl font-extrabold">PKR {stats.week.revenue.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform cursor-default">
          <div className="flex items-center gap-3 mb-4">
            <CalendarIcon className="h-8 w-8" />
            <h2 className="text-2xl font-bold">This Month</h2>
          </div>
          <p className="text-white/90 mb-2"><span className="font-semibold">Orders:</span> {stats.month.count}</p>
          <p className="text-2xl font-extrabold">PKR {stats.month.revenue.toLocaleString()}</p>
        </div>
      </div>

      {/* Orders list */}
      {offlineOrders.length === 0 ? (
        <p className="text-gray-600 text-lg">No offline orders found.</p>
      ) : (
        <div className="space-y-8">
          {offlineOrders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-lg shadow-md flex flex-col md:flex-row justify-between items-start md:items-center border border-gray-200">
              <div className="flex-1">
                <p className="text-gray-700 mb-1"><span className="font-semibold">Customer:</span> {order.customerName || "N/A"}</p>
                <p className="text-gray-700 mb-1"><span className="font-semibold">Payment Method:</span> {order.paymentMethod}</p>
                <p className="text-gray-700 mb-1"><span className="font-semibold">Total Price:</span> PKR {order.totalPrice}</p>
                <p className="text-gray-500 text-sm mb-4"><span className="font-semibold">Created At:</span> {order.createdAt?.toDate().toLocaleString() || "N/A"}</p>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Ordered Items:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-52 overflow-y-auto pr-2">
                    {(order.items || []).map((item, idx) => (
                      <div key={idx} className="border rounded-lg p-3 bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
                        <p className="font-semibold text-gray-900 truncate" title={item.name}>{item.name}</p>
                        <p className="text-gray-600 text-sm">Quantity / Weight: <span className="font-medium">{item.weight}</span></p>
                        <p className="text-green-600 font-semibold mt-1">PKR {item.price}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={() => handleDelete(order.id)}
                disabled={deletingId === order.id}
                className={`mt-6 md:mt-0 md:ml-6 px-5 py-3 rounded-lg text-white font-semibold ${
                  deletingId === order.id ? "bg-gray-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                } transition-colors`}
              >
                {deletingId === order.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OfflineOrdersListPage;