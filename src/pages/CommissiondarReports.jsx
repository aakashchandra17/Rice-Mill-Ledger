import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getCommissiondarFarmers,
  getCommissiondarLoans,
  getCommissiondarStock,
  getCommissiondarGrainTypes,
} from '../api';

const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const number = n => Number(n || 0).toLocaleString('en-IN');

export default function CommissiondarReports() {
  const { user, token } = useAuth();

  const userKey = user?.id || user?.phone || 'default';
  const millsStorageKey = `commissiondar_mills_${userKey}`;
  const ledgerStorageKey = `commissiondar_ledger_${userKey}`;
  const stockStorageKey = `commissiondar_stock_${userKey}`;

  const [loading, setLoading] = useState(true);
  const [farmers, setFarmers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [backendStock, setBackendStock] = useState([]);
  const [grainTypes, setGrainTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('mills'); // 'mills' | 'farmers' | 'stock'

  // Load My Mills
  const mills = useMemo(() => {
    try {
      const saved = localStorage.getItem(millsStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [millsStorageKey]);

  // Load Manual Mill Commission Ledger
  const ledgerEntries = useMemo(() => {
    try {
      const saved = localStorage.getItem(ledgerStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [ledgerStorageKey]);

  // Load Local Stock Movements
  const localStockMovements = useMemo(() => {
    try {
      const saved = localStorage.getItem(stockStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [stockStorageKey]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.allSettled([
      getCommissiondarFarmers(token),
      getCommissiondarLoans(token),
      getCommissiondarStock(token),
      getCommissiondarGrainTypes(token),
    ])
      .then(([farmersRes, loansRes, stockRes, grainRes]) => {
        if (farmersRes.status === 'fulfilled') {
          const list = Array.isArray(farmersRes.value)
            ? farmersRes.value
            : farmersRes.value?.farmers ?? [];
          setFarmers(list);
        }
        if (loansRes.status === 'fulfilled') {
          const list = Array.isArray(loansRes.value)
            ? loansRes.value
            : loansRes.value?.loans ?? [];
          setLoans(list);
        }
        if (stockRes.status === 'fulfilled') {
          const list = Array.isArray(stockRes.value)
            ? stockRes.value
            : stockRes.value?.stock ?? [];
          setBackendStock(list);
        }
        if (grainRes.status === 'fulfilled') {
          const list = Array.isArray(grainRes.value)
            ? grainRes.value
            : grainRes.value?.grain_types ?? [];
          setGrainTypes(list);
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Computed Summaries
  const stockSummary = useMemo(() => {
    let receivedQty = 0;
    let deliveredQty = 0;

    localStockMovements.forEach(m => {
      const qty = Number(m.quantity || 0);
      if (m.type === 'receive') receivedQty += qty;
      if (m.type === 'deliver') deliveredQty += qty;
    });

    // Also consider backend stock if available
    const inHandQty = Math.max(0, receivedQty - deliveredQty);

    return {
      receivedQty,
      deliveredQty,
      inHandQty,
    };
  }, [localStockMovements]);

  const loanSummary = useMemo(() => {
    let totalLent = 0;
    let totalOutstanding = 0;

    loans.forEach(l => {
      const principal = Number(l.amount || 0);
      const balance = Number(l.outstanding_balance ?? l.amount ?? 0);
      totalLent += principal;
      totalOutstanding += balance;
    });

    const totalRecovered = Math.max(0, totalLent - totalOutstanding);

    return {
      totalLent,
      totalRecovered,
      totalOutstanding,
    };
  }, [loans]);

  const commissionSummary = useMemo(() => {
    let totalAccrued = 0;
    let totalReceived = 0;

    ledgerEntries.forEach(e => {
      const amt = Number(e.amount || 0);
      if (e.type === 'accrual') totalAccrued += amt;
      if (e.type === 'receipt') totalReceived += amt;
    });

    const outstandingCommission = Math.max(0, totalAccrued - totalReceived);

    return {
      totalAccrued,
      totalReceived,
      outstandingCommission,
    };
  }, [ledgerEntries]);

  // Per-Mill breakdown
  const millReports = useMemo(() => {
    return mills.map(mill => {
      const millName = mill.name;

      // Deliveries to this mill
      const millDeliveries = localStockMovements.filter(
        m => m.type === 'deliver' && (m.mill_name || m.millName) === millName
      );
      const deliveredQty = millDeliveries.reduce((sum, m) => sum + Number(m.quantity || 0), 0);

      // Commission from this mill
      const millAccruals = ledgerEntries
        .filter(e => e.millName === millName && e.type === 'accrual')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const millReceipts = ledgerEntries
        .filter(e => e.millName === millName && e.type === 'receipt')
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const pendingBalance = Math.max(0, millAccruals - millReceipts);

      const associatedFarmersCount = Array.isArray(mill.associatedFarmerIds)
        ? mill.associatedFarmerIds.length
        : 0;

      return {
        ...mill,
        deliveredQty,
        millAccruals,
        millReceipts,
        pendingBalance,
        associatedFarmersCount,
      };
    });
  }, [mills, localStockMovements, ledgerEntries]);

  // Per-Farmer breakdown
  const farmerReports = useMemo(() => {
    return farmers.map(farmer => {
      const farmerId = farmer.farmer_id || farmer.id;
      const farmerName = farmer.name || 'Unnamed Farmer';

      // Loans for this farmer
      const farmerLoans = loans.filter(
        l => String(l.farmer_id) === String(farmerId)
      );
      const totalBorrowed = farmerLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0);
      const totalOutstanding = farmerLoans.reduce(
        (sum, l) => sum + Number(l.outstanding_balance ?? l.amount ?? 0),
        0
      );

      // Stock received from this farmer
      const farmerIntakes = localStockMovements.filter(
        m => m.type === 'receive' && (String(m.farmer_id) === String(farmerId) || m.farmerName === farmerName)
      );
      const totalGrainSupplied = farmerIntakes.reduce((sum, m) => sum + Number(m.quantity || 0), 0);

      return {
        ...farmer,
        totalBorrowed,
        totalOutstanding,
        totalGrainSupplied,
        hasActiveLoan: totalOutstanding > 0,
      };
    });
  }, [farmers, loans, localStockMovements]);

  return (
    <div className="commissiondar-reports-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <p className="dashboard-eyebrow">COMMISSIONDAR / AUDIT & REPORTS</p>
          <h1 style={{ margin: '4px 0 8px' }}>Performance & Trade Reports</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Comprehensive breakdown of mill deliveries, commission reconciliations, and farmer loan ledgers.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span>🖨️</span> Print / Save Report
        </button>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 6 }}>
            STOCK IN-HAND / TRANSIT
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--green-light)' }}>
            {number(stockSummary.inHandQty)} Qtl / Bags
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Received: {number(stockSummary.receivedQty)} • Delivered: {number(stockSummary.deliveredQty)}
          </div>
        </div>

        <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 6 }}>
            MILL COMMISSION EARNED
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--gold)' }}>
            {rupees(commissionSummary.totalAccrued)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Received: {rupees(commissionSummary.totalReceived)}
          </div>
        </div>

        <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 6 }}>
            PENDING FROM MILLS
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: commissionSummary.outstandingCommission > 0 ? '#ef4444' : 'var(--green-light)' }}>
            {rupees(commissionSummary.outstandingCommission)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Awaiting settlement from mills
          </div>
        </div>

        <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 6 }}>
            OUTSTANDING FARMER LOANS
          </div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f59e0b' }}>
            {rupees(loanSummary.totalOutstanding)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Total Lent: {rupees(loanSummary.totalLent)} • Recovered: {rupees(loanSummary.totalRecovered)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          borderBottom: '1px solid var(--border)',
          paddingBottom: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className={`btn ${activeTab === 'mills' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('mills')}
          >
            🏭 Mill Reconciliations ({millReports.length})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'farmers' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('farmers')}
          >
            👨‍🌾 Farmer Financial Status ({farmerReports.length})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'stock' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('stock')}
          >
            📦 Grain Movements Ledger ({localStockMovements.length})
          </button>
        </div>

        <input
          type="search"
          placeholder="Filter by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface-soft)',
            color: 'var(--ink)',
            width: 220,
          }}
        />
      </div>

      {loading ? (
        <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
          <p>Loading reports data...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: MILLS REPORT */}
          {activeTab === 'mills' && (
            <div className="panel" style={{ padding: 24, borderRadius: 18 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 4px' }}>Mill Performance & Commission Reconciliation</h3>
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>
                  Independent tracking of stock dispatched to each rice mill and respective commission dues.
                </p>
              </div>

              {millReports.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                  No rice mills added yet. Add mills in the &quot;My Mills&quot; section to view reconciliation.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.82rem' }}>
                        <th style={{ padding: '12px 14px' }}>MILL NAME</th>
                        <th style={{ padding: '12px 14px' }}>LOCATION</th>
                        <th style={{ padding: '12px 14px' }}>LINKED FARMERS</th>
                        <th style={{ padding: '12px 14px' }}>GRAIN DELIVERED</th>
                        <th style={{ padding: '12px 14px' }}>COMMISSION EARNED</th>
                        <th style={{ padding: '12px 14px' }}>PAID / RECEIVED</th>
                        <th style={{ padding: '12px 14px' }}>PENDING BALANCE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {millReports
                        .filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()))
                        .map(mill => (
                          <tr key={mill.name} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 650 }}>
                              {mill.name}
                              {!mill.isActive && (
                                <span style={{ marginLeft: 8, fontSize: '0.7rem', color: '#ef4444' }}>
                                  (Inactive)
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>
                              {mill.location || '—'}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span className="badge" style={{ background: 'var(--surface-soft)' }}>
                                {mill.associatedFarmersCount} farmers
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                              {number(mill.deliveredQty)} Qtl
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--gold)' }}>
                              {rupees(mill.millAccruals)}
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--green-light)' }}>
                              {rupees(mill.millReceipts)}
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: mill.pendingBalance > 0 ? '#ef4444' : 'var(--green-light)' }}>
                              {rupees(mill.pendingBalance)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FARMERS REPORT */}
          {activeTab === 'farmers' && (
            <div className="panel" style={{ padding: 24, borderRadius: 18 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 4px' }}>Farmer Financial & Grain Intake Status</h3>
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>
                  Tracks loans disbursed, outstanding recovery, and grain volume supplied per farmer.
                </p>
              </div>

              {farmerReports.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                  No farmers registered yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.82rem' }}>
                        <th style={{ padding: '12px 14px' }}>FARMER NAME</th>
                        <th style={{ padding: '12px 14px' }}>PHONE</th>
                        <th style={{ padding: '12px 14px' }}>GRAIN SUPPLIED</th>
                        <th style={{ padding: '12px 14px' }}>TOTAL LOAN TAKEN</th>
                        <th style={{ padding: '12px 14px' }}>OUTSTANDING DUES</th>
                        <th style={{ padding: '12px 14px' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmerReports
                        .filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()))
                        .map(f => (
                          <tr key={f.id || f.farmer_id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 650 }}>
                              {f.name}
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>
                              {f.phone || '—'}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              {number(f.totalGrainSupplied)} Qtl
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--ink)' }}>
                              {rupees(f.totalBorrowed)}
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 700, color: f.totalOutstanding > 0 ? '#f59e0b' : 'var(--green-light)' }}>
                              {rupees(f.totalOutstanding)}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: '0.75rem',
                                  fontWeight: 650,
                                  background: f.totalOutstanding > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                  color: f.totalOutstanding > 0 ? '#f59e0b' : 'var(--green-light)',
                                }}
                              >
                                {f.totalOutstanding > 0 ? 'Active Loan' : 'Clear'}
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

          {/* TAB 3: STOCK MOVEMENTS */}
          {activeTab === 'stock' && (
            <div className="panel" style={{ padding: 24, borderRadius: 18 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 4px' }}>Grain Inward & Outward Dispatches</h3>
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>
                  Auditable movement record of stock received from farmers and delivered to partner rice mills.
                </p>
              </div>

              {localStockMovements.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                  No stock movements recorded yet. Receive or deliver stock in the &quot;My Stock&quot; section.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.82rem' }}>
                        <th style={{ padding: '12px 14px' }}>MOVEMENT TYPE</th>
                        <th style={{ padding: '12px 14px' }}>DATE</th>
                        <th style={{ padding: '12px 14px' }}>PARTY / MILL NAME</th>
                        <th style={{ padding: '12px 14px' }}>GRAIN TYPE</th>
                        <th style={{ padding: '12px 14px' }}>QUANTITY</th>
                        <th style={{ padding: '12px 14px' }}>NOTES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localStockMovements
                        .filter(m => {
                          if (!search) return true;
                          const q = search.toLowerCase();
                          return (
                            (m.farmerName && m.farmerName.toLowerCase().includes(q)) ||
                            (m.mill_name && m.mill_name.toLowerCase().includes(q)) ||
                            (m.millName && m.millName.toLowerCase().includes(q)) ||
                            (m.grainName && m.grainName.toLowerCase().includes(q))
                          );
                        })
                        .map((m, idx) => {
                          const isReceive = m.type === 'receive';
                          return (
                            <tr key={m.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '12px 14px' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    background: isReceive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                    color: isReceive ? 'var(--green-light)' : '#60a5fa',
                                  }}
                                >
                                  {isReceive ? '↓ RECEIVED' : '↑ DELIVERED'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                                {m.date || '—'}
                              </td>
                              <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                                {isReceive ? (m.farmerName || 'Farmer') : (m.mill_name || m.millName || 'Mill')}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                {m.grainName || 'Standard Grain'}
                              </td>
                              <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                                {number(m.quantity)} Qtl
                              </td>
                              <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: '0.85rem' }}>
                                {m.notes || '—'}
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
        </>
      )}
    </div>
  );
}
