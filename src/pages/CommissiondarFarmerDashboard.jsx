import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getCommissiondarFarmers,
  getCommissiondarStock,
  getCommissiondarLoans,
  getCommissiondarGrainTypes,
  createCommissiondarLoan,
  repayCommissiondarLoan,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { calculateSettlement } from '../utils/settlement';
import { rupees, formatNumber, formatDate, formatDateTime } from '../utils/formatters';

export default function CommissiondarFarmerDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Primary Entities
  const [farmer, setFarmer] = useState(null);
  const [farmersList, setFarmersList] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [loans, setLoans] = useState([]);
  const [grainTypes, setGrainTypes] = useState([]);

  // Active Tab: 'purchase' | 'loans' | 'deliveries' | 'payments'
  const [activeTab, setActiveTab] = useState('purchase');

  // Account-isolated storage key for farmer payments
  const userIdentifier = user?.id || user?.phone || 'default';
  const paymentStorageKey = `commissiondar_farmer_payments_${userIdentifier}_${id}`;

  const [payments, setPayments] = useState(() => {
    try {
      const saved = localStorage.getItem(paymentStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(paymentStorageKey, JSON.stringify(payments));
    } catch {}
  }, [payments, paymentStorageKey]);

  // Payment Recording Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Load all Farmer details and associated ledgers
  const loadFarmerData = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError('');

    try {
      const [fRes, sRes, lRes, gRes] = await Promise.allSettled([
        getCommissiondarFarmers(token),
        getCommissiondarStock(token),
        getCommissiondarLoans(token),
        getCommissiondarGrainTypes(token),
      ]);

      // 1. Farmer Profile
      if (fRes.status === 'fulfilled') {
        const rawF = Array.isArray(fRes.value) ? fRes.value : fRes.value?.farmers || [];
        setFarmersList(rawF);
        const current = rawF.find(f => String(f.id) === String(id));
        setFarmer(current || null);
      }

      // 2. Stock History (Purchases & Deliveries)
      if (sRes.status === 'fulfilled') {
        const rawHist = Array.isArray(sRes.value?.history) ? sRes.value.history : [];
        setStockHistory(rawHist);
      }

      // 3. Loans
      if (lRes.status === 'fulfilled') {
        const rawLoans = Array.isArray(lRes.value) ? lRes.value : lRes.value?.loans || [];
        setLoans(rawLoans.filter(l => String(l.farmer_id) === String(id)));
      }

      // 4. Grain Types Map
      if (gRes.status === 'fulfilled') {
        const rawG = Array.isArray(gRes.value) ? gRes.value : gRes.value?.grain_types || [];
        setGrainTypes(rawG);
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    loadFarmerData();
  }, [loadFarmerData]);

  // Lookup map for grain variety names
  const grainTypeMap = useMemo(() => {
    const map = {};
    grainTypes.forEach(g => {
      map[g.id] = g.name;
    });
    return map;
  }, [grainTypes]);

  // Filtered movements for this farmer
  const farmerPurchases = useMemo(() => {
    return stockHistory
      .filter(m => {
        const isFarmer = String(m.farmer_id) === String(id);
        const isReceive = String(m.movement_type || m.type || '').toLowerCase() === 'receive';
        return isFarmer && isReceive;
      })
      .map(m => {
        const qty = Number(m.quantity || 0);
        const rate = Number(m.rate || 0);
        const total = Math.round(qty * rate * 100) / 100;
        return {
          ...m,
          quantity: qty,
          rate,
          total,
          varietyName: grainTypeMap[m.grain_type_id || m.item_id] || m.item_name || 'Paddy / Grain',
          date: m.timestamp || m.created_at || m.date,
        };
      });
  }, [stockHistory, id, grainTypeMap]);

  const farmerDeliveries = useMemo(() => {
    return stockHistory
      .filter(m => {
        const isFarmer = String(m.farmer_id) === String(id);
        const isDeliver = String(m.movement_type || m.type || '').toLowerCase() === 'deliver';
        return isFarmer && isDeliver;
      })
      .map(m => {
        const qty = Number(m.quantity || 0);
        const rate = Number(m.rate || 0);
        return {
          ...m,
          quantity: qty,
          rate,
          millName: m.mill_name || m.millName || 'Local Mill',
          varietyName: grainTypeMap[m.grain_type_id || m.item_id] || m.item_name || 'Grain',
          date: m.timestamp || m.created_at || m.date,
        };
      });
  }, [stockHistory, id, grainTypeMap]);

  // Aggregate Calculations
  const stockMetrics = useMemo(() => {
    const totalReceived = farmerPurchases.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
    const deliveredToMills = farmerDeliveries.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
    const remainingStock = Math.max(0, totalReceived - deliveredToMills);

    return {
      totalReceived,
      deliveredToMills,
      remainingStock,
    };
  }, [farmerPurchases, farmerDeliveries]);

  // Financial Figures
  const financialMetrics = useMemo(() => {
    // 1. Purchases & Stock Payable
    const totalPurchaseAmount = farmerPurchases.reduce((sum, p) => sum + Number(p.total || 0), 0);
    const totalPaymentsPaid = payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
    const outstandingPayableForStock = Math.max(0, totalPurchaseAmount - totalPaymentsPaid);

    // 2. Loans (Advances & Loans are treated identically under the label "Loans")
    let totalLoansGiven = 0;
    let totalLoansOutstanding = 0;

    loans.forEach(l => {
      const p = Number(l.principal || l.amount || 0);
      const bal = Number(l.outstanding_balance ?? l.amount ?? l.principal ?? 0);
      totalLoansGiven += p;
      totalLoansOutstanding += bal;
    });

    const totalLoansRepaid = Math.max(0, totalLoansGiven - totalLoansOutstanding);

    // 3. Approved Net Financial Settlement Rule:
    // Difference = Outstanding loan - outstanding amount payable for received stock
    const settlement = calculateSettlement(totalLoansOutstanding, outstandingPayableForStock);

    return {
      totalPurchaseAmount,
      totalPaymentsPaid,
      outstandingPayableForStock,
      totalLoansGiven,
      totalLoansRepaid,
      totalLoansOutstanding,
      settlement,
    };
  }, [farmerPurchases, payments, loans]);

  // Handle Recording a Payment to Farmer
  const handleRecordPayment = e => {
    e.preventDefault();
    setPaymentError('');

    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      setPaymentError('Please enter a valid payment amount greater than zero.');
      return;
    }

    const newPayment = {
      id: Date.now(),
      farmerId: Number(id),
      amount: amt,
      date: paymentDate || new Date().toISOString().slice(0, 10),
      mode: paymentMode,
      notes: paymentNotes.trim() || 'Payment for grain purchase',
    };

    setPayments(prev => [newPayment, ...prev]);
    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentNotes('');
    setSuccess(`✓ Payment of ${rupees(amt)} recorded for ${farmer?.name || 'farmer'}.`);
  };

  // Recent Activity Feed (Chronological combination)
  const recentActivities = useMemo(() => {
    const list = [];

    farmerPurchases.forEach(p => {
      list.push({
        id: `p-${p.id || p.date}`,
        type: 'Purchase',
        tag: 'Grain Intake',
        color: 'var(--green-light)',
        title: `Purchased ${formatNumber(p.quantity)} quintal of ${p.varietyName}`,
        amount: rupees(p.total),
        date: p.date,
        detail: `@ ${rupees(p.rate)}/quintal`,
      });
    });

    loans.forEach(l => {
      list.push({
        id: `l-${l.id || l.created_at}`,
        type: 'Loan',
        tag: 'Loan Issued',
        color: 'var(--gold)',
        title: `Loan issued to farmer`,
        amount: rupees(l.principal || l.amount),
        date: l.created_at || l.date,
        detail: l.interest_rate_pa ? `${l.interest_rate_pa}% p.a. interest` : 'Interest-free',
      });
    });

    farmerDeliveries.forEach(d => {
      list.push({
        id: `d-${d.id || d.date}`,
        type: 'Delivery',
        tag: 'Mill Delivery',
        color: 'var(--cyan, #38bdf8)',
        title: `Delivered ${formatNumber(d.quantity)} quintal to ${d.millName}`,
        amount: d.rate ? rupees(d.rate * d.quantity) : '—',
        date: d.date,
        detail: d.rate ? `@ ${rupees(d.rate)} delivery price` : d.varietyName,
      });
    });

    payments.forEach(pay => {
      list.push({
        id: `pay-${pay.id}`,
        type: 'Payment',
        tag: 'Payment to Farmer',
        color: '#a78bfa',
        title: `Payment made to farmer (${pay.mode})`,
        amount: rupees(pay.amount),
        date: pay.date,
        detail: pay.notes || 'Settlement payment',
      });
    });

    return list
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 8);
  }, [farmerPurchases, loans, farmerDeliveries, payments]);

  if (loading && !farmer) {
    return (
      <div className="panel" style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontSize: 32, margin: 0 }}>⏳</p>
        <p style={{ marginTop: 12, color: 'var(--muted)' }}>Loading farmer dashboard...</p>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="panel" style={{ padding: 36, textAlign: 'center' }}>
        <h2>Farmer Not Found</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 20 }}>
          The requested farmer producer record does not exist or was removed.
        </p>
        <Link to="/commissiondar/farmers" className="btn btn-secondary">
          ← Back to Farmers Network
        </Link>
      </div>
    );
  }

  const { settlement } = financialMetrics;

  return (
    <div className="commissiondar-farmer-dashboard-page">
      {/* Top Breadcrumb & Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Link
          to="/commissiondar/farmers"
          className="btn btn-ghost"
          style={{ padding: '6px 14px', fontSize: '0.86rem' }}
        >
          ← Back to Farmers Network
        </Link>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link
            to="/commissiondar/stock"
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.86rem' }}
          >
            📥 Receive Grain
          </Link>
          <Link
            to="/commissiondar/loans"
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.86rem' }}
          >
            💰 Issue Loan
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowPaymentModal(true)}
            style={{ padding: '8px 16px', fontSize: '0.86rem' }}
          >
            💳 Record Payment
          </button>
        </div>
      </div>

      {error && (
        <div className="panel form-error" role="alert" style={{ padding: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {success && (
        <div
          className="panel"
          role="status"
          style={{
            padding: 14,
            marginBottom: 16,
            color: 'var(--green-light)',
            borderLeft: '4px solid var(--green)',
          }}
        >
          {success}
        </div>
      )}

      {/* 1. Farmer Profile at Top */}
      <div
        className="panel"
        style={{
          padding: 24,
          borderRadius: 18,
          border: '1px solid var(--border)',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(0, 240, 152, 0.2) 0%, rgba(0, 201, 120, 0.08) 100%)',
                border: '1px solid rgba(0, 240, 152, 0.35)',
                color: 'var(--green-glow)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              🌾
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{farmer.name}</h1>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(255, 255, 255, 0.08)',
                    fontSize: '0.8rem',
                    color: 'var(--gold)',
                    fontWeight: 700,
                  }}
                >
                  ID #{farmer.id}
                </span>
              </div>
              <p
                style={{
                  color: 'var(--muted)',
                  fontSize: '0.9rem',
                  margin: '4px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <span>📍 Village: <strong style={{ color: '#cbd5e1' }}>{farmer.village || 'Not specified'}</strong></span>
                <span>•</span>
                <span>📞 Phone: <strong style={{ color: '#cbd5e1' }}>{farmer.phone || 'No phone'}</strong></span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={loadFarmerData}
              style={{ fontSize: '0.85rem' }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      {/* 2. Clear Financial Settlement Status Banner */}
      <div
        className="panel"
        style={{
          padding: '20px 24px',
          borderRadius: 16,
          marginBottom: 24,
          border:
            settlement.status === 'farmer_pays_commissiondar'
              ? '1px solid rgba(245, 158, 11, 0.45)'
              : settlement.status === 'commissiondar_pays_farmer'
              ? '1px solid rgba(0, 240, 152, 0.45)'
              : '1px solid var(--border)',
          background:
            settlement.status === 'farmer_pays_commissiondar'
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.03) 100%)'
              : settlement.status === 'commissiondar_pays_farmer'
              ? 'linear-gradient(135deg, rgba(0, 240, 152, 0.12) 0%, rgba(0, 240, 152, 0.03) 100%)'
              : 'var(--surface)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.78rem',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                fontWeight: 700,
                color:
                  settlement.colorTone === 'gold'
                    ? 'var(--gold)'
                    : settlement.colorTone === 'green'
                    ? 'var(--green-light)'
                    : 'var(--muted)',
              }}
            >
              NET SETTLEMENT STATUS
            </span>
            <h2
              style={{
                margin: '4px 0',
                fontSize: '1.45rem',
                color:
                  settlement.colorTone === 'gold'
                    ? '#fbbf24'
                    : settlement.colorTone === 'green'
                    ? 'var(--green-glow)'
                    : 'var(--ink)',
              }}
            >
              {settlement.label}
            </h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.88rem' }}>
              {settlement.subtext}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block' }}>
              Final Settlement Amount
            </span>
            <span
              style={{
                fontSize: '2.1rem',
                fontWeight: 800,
                color:
                  settlement.colorTone === 'gold'
                    ? '#fbbf24'
                    : settlement.colorTone === 'green'
                    ? 'var(--green-glow)'
                    : 'var(--ink)',
              }}
            >
              {rupees(settlement.amount)}
            </span>
          </div>
        </div>

        {/* Breakdown bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: '0.84rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--muted)' }}>Outstanding Loan:</span>{' '}
            <strong style={{ color: '#fbbf24' }}>{rupees(financialMetrics.totalLoansOutstanding)}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--muted)' }}>Stock Payable:</span>{' '}
            <strong style={{ color: 'var(--green-light)' }}>
              {rupees(financialMetrics.outstandingPayableForStock)}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--muted)' }}>Formula:</span>{' '}
            <span style={{ color: 'var(--ink-soft)' }}>Loan Balance − Stock Payable</span>
          </div>
        </div>
      </div>

      {/* 3. Three Stock Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="panel" style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>
            Total Received
          </p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.85rem', color: 'var(--green-light)' }}>
            {formatNumber(stockMetrics.totalReceived)}{' '}
            <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--muted)' }}>quintals</span>
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Grain received from {farmer.name}
          </p>
        </div>

        <div className="panel" style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>
            Delivered to Mills
          </p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.85rem', color: 'var(--cyan, #38bdf8)' }}>
            {formatNumber(stockMetrics.deliveredToMills)}{' '}
            <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--muted)' }}>quintals</span>
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Dispatched to partner rice mills
          </p>
        </div>

        <div className="panel" style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 600 }}>
            Remaining Stock
          </p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.85rem', color: 'var(--gold)' }}>
            {formatNumber(stockMetrics.remainingStock)}{' '}
            <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--muted)' }}>quintals</span>
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Balance in possession / storage
          </p>
        </div>
      </div>

      {/* 4. Four Simple Tabs (Only active tab records appear) */}
      <div
        className="panel"
        style={{
          padding: 24,
          borderRadius: 18,
          border: '1px solid var(--border)',
          marginBottom: 24,
        }}
      >
        {/* Tab Buttons */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            borderBottom: '1px solid var(--border)',
            paddingBottom: 14,
            marginBottom: 20,
            overflowX: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('purchase')}
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              fontSize: '0.9rem',
              fontWeight: 650,
              cursor: 'pointer',
              border: activeTab === 'purchase' ? '1px solid rgba(0, 240, 152, 0.45)' : '1px solid transparent',
              background: activeTab === 'purchase' ? 'rgba(0, 201, 120, 0.18)' : 'transparent',
              color: activeTab === 'purchase' ? 'var(--green-glow)' : 'var(--muted)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            🌾 Purchase ({farmerPurchases.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('loans')}
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              fontSize: '0.9rem',
              fontWeight: 650,
              cursor: 'pointer',
              border: activeTab === 'loans' ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid transparent',
              background: activeTab === 'loans' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
              color: activeTab === 'loans' ? '#fbbf24' : 'var(--muted)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            💰 Loans ({loans.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deliveries')}
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              fontSize: '0.9rem',
              fontWeight: 650,
              cursor: 'pointer',
              border: activeTab === 'deliveries' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid transparent',
              background: activeTab === 'deliveries' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
              color: activeTab === 'deliveries' ? 'var(--cyan, #38bdf8)' : 'var(--muted)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            🚢 Deliveries ({farmerDeliveries.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              fontSize: '0.9rem',
              fontWeight: 650,
              cursor: 'pointer',
              border: activeTab === 'payments' ? '1px solid rgba(167, 139, 250, 0.45)' : '1px solid transparent',
              background: activeTab === 'payments' ? 'rgba(167, 139, 250, 0.18)' : 'transparent',
              color: activeTab === 'payments' ? '#c4b5fd' : 'var(--muted)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            💳 Payments ({payments.length})
          </button>
        </div>

        {/* TAB 1: PURCHASE TAB */}
        {activeTab === 'purchase' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>Grain Purchases & Receipts</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
                  Date-wise purchases of grain from {farmer.name} with rate per quintal.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>Total Purchase Amount</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--green-light)' }}>
                  {rupees(financialMetrics.totalPurchaseAmount)}
                </strong>
              </div>
            </div>

            {farmerPurchases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 36 }}>
                <p style={{ fontSize: 32, margin: 0 }}>🌾</p>
                <h4 style={{ margin: '10px 0 4px' }}>No grain purchases recorded yet</h4>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                  Record an intake receipt in Commissiondar Stock to register grain from {farmer.name}.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Grain Variety</th>
                      <th style={{ textAlign: 'right' }}>Quantity</th>
                      <th style={{ textAlign: 'right' }}>Purchase Rate / Quintal</th>
                      <th style={{ textAlign: 'right' }}>Total Purchase Amount</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farmerPurchases.map(p => (
                      <tr key={p.id || p.date}>
                        <td>{formatDate(p.date)}</td>
                        <td style={{ fontWeight: 650, color: 'var(--ink)' }}>{p.varietyName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatNumber(p.quantity)} quintal</td>
                        <td style={{ textAlign: 'right' }}>{rupees(p.rate)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green-light)' }}>
                          {rupees(p.total)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.75rem',
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: 'var(--green-light)',
                            }}
                          >
                            Received
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LOANS TAB */}
        {activeTab === 'loans' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>Farmer Loans & Advances</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
                  Total loans given, repayments, and outstanding loan balance.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>Outstanding Loan Balance</span>
                <strong style={{ fontSize: '1.25rem', color: '#fbbf24' }}>
                  {rupees(financialMetrics.totalLoansOutstanding)}
                </strong>
              </div>
            </div>

            {loans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 36 }}>
                <p style={{ fontSize: 32, margin: 0 }}>💰</p>
                <h4 style={{ margin: '10px 0 4px' }}>No active loans for {farmer.name}</h4>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                  You can issue a seasonal loan or crop advance from the Farmer Loans screen.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Loan Date</th>
                      <th style={{ textAlign: 'right' }}>Principal Amount</th>
                      <th style={{ textAlign: 'center' }}>Interest Rate</th>
                      <th style={{ textAlign: 'right' }}>Repaid Amount</th>
                      <th style={{ textAlign: 'right' }}>Outstanding Balance</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map(l => {
                      const p = Number(l.principal || l.amount || 0);
                      const bal = Number(l.outstanding_balance ?? l.amount ?? l.principal ?? 0);
                      const repaid = Math.max(0, p - bal);
                      const isSettled = bal <= 0;

                      return (
                        <tr key={l.id}>
                          <td>{formatDate(l.created_at || l.date)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 650 }}>{rupees(p)}</td>
                          <td style={{ textAlign: 'center', color: 'var(--muted)' }}>
                            {l.interest_rate_pa ? `${l.interest_rate_pa}% p.a.` : '0%'}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--cyan, #38bdf8)' }}>
                            {rupees(repaid)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 750, color: isSettled ? 'var(--muted)' : '#fbbf24' }}>
                            {rupees(bal)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: '0.75rem',
                                background: isSettled ? 'rgba(255,255,255,0.06)' : 'rgba(245, 158, 11, 0.15)',
                                color: isSettled ? 'var(--muted)' : '#fbbf24',
                              }}
                            >
                              {isSettled ? 'Settled' : 'Active'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DELIVERIES TAB */}
        {activeTab === 'deliveries' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>Mill Deliveries</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
                  Grain dispatched to mills. Note: Mill delivery price is separate from farmer purchase price.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>Total Delivered to Mills</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--cyan, #38bdf8)' }}>
                  {formatNumber(stockMetrics.deliveredToMills)} quintals
                </strong>
              </div>
            </div>

            {farmerDeliveries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 36 }}>
                <p style={{ fontSize: 32, margin: 0 }}>🚢</p>
                <h4 style={{ margin: '10px 0 4px' }}>No mill deliveries recorded</h4>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                  Dispatches delivered to partner mills from Commissiondar Stock will appear here.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Delivery Date</th>
                      <th>Mill Destination</th>
                      <th>Grain Variety</th>
                      <th style={{ textAlign: 'right' }}>Quantity Delivered</th>
                      <th style={{ textAlign: 'right' }}>Mill Delivery Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farmerDeliveries.map(d => (
                      <tr key={d.id || d.date}>
                        <td>{formatDate(d.date)}</td>
                        <td style={{ fontWeight: 650, color: 'var(--ink)' }}>{d.millName}</td>
                        <td>{d.varietyName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatNumber(d.quantity)} quintals</td>
                        <td style={{ textAlign: 'right', color: 'var(--gold)' }}>
                          {d.rate ? rupees(d.rate) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0 }}>Payments to Farmer</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
                  Payment history for received grain and outstanding payable balance.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowPaymentModal(true)}
                style={{ padding: '6px 14px', fontSize: '0.84rem' }}
              >
                + Record Payment
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                marginBottom: 18,
                padding: 14,
                borderRadius: 12,
                background: 'var(--surface-soft)',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>Total Grain Payable</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--ink)' }}>
                  {rupees(financialMetrics.totalPurchaseAmount)}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>Total Payments Made</span>
                <strong style={{ fontSize: '1.1rem', color: '#a78bfa' }}>
                  {rupees(financialMetrics.totalPaymentsPaid)}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>Remaining Payable</span>
                <strong style={{ fontSize: '1.1rem', color: 'var(--green-light)' }}>
                  {rupees(financialMetrics.outstandingPayableForStock)}
                </strong>
              </div>
            </div>

            {payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 36 }}>
                <p style={{ fontSize: 32, margin: 0 }}>💳</p>
                <h4 style={{ margin: '10px 0 4px' }}>No payments recorded yet</h4>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                  Click "Record Payment" above to log payment transactions made to {farmer.name}.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Payment Date</th>
                      <th style={{ textAlign: 'right' }}>Amount Paid</th>
                      <th>Payment Mode</th>
                      <th>Remarks / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(pay => (
                      <tr key={pay.id}>
                        <td>{formatDate(pay.date)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#a78bfa' }}>
                          {rupees(pay.amount)}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.75rem',
                              background: 'rgba(255,255,255,0.06)',
                            }}
                          >
                            {pay.mode || 'Cash'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{pay.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Compact Recent Transaction History */}
      <div
        className="panel"
        style={{
          padding: 24,
          borderRadius: 18,
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Compact Recent History</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
            Unified chronological audit trail of grain receipts, loan disbursements, and payment settlements.
          </p>
        </div>

        {recentActivities.length === 0 ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24, margin: 0 }}>
            No recent activity recorded for this farmer.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentActivities.map(act => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'var(--surface-soft)',
                  border: '1px solid var(--border)',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: 'rgba(255, 255, 255, 0.06)',
                      color: act.color,
                      border: '1px solid var(--border)',
                    }}
                  >
                    {act.tag}
                  </span>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--ink)' }}>{act.title}</strong>
                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block' }}>
                      {formatDate(act.date)} {act.detail ? `• ${act.detail}` : ''}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1rem', color: act.color }}>{act.amount}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Recording Modal */}
      {showPaymentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="panel"
            style={{
              width: '100%',
              maxWidth: 440,
              padding: 24,
              borderRadius: 18,
              border: '1px solid var(--border)',
            }}
          >
            <h3 style={{ margin: '0 0 4px' }}>Record Payment to Farmer</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
              Record a payment settlement against grain received from {farmer.name}.
            </p>

            {paymentError && (
              <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>
                {paymentError}
              </p>
            )}

            <form onSubmit={handleRecordPayment}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6, fontWeight: 600 }}>
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 25000"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6, fontWeight: 600 }}>
                  Payment Mode
                </label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / Digital</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6, fontWeight: 600 }}>
                  Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6, fontWeight: 600 }}>
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Advance settlement, harvest payment"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
