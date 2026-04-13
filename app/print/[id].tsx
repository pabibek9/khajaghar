import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../src/constants/firebase'; 



type OrderDoc = {
  kitchenName?: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  userAddress?: string;
  itemName: string;
  itemPrice: number;
  quantity: number;
  deliveryFee?: number;
  total: number;
  paymentMethod?: string;
  remarks?: string;
  createdAt?: any;
};

export default function PrintBill() {
  const { id } = useLocalSearchParams<{ id: string }>();  
  const [order, setOrder] = useState<OrderDoc | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return; //  load yet

      try {
        const ref = doc(db, 'orders', String(id));
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setOrder(snap.data() as any);
        } else {
          console.warn('Order not found for id:', id);
        }
      } catch (e) {
        console.error('Failed to load order for bill:', e);
      }
    };

    fetchOrder();
  }, [id]);

  if (!order) {
    return (
      <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
        Loading bill...
      </div>
    );
  }

  const created =
    order.createdAt?.toDate?.().toLocaleString?.() ?? '';

  const itemTotal = order.itemPrice * order.quantity;
  const delivery = order.deliveryFee ?? 0;
  const grandTotal = order.total ?? itemTotal + delivery;

  return (
    <div
      style={{
        padding: 32,
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: '#f3f4f6',
      }}
    >
      <div
        style={{
          maxWidth: 600,
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: 8,
          padding: 24,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>
            {order.kitchenName || 'Restaurant Bill'}
          </h1>
          <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
            Order ID: {id}
          </div>
          <div style={{ fontSize: 13, color: '#555' }}>
            Date: {created}
          </div>
        </div>

        <hr />

        {/* Customer */}
        <h2 style={{ fontSize: 18, marginTop: 16 }}>Customer</h2>
        <p><strong>Name:</strong> {order.userName || '-'}</p>
        <p><strong>Phone:</strong> {order.userPhone || '-'}</p>
        <p><strong>Email:</strong> {order.userEmail || '-'}</p>
        <p><strong>Address:</strong> {order.userAddress || '-'}</p>

        {/* Items */}
        <h2 style={{ fontSize: 18, marginTop: 16 }}>Items</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', paddingBottom: 4 }}>Item</th>
              <th style={{ textAlign: 'center', borderBottom: '1px solid #ddd', paddingBottom: 4 }}>Qty</th>
              <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd', paddingBottom: 4 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ paddingTop: 6 }}>{order.itemName}</td>
              <td style={{ textAlign: 'center', paddingTop: 6 }}>{order.quantity}</td>
              <td style={{ textAlign: 'right', paddingTop: 6 }}>Rs. {itemTotal}</td>
            </tr>
          </tbody>
        </table>

        {/* Charges */}
        <h2 style={{ fontSize: 18, marginTop: 16 }}>Charges</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span>Delivery fee</span>
          <span>Rs. {delivery}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span>Payment method</span>
          <span>{order.paymentMethod || 'Cash on delivery'}</span>
        </div>

        {/* Total */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 12,
            paddingTop: 8,
            borderTop: '1px solid #ddd',
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          <span>Total</span>
          <span>Rs. {grandTotal}</span>
        </div>

        {/* Remarks */}
        {order.remarks ? (
          <p style={{ marginTop: 12, fontSize: 13 }}>
            <strong>Remarks:</strong> {order.remarks}
          </p>
        ) : null}

        {/* Print button */}
        <div style={{ textAlign: 'right', marginTop: 24 }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '8px 16px',
              borderRadius: 4,
              border: 'none',
              background: '#111827',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Print
          </button>
        </div>

        <p
          style={{
            marginTop: 24,
            textAlign: 'center',
            fontSize: 11,
            color: '#888',
          }}
        >
          Thank you for using Khaja Delivery ✨
        </p>
      </div>
    </div>
  );
}
