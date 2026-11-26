import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  getCommissiondarFarmerDashboard,
  getCommissiondarStock,
  getCommissiondarLoans,
  getCommissiondarGrainTypes,
  receiveCommissiondarStock,
  createCommissiondarLoan,
  repayCommissiondarLoan,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { rupees, formatNumber, formatDate, formatDateTime } from '../utils/formatters';

export default function CommissiondarFarmerDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [success, setSuccess] = useState('');

  // Backend Dashboard Summary Data (Source of truth)
  const [dashboardData, setDashboardData] = useState(null);

  // Raw Itemized Records for Tabs
  const [stockHistory, setStockHistory] = useState([]);
  const [loans, setLoans] = useState([]);
  const [grainTypes, setGrainTypes] = useState([]);

  // Active Tab: 'purchase' | 'loans' | 'deliveries' | 'payments'
  const [activeTab, setActiveTab] = useState('purchase');

  // Modal Dialog States
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanPrincipal, setLoanPrincipal] = useState('');
  const [loanInterestRate, setLoanInterestRate] = useState('0');
  const [loanSubmitting, setLoanSubmitting] = useState(false);
  const [loanError, setLoanError] = useState('');

  const [showRepayModal, setShowRepayModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repaySubmitting, setRepaySubmitting] = useState(false);
  const [repayError, setRepayError] = useState('');

  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receiveQty, setReceiveQty] = useState('');
  const [receiveRate, setReceiveRate] = useState('');
  const [receiveGrainId, setReceiveGrainId] = useState('');
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [receiveError, setReceiveError] = useState('');

  // Primary data loader
  const loadFarmerData = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError('');
    setNotFound(false);

    try {
      const [dashRes, stockRes, loansRes, grainsRes] = await Promise.allSettled([
        getCommissiondarFarmerDashboard(id, token),
        getCommissiondarStock(token),
        getCommissiondarLoans(token),
        getCommissiondarGrainTypes(token),
      ]);

      // 1. Core Farmer Dashboard & Settlement Summary
      if (dashRes.status === 'fulfilled') {
        setDashboardData(dashRes.value);
      } else {
        const err = dashRes.reason;
        if (err?.status === 404) {
          setNotFound(true);
          return;
        }
        setError(describeError(err));
      }

      // 2. Stock Movements (Purchases and Deliveries)
      if (stockRes.status === 'fulfilled') {
        const rawHistory = Array.isArray(stockRes.value?.history)
          ? stockRes.value.history
          : Array.isArray(stockRes.value)
          ? stockRes.value
          : [];
        setStockHistory(rawHistory);
      }

      // 3. Loans & Advances (Advances are loans)
      if (loansRes.status === 'fulfilled') {
        const rawLoans = Array.isArray(loansRes.value)
          ? loansRes.value
          : Array.isArray(loansRes.value?.loans)
          ? loansRes.value.loans
          : [];
        setLoans(rawLoans.filter(l => String(l.farmer_id) === String(id)));
      }

      // 4. Custom Grain Types Map
      if (grainsRes.status === 'fulfilled') {
        const rawG = Array.isArray(grainsRes.value)
          ? grainsRes.value
          : Array.isArray(grainsRes.value?.grain_types)
          ? grainsRes.value.grain_types
          : [];
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

  // Filtered purchases (inward stock receipts from this farmer)
  const farmerPurchases = useMemo(() => {
    return stockHistory
      .filter(m => {
        const isFarmer = String(m.farmer_id) === String(id);
        const mType = String(m.movement_type || '').toLowerCase();
        const isReceive = mType === 'received_from_farmer' || mType.includes('receive');
        return isFarmer && isReceive;
      })
      .map(m => {
        const qty = Number(m.quantity || 0);
        const rate = m.rate !== null && m.rate !== undefined && m.rate !== '' ? Number(m.rate) : null;
        const total = rate !== null ? Math.round(qty * rate * 100) / 100 : null;
        const varietyName =
          grainTypeMap[m.grain_type_id] ||
          grainTypeMap[m.item_id] ||
          m.item_name ||
          'Paddy / Grain';
        return {
          id: m.id,
          quantity: qty,
          rate,
          total,
          varietyName,
          date: m.created_at || m.timestamp || m.date,
          hasMissingRate: rate === null,
        };
      });
  }, [stockHistory, id, grainTypeMap]);

  // Filtered deliveries (dispatches from this farmer forwarded to rice mills)
  const farmerDeliveries = useMemo(() => {
    return stockHistory
      .filter(m => {
        const isFarmer = String(m.farmer_id) === String(id);
        const mType = String(m.movement_type || '').toLowerCase();
        const isDeliver = mType === 'delivered_to_mill' || mType.includes('deliver');
        return isFarmer && isDeliver;
      })
      .map(m => {
        const qty = Math.abs(Number(m.quantity || 0));
        const rate = m.rate !== null && m.rate !== undefined && m.rate !== '' ? Number(m.rate) : null;
        const varietyName =
          grainTypeMap[m.grain_type_id] ||
          grainTypeMap[m.item_id] ||
          m.item_name ||
          'Grain';
        return {
          id: m.id,
          quantity: qty,
          rate,
          millName: m.mill_name || 'Partner Mill',
          varietyName,
          date: m.created_at || m.timestamp || m.date,
        };
      });
  }, [stockHistory, id, grainTypeMap]);

  // Loans summary figures
  const loanMetrics = useMemo(() => {
    let totalLent = 0;
    let totalRepaid = 0;
    let totalOutstanding = 0;

    loans.forEach(l => {
      const p = Number(l.principal || 0);
      const rep = Number(l.total_repaid || 0);
      const out = Number(l.outstanding !== undefined ? l.outstanding : p - rep);
      totalLent += p;
      totalRepaid += rep;
      totalOutstanding += Math.max(0, out);
    });

    return {
      totalLent,
      totalRepaid,
      totalOutstanding,
    };
  }, [loans]);

  // Recent unified activities feed (Purchases, Loans, Deliveries)
  const recentActivities = useMemo(() => {
    const list = [];

    farmerPurchases.forEach(p => {
      list.push({
        id: `p-${p.id}`,
        type: 'Purchase',
        tag: 'Grain Intake',
        color: 'var(--green-light)',
        title: `Received ${formatNumber(p.quantity)} quintals of ${p.varietyName}`,
        amount: p.total !== null ? rupees(p.total) : 'Rate Pending',
        date: p.date,
        detail: p.rate !== null ? `@ ${rupees(p.rate)}/quintal` : 'Purchase rate not yet recorded',
      });
    });

    loans.forEach(l => {
      list.push({
        id: `l-${l.id}`,
        type: 'Loan',
        tag: 'Loan Issued',
        color: 'var(--gold)',
        title: `Loan issued: ${rupees(l.principal)}`,
        amount: rupees(l.principal),
        date: l.issued_at || l.created_at || l.date,
        detail: l.interest_rate_pa ? `${l.interest_rate_pa}% p.a. interest` : 'Interest-free',
      });
    });

    farmerDeliveries.forEach(d => {
      list.push({
        id: `d-${d.id}`,
        type: 'Delivery',
        tag: 'Mill Delivery',
        color: 'var(--cyan, #38bdf8)',
        title: `Dispatched ${formatNumber(d.quantity)} quintals to ${d.millName}`,
        amount: d.rate !== null ? rupees(d.rate * d.quantity) : `${formatNumber(d.quantity)} quintals`,
        date: d.date,
        detail: d.rate !== null ? `@ ${rupees(d.rate)} mill delivery price` : d.varietyName,
      });
    });

    return list
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 8);
  }, [farmerPurchases, loans, farmerDeliveries]);

  // Issue Loan submission handler
  const handleIssueLoan = async e => {
    e.preventDefault();
    setLoanError('');
    const amt = Number(loanPrincipal);
    if (!amt || amt <= 0) {
      setLoanError('Please enter a valid loan principal amount.');
      return;
    }

    setLoanSubmitting(true);
    try {
      await createCommissiondarLoan(
        {
          farmer_id: Number(id),
          principal: amt,
          interest_rate_pa: Number(loanInterestRate) || 0,
        },
        token
      );
      setSuccess(`✓ Successfully issued loan of ${rupees(amt)} to farmer.`);
      setShowLoanModal(false);
      setLoanPrincipal('');
      setLoanInterestRate('0');
      await loadFarmerData();
    } catch (err) {
      setLoanError(describeError(err));
    } finally {
      setLoanSubmitting(false);
    }
  };

  // Repay Loan submission handler
  const handleRepayLoan = async e => {
    e.preventDefault();
    setRepayError('');
    const amt = Number(repayAmount);
    if (!amt || amt <= 0) {
      setRepayError('Please enter a valid repayment amount.');
      return;
    }

    setRepaySubmitting(true);
    try {
      await repayCommissiondarLoan(
        {
          loan_id: selectedLoan.id,
          amount: amt,
        },
        token
      );
      setSuccess(`✓ Successfully recorded repayment of ${rupees(amt)} for Loan #${selectedLoan.id}.`);
      setShowRepayModal(false);
      setSelectedLoan(null);
      setRepayAmount('');
      await loadFarmerData();
    } catch (err) {
      setRepayError(describeError(err));
    } finally {
      setRepaySubmitting(false);
    }
  };

  // Receive Grain submission handler
  const handleReceiveStock = async e => {
    e.preventDefault();
    setReceiveError('');
    const qty = Number(receiveQty);
    if (!qty || qty <= 0) {
      setReceiveError('Please enter a valid grain quantity.');
      return;
    }
    if (!receiveGrainId) {
      setReceiveError('Please select a grain variety.');
      return;
    }

    const payload = {
      farmer_id: Number(id),
      grain_type_id: Number(receiveGrainId),
      quantity: qty,
    };

    if (receiveRate && Number(receiveRate) > 0) {
      payload.rate = Number(receiveRate);
    }

    setReceiveSubmitting(true);
    try {
      await receiveCommissiondarStock(payload, token);
      setSuccess(`✓ Recorded intake of ${qty} quintals from farmer.`);
      setShowReceiveModal(false);
      setReceiveQty('');
      setReceiveRate('');
      setReceiveGrainId('');
      await loadFarmerData();
    } catch (err) {
      setReceiveError(describeError(err));
    } finally {
      setReceiveSubmitting(false);
    }
  };

  // 1. Loading State
  if (loading && !dashboardData) {
    return (
      <div className="panel" style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontSize: 32, margin: 0 }}>⏳</p>
        <p style={{ marginTop: 12, color: 'var(--muted)', fontSize: '0.95rem' }}>
          Loading farmer dashboard & backend settlement ledger...
        </p>
      </div>
    );
  }

  // 2. Account Isolation / 404 State
  if (notFound) {
    return (
      <div className="panel" style={{ padding: 36, textAlign: 'center', maxWidth: 600, margin: '40px auto' }}>
        <p style={{ fontSize: 36, margin: '0 0 12px' }}>🔒</p>
        <h2 style={{ margin: '0 0 8px', color: '#f87171' }}>Farmer Not Accessible</h2>
        <p style={{ color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
          This farmer record does not belong to your logged-in Commissiondar business account,
          or the record has been deactivated. In accordance with strict account isolation rules,
          Commissiondars can only view and manage farmers registered under their own account.
        </p>
        <Link to="/commissiondar/farmers" className="btn btn-secondary">
          ← Back to My Farmers List
        </Link>
      </div>
    );
  }

  // Extract backend-verified sections
  const farmer = dashboardData?.farmer || {};
  const stock = dashboardData?.stock || { received: 0, delivered_to_mills: 0, remaining: 0 };
  const purchases = dashboardData?.purchases || { total_value: 0, quantity_without_rate: 0 };
  const payments = dashboardData?.payments || { total_paid: 0 };
  const loansData = dashboardData?.loans || { active_loans: 0, outstanding: 0 };
  const settlement = dashboardData?.settlement || {
    status: 'settled',
    payable_by: null,
    payable_to: null,
    amount: 0,
    message: 'Account settled',
  };

  // Determine settlement banner color tone & styling
  const isIncomplete = settlement.status === 'incomplete_purchase_rates';
  const isCommissiondarOwes = settlement.status === 'commissiondar_owes_farmer' || settlement.payable_by === 'commissiondar';
  const isFarmerOwes = settlement.status === 'farmer_owes_commissiondar' || settlement.payable_by === 'farmer';
  const isSettled = settlement.status === 'settled';

  return (
    <div className="commissiondar-farmer-dashboard-page">
      {/* Top Breadcrumb & Quick Actions */}
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
          ← Back to Farmers List
        </Link>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowReceiveModal(true)}
            style={{ padding: '8px 16px', fontSize: '0.86rem' }}
          >
            📥 Receive Grain
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowLoanModal(true)}
            style={{ padding: '8px 16px', fontSize: '0.86rem' }}
          >
            💰 Issue Loan
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadFarmerData}
            style={{ padding: '8px 14px', fontSize: '0.86rem' }}
            title="Refresh dashboard from backend"
          >
            ↻ Refresh
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
                width: 52,
                height: 52,
                borderRadius: 16,
                background: 'linear-gradient(135deg, rgba(0, 240, 152, 0.2) 0%, rgba(0, 201, 120, 0.08) 100%)',
                border: '1px solid rgba(0, 240, 152, 0.35)',
                color: 'var(--green-glow)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 24,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              🌾
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{farmer.name}</h1>
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
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(0, 201, 120, 0.12)',
                    fontSize: '0.78rem',
                    color: 'var(--green-light)',
                    fontWeight: 650,
                  }}
                >
                  Active Farmer
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
        </div>
      </div>

      {/* 2. Clear Financial Settlement Status Banner */}
      <div
        className="panel"
        style={{
          padding: '22px 24px',
          borderRadius: 18,
          marginBottom: 24,
          border: isIncomplete
            ? '1.5px solid rgba(245, 158, 11, 0.65)'
            : isCommissiondarOwes
            ? '1.5px solid rgba(0, 240, 152, 0.55)'
            : isFarmerOwes
            ? '1.5px solid rgba(245, 158, 11, 0.55)'
            : '1px solid var(--border)',
          background: isIncomplete
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(245, 158, 11, 0.04) 100%)'
            : isCommissiondarOwes
            ? 'linear-gradient(135deg, rgba(0, 240, 152, 0.14) 0%, rgba(0, 240, 152, 0.03) 100%)'
            : isFarmerOwes
            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(245, 158, 11, 0.03) 100%)'
            : 'var(--surface)',
          boxShadow: isIncomplete
            ? '0 0 25px rgba(245, 158, 11, 0.12)'
            : isCommissiondarOwes
            ? '0 0 25px rgba(0, 240, 152, 0.14)'
            : 'none',
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
                fontWeight: 800,
                color: isIncomplete
                  ? '#fbbf24'
                  : isCommissiondarOwes
                  ? 'var(--green-light)'
                  : isFarmerOwes
                  ? 'var(--gold)'
                  : 'var(--muted)',
              }}
            >
              {isIncomplete
                ? '⚠️ INCOMPLETE PURCHASE RATES'
                : isCommissiondarOwes
                ? 'COMMISSIONDAR OWES FARMER'
                : isFarmerOwes
                ? 'FARMER OWES COMMISSIONDAR'
                : 'ACCOUNT SETTLED'}
            </span>

            <h2
              style={{
                margin: '6px 0 4px',
                fontSize: '1.45rem',
                fontWeight: 800,
                color: isIncomplete
                  ? '#fbbf24'
                  : isCommissiondarOwes
                  ? 'var(--green-glow)'
                  : isFarmerOwes
                  ? '#fbbf24'
                  : 'var(--ink)',
              }}
            >
              {isIncomplete
                ? 'Settlement Pending: Missing Purchase Rates'
                : settlement.message || (isSettled ? 'Account Settled' : '')}
            </h2>

            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.88rem', maxWidth: 650 }}>
              {isIncomplete
                ? `One or more stock intake entries from ${farmer.name} do not have a purchase rate recorded (${purchases.quantity_without_rate} quintals pending). Final settlement cannot be calculated until purchase rates are updated.`
                : isCommissiondarOwes
                ? 'Net balance payable to farmer after deducting outstanding loan principal, interest, and prior payments.'
                : isFarmerOwes
                ? 'Outstanding farmer loans and advances exceed net payable amount for received grain.'
                : 'All grain intake receipts, loans, and payments for this farmer are fully settled.'}
            </p>
          </div>

          <div style={{ textAlign: 'right', minWidth: 160 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block' }}>
              Final Settlement Amount
            </span>
            <span
              style={{
                fontSize: '2.1rem',
                fontWeight: 850,
                letterSpacing: '-0.5px',
                color: isIncomplete
                  ? '#fbbf24'
                  : isCommissiondarOwes
                  ? 'var(--green-glow)'
                  : isFarmerOwes
                  ? '#fbbf24'
                  : 'var(--ink)',
              }}
            >
              {isIncomplete
                ? 'Pending Rates'
                : settlement.amount !== null && settlement.amount !== undefined
                ? rupees(settlement.amount)
                : '₹0'}
            </span>
          </div>
        </div>

        {/* Backend Formula Breakdown Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            marginTop: 18,
            paddingTop: 16,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.86rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--muted)' }}>Purchase Value:</span>{' '}
            <strong style={{ color: 'var(--green-light)' }}>
              {rupees(purchases.total_value)}
            </strong>
            {purchases.quantity_without_rate > 0 && (
              <span style={{ color: '#fbbf24', fontSize: '0.75rem', display: 'block' }}>
                ({purchases.quantity_without_rate} quintals pending rate)
              </span>
            )}
          </div>
          <div>
            <span style={{ color: 'var(--muted)' }}>Payments Paid:</span>{' '}
            <strong style={{ color: '#a78bfa' }}>{rupees(payments.total_paid)}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--muted)' }}>Outstanding Loan:</span>{' '}
            <strong style={{ color: '#fbbf24' }}>{rupees(loansData.outstanding)}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--muted)' }}>Source of Truth:</span>{' '}
            <span style={{ color: 'var(--ink-soft)' }}>Backend Service Ledger</span>
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
        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 650 }}>
            Total Received
          </p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', fontWeight: 800, color: 'var(--green-light)' }}>
            {formatNumber(stock.received)}{' '}
            <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--muted)' }}>quintals</span>
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Verified grain received from {farmer.name}
          </p>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 650 }}>
            Delivered to Mills
          </p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', fontWeight: 800, color: 'var(--cyan, #38bdf8)' }}>
            {formatNumber(stock.delivered_to_mills)}{' '}
            <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--muted)' }}>quintals</span>
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Dispatched to partner rice mills
          </p>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px', fontWeight: 650 }}>
            Remaining Stock
          </p>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.9rem', fontWeight: 800, color: 'var(--gold)' }}>
            {formatNumber(stock.remaining)}{' '}
            <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--muted)' }}>quintals</span>
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Balance in possession / storage
          </p>
        </div>
      </div>

      {/* 4. Four Tabs (Only the selected tab records appear) */}
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
              fontWeight: 700,
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
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'loans' ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid transparent',
              background: activeTab === 'loans' ? 'rgba(245, 158, 11, 0.18)' : 'transparent',
              color: activeTab === 'loans' ? '#fbbf24' : 'var(--muted)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            💰 Loans & Advances ({loans.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deliveries')}
            style={{
              padding: '9px 18px',
              borderRadius: 10,
              fontSize: '0.9rem',
              fontWeight: 700,
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
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'payments' ? '1px solid rgba(167, 139, 250, 0.45)' : '1px solid transparent',
              background: activeTab === 'payments' ? 'rgba(167, 139, 250, 0.18)' : 'transparent',
              color: activeTab === 'payments' ? '#c4b5fd' : 'var(--muted)',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            💳 Payments ({payments.total_paid > 0 ? '1+' : '0'})
          </button>
        </div>

        {/* TAB 1: PURCHASE TAB */}
        {activeTab === 'purchase' && (
          <div>
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
              <div>
                <h3 style={{ margin: 0 }}>Grain Purchases & Intake Receipts</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
                  Date-wise purchases of grain received from {farmer.name} with rate per quintal.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>Total Purchase Value</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--green-light)' }}>
                  {rupees(purchases.total_value)}
                </strong>
                {purchases.quantity_without_rate > 0 && (
                  <span style={{ color: '#fbbf24', fontSize: '0.78rem', display: 'block' }}>
                    ⚠️ {purchases.quantity_without_rate} quintals pending rate
                  </span>
                )}
              </div>
            </div>

            {farmerPurchases.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 36 }}>
                <p style={{ fontSize: 32, margin: 0 }}>🌾</p>
                <h4 style={{ margin: '10px 0 4px' }}>No grain purchases recorded yet</h4>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
                  Record an intake receipt in Commissiondar Stock to register grain received from {farmer.name}.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReceiveModal(true)}
                  style={{ fontSize: '0.86rem' }}
                >
                  + Record Grain Intake
                </button>
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
                      <th style={{ textAlign: 'right' }}>Total Purchase Value</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farmerPurchases.map(p => (
                      <tr key={p.id}>
                        <td>{formatDate(p.date)}</td>
                        <td style={{ fontWeight: 650, color: 'var(--ink)' }}>{p.varietyName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatNumber(p.quantity)} quintals</td>
                        <td style={{ textAlign: 'right' }}>
                          {p.rate !== null ? (
                            rupees(p.rate)
                          ) : (
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: '0.75rem',
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#fbbf24',
                                fontWeight: 700,
                              }}
                            >
                              Rate Missing
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: p.total !== null ? 'var(--green-light)' : '#fbbf24' }}>
                          {p.total !== null ? rupees(p.total) : 'Pending Rate'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '0.75rem',
                              background: p.hasMissingRate ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                              color: p.hasMissingRate ? '#fbbf24' : 'var(--green-light)',
                              fontWeight: 650,
                            }}
                          >
                            {p.hasMissingRate ? 'Incomplete Rate' : 'Received'}
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
              <div>
                <h3 style={{ margin: 0 }}>Farmer Loans & Crop Advances</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
                  Advances against future paddy and ordinary loans are the same category.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>Outstanding Balance</span>
                  <strong style={{ fontSize: '1.25rem', color: '#fbbf24' }}>
                    {rupees(loansData.outstanding)}
                  </strong>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLoanModal(true)}
                  style={{ padding: '6px 14px', fontSize: '0.84rem' }}
                >
                  + Issue Loan
                </button>
              </div>
            </div>

            {loans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 36 }}>
                <p style={{ fontSize: 32, margin: 0 }}>💰</p>
                <h4 style={{ margin: '10px 0 4px' }}>No active loans for {farmer.name}</h4>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
                  You can issue a crop advance or seasonal loan to {farmer.name}.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLoanModal(true)}
                  style={{ fontSize: '0.86rem' }}
                >
                  + Issue Crop Loan / Advance
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Loan ID</th>
                      <th>Issue Date</th>
                      <th style={{ textAlign: 'right' }}>Principal Amount</th>
                      <th style={{ textAlign: 'center' }}>Interest Rate</th>
                      <th style={{ textAlign: 'right' }}>Accrued Interest</th>
                      <th style={{ textAlign: 'right' }}>Repaid Amount</th>
                      <th style={{ textAlign: 'right' }}>Outstanding Balance</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map(l => {
                      const p = Number(l.principal || 0);
                      const rep = Number(l.total_repaid || 0);
                      const out = Number(l.outstanding !== undefined ? l.outstanding : Math.max(0, p - rep));
                      const isSettled = out <= 0;

                      return (
                        <tr key={l.id}>
                          <td style={{ fontWeight: 650 }}>#{l.id}</td>
                          <td>{formatDate(l.issued_at || l.created_at || l.date)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 650 }}>{rupees(p)}</td>
                          <td style={{ textAlign: 'center', color: 'var(--muted)' }}>
                            {l.interest_rate_pa ? `${l.interest_rate_pa}% p.a.` : '0%'}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--gold)' }}>
                            {rupees(l.interest_accrued || 0)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--cyan, #38bdf8)' }}>
                            {rupees(rep)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 750, color: isSettled ? 'var(--muted)' : '#fbbf24' }}>
                            {rupees(out)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: '0.75rem',
                                background: isSettled ? 'rgba(255,255,255,0.06)' : 'rgba(245, 158, 11, 0.15)',
                                color: isSettled ? 'var(--muted)' : '#fbbf24',
                                fontWeight: 650,
                              }}
                            >
                              {isSettled ? 'Settled' : 'Active'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {!isSettled && (
                              <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => {
                                  setSelectedLoan(l);
                                  setRepayAmount('');
                                  setRepayError('');
                                  setShowRepayModal(true);
                                }}
                                style={{ padding: '3px 10px', fontSize: '0.78rem' }}
                              >
                                Repay
                              </button>
                            )}
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
              <div>
                <h3 style={{ margin: 0 }}>Mill Deliveries</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
                  Grain dispatched to partner mills. Note: Mill delivery price is separate from farmer purchase price.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>Total Delivered to Mills</span>
                <strong style={{ fontSize: '1.25rem', color: 'var(--cyan, #38bdf8)' }}>
                  {formatNumber(stock.delivered_to_mills)} quintals
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
                      <tr key={d.id}>
                        <td>{formatDate(d.date)}</td>
                        <td style={{ fontWeight: 650, color: 'var(--ink)' }}>{d.millName}</td>
                        <td>{d.varietyName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatNumber(d.quantity)} quintals</td>
                        <td style={{ textAlign: 'right', color: 'var(--gold)' }}>
                          {d.rate !== null ? rupees(d.rate) : '—'}
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
              <div>
                <h3 style={{ margin: 0 }}>Payments to Farmer</h3>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
                  Cumulative payments made to {farmer.name} for grain purchases.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>Total Paid to Farmer</span>
                <strong style={{ fontSize: '1.25rem', color: '#a78bfa' }}>
                  {rupees(payments.total_paid)}
                </strong>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                marginBottom: 18,
                padding: 16,
                borderRadius: 14,
                background: 'var(--surface-soft)',
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>Total Grain Purchase Value</span>
                <strong style={{ fontSize: '1.15rem', color: 'var(--ink)' }}>
                  {rupees(purchases.total_value)}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>Total Payments Deducted</span>
                <strong style={{ fontSize: '1.15rem', color: '#a78bfa' }}>
                  {rupees(payments.total_paid)}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block' }}>Net Grain Payable (Pre-loan)</span>
                <strong style={{ fontSize: '1.15rem', color: 'var(--green-light)' }}>
                  {rupees(Math.max(0, purchases.total_value - payments.total_paid))}
                </strong>
              </div>
            </div>

            <div
              style={{
                padding: 18,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border)',
                fontSize: '0.88rem',
                color: 'var(--ink-soft)',
              }}
            >
              <p style={{ margin: '0 0 6px', fontWeight: 650, color: 'var(--ink)' }}>
                ℹ️ Payment Accounting Information
              </p>
              <p style={{ margin: 0, lineHeight: 1.5 }}>
                Payments made to this farmer are registered in the Commissiondar business ledger and deducted from the grain purchase payable before net settlement is computed.
              </p>
            </div>
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
            Unified chronological audit trail of grain receipts, loan disbursements, and dispatches.
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

      {/* Modal: Issue Loan to Farmer */}
      {showLoanModal && (
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
            <h3 style={{ margin: '0 0 4px' }}>Issue Loan / Crop Advance</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
              Issue a crop loan or financial advance to {farmer.name}.
            </p>

            {loanError && (
              <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>
                {loanError}
              </p>
            )}

            <form onSubmit={handleIssueLoan}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6, fontWeight: 600 }}>
                  Principal Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 10000"
                  value={loanPrincipal}
                  onChange={e => setLoanPrincipal(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6, fontWeight: 600 }}>
                  Interest Rate (% per annum)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0 for interest-free"
                  value={loanInterestRate}
                  onChange={e => setLoanInterestRate(e.target.value)}
                />
                <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                  Simple accrued interest is calculated daily on outstanding balance.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowLoanModal(false)}
                  disabled={loanSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loanSubmitting}>
                  {loanSubmitting ? 'Issuing...' : 'Issue Loan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Repay Loan */}
      {showRepayModal && selectedLoan && (
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
            <h3 style={{ margin: '0 0 4px' }}>Record Loan Repayment</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
              Loan #{selectedLoan.id} • Principal: {rupees(selectedLoan.principal)} • Outstanding: {rupees(selectedLoan.outstanding)}
            </p>

            {repayError && (
              <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>
                {repayError}
              </p>
            )}

            <form onSubmit={handleRepayLoan}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6, fontWeight: 600 }}>
                  Repayment Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 5000"
                  value={repayAmount}
                  onChange={e => setRepayAmount(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowRepayModal(false);
                    setSelectedLoan(null);
                  }}
                  disabled={repaySubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={repaySubmitting}>
                  {repaySubmitting ? 'Recording...' : 'Record Repayment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Receive Grain Intake from Farmer */}
      {showReceiveModal && (
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
            <h3 style={{ margin: '0 0 4px' }}>Receive Grain Intake</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
              Record inward grain intake from {farmer.name}.
            </p>

            {receiveError && (
              <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>
                {receiveError}
              </p>
            )}

            <form onSubmit={handleReceiveStock}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6, fontWeight: 600 }}>
                  Grain Variety *
                </label>
                <select
                  value={receiveGrainId}
                  onChange={e => setReceiveGrainId(e.target.value)}
                  required
                >
                  <option value="">Select grain type...</option>
                  {grainTypes.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.unit || 'quintal'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6, fontWeight: 600 }}>
                  Quantity (quintals) *
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  placeholder="e.g. 50"
                  value={receiveQty}
                  onChange={e => setReceiveQty(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6, fontWeight: 600 }}>
                  Purchase Rate per Quintal (₹) (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 2100 (leave blank if rate is pending)"
                  value={receiveRate}
                  onChange={e => setReceiveRate(e.target.value)}
                />
                <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>
                  If left blank, settlement status will mark purchase rate as pending.
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowReceiveModal(false)}
                  disabled={receiveSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={receiveSubmitting}>
                  {receiveSubmitting ? 'Receiving...' : 'Record Intake'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}