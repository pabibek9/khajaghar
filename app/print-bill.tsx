export const unstable_settings = {
  initialRouteName: null,
};

import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../src/constants/firebase';

export default function PrintBill() {
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      const ref = doc(db, "orders", String(orderId));
      const snap = await getDoc(ref);
      if (snap.exists()) setOrder(snap.data());
    };
    fetchOrder();
  }, []);

  useEffect(() => {
    if (order) setTimeout(() => window.print(), 500);
  }, [order]);

  if (!order) return <div style={{ padding: 20 }}>Loading bill...</div>;

  const created = order.createdAt?.toDate?.().toLocaleString?.() ?? "";

  return (
    <div style={{
      padding: "40px",
      maxWidth: "600px",
      margin: "0 auto",
      fontFamily: "Arial, sans-serif",
      color: "#111"
    }}>

      <h1 style={{ textAlign: "center", marginBottom: "5px" }}>
        {order.kitchenName || "Restaurant Bill"}
      </h1>

      <p style={{ textAlign: "center", marginTop: 0, fontSize: "14px", color: "#555" }}>
        Printed on: {created}
      </p>

      <hr />

      <h2>Customer Information</h2>
      <p><strong>Name:</strong> {order.userName}</p>
      <p><strong>Phone:</strong> {order.userPhone}</p>
      <p><strong>Email:</strong> {order.userEmail}</p>
      <p><strong>Delivery Address:</strong> {order.userAddress}</p>


      <h2>Order Details</h2>
      <p><strong>Item:</strong> {order.itemName}</p>
      <p><strong>Price:</strong> Rs. {order.itemPrice}</p>
      <p><strong>Quantity:</strong> {order.quantity}</p>
      <p><strong>Delivery Fee:</strong> Rs. {order.deliveryFee}</p>

      {order.remarks ? (
        <p><strong>Remarks:</strong> {order.remarks}</p>
      ) : null}

      <h2>Total</h2>
      <h3 style={{ fontSize: "24px" }}>Rs. {order.total}</h3>

      <hr />

      <p style={{ textAlign: "center", color: "#888", fontSize: "12px" }}>
        Thank you for using KHAJA Delivery System
      </p>
    </div>
  );
}