import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getCommissiondarFarmers,
  getCommissiondarLoans,
  getCommissiondarStock,
  getCommissiondarGrainTypes,
  getCommissiondarMills,
  getCommissiondarMillFarmers,
  getCommissiondarMillCommissions,
  getCommissiondarCommissionReceipts,
  describeError,
} from '../api';

const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const number = n => Number(n || 0).toLocaleString('en-IN');

export default function CommissiondarReports() {
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('mills'); // 'mills' | 'farmers' | 'stock'

  // Backend entities
  const [farmers, setFarmers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [stockData, setStockData] = useState({ current_stock: 0, total_received: 0, total_delivered: 0, history: [] });
  const [grainTypes, setGrainTypes] = useState([]);
  const [mills, setMills] = useState([]);

  // Aggregated mappings from backend
  const [millCommissions, setMillCommissions] = useState({}); // { [millId]: [commissions] }
  const [millFarmers, setMillFarmers] = useState({}); // { [millId]: [farmers] }

  // Fetch all report data directly from backend
  const loadReportsData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const [fRes, lRes, sRes, gRes, mRes] = await Promise.allSettled([
        getCommissiondarFarmers(token),
        getCommissiondarLoans(token),
        getCommissiondarStock(token),
        getCommissiondarGrainTypes(token),
        getCommissiondarMills(token, true),
      ]);

      const farmersList = fRes.status === 'fulfilled' && fRes.value
        ? Array.isArray(fRes.value) ? fRes.value : fRes.value?.farmers || []
        : [];
      setFarmers(farmersList);

      const loansList = lRes.status === 'fulfilled' && lRes.value
        ? Array.isArray(lRes.value) ? lRes.value : lRes.value?.loans || []
        : [];
      setLoans(loansList);

      const stockResObj = sRes.status === 'fulfilled' && sRes.value
        ? sRes.value
        : { current_stock: 0, total_received: 0, total_delivered: 0, history: [] };
      setStockData(stockResObj);

      const grainsList = gRes.status === 'fulfilled' && gRes.value
        ? Array.isArray(gRes.value) ? gRes.value : gRes.value?.grain_types || []
        : [];
      setGrainTypes(grainsList);

      const millsList = mRes.status === 'fulfilled' && mRes.value
        ? Array.isArray(mRes.value) ? mRes.value : mRes.value?.mills || []
        : [];
      setMills(millsList);

      // Fetch per-mill commissions and farmer associations from backend
      const commMap = {};
      const farmMap = {};

      await Promise.allSettled(
        millsList.map(async mill => {
          try {
            // Commissions & Receipts
            const cRes = await getCommissiondarMillCommissions(mill.id, token);
            const cList = Array.isArray(cRes) ? cRes : cRes?.commissions || [];

            const commissionsWithReceipts = await Promise.all(
              cList.map(async comm => {
                try {
                  const rRes = await getCommissiondarCommissionReceipts(comm.id, token);
                  const rList = Array.isArray(rRes) ? rRes : rRes?.receipts || [];
                  return { ...comm, receipts: rList };
                } catch {
                  return { ...comm, receipts: [] };
                }
              })
            );
            commMap[mill.id] = commissionsWithReceipts;
          } catch {
            commMap[mill.id] = [];
          }

          try {
            // Farmers associated with this mill
            const famRes = await getCommissiondarMillFarmers(mill.id, token);
            farmMap[mill.id] = Array.isArray(famRes) ? famRes : famRes?.farmers || [];
          } catch {
            farmMap[mill.id] = [];
          }
        })
      );

      setMillCommissions(commMap);
      setMillFarmers(farmMap);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadReportsData();
  }, [loadReportsData]);

  // Lookup Maps
  const farmerMap = useMemo(() => {
    const map = {};
    farmers.forEach(f => {
      map[f.id] = f.name;
    });
    return map;
  }, [farmers]);

  const grainMap = useMemo(() => {
    const map = {};
    grainTypes.forEach(g => {
      map[g.id] = g.name;
    });
    return map;
  }, [grainTypes]);

  // Backend Movements History
  const movements = useMemo(() => {
    const list = Array.isArray(stockData?.history) ? stockData.history : [];
    return list.filter(item => typeof item === 'object' && item !== null);
  }, [stockData]);

  // Global Stock Summary from Backend
  const stockSummary = useMemo(() => {
    const current = Number(stockData?.current_stock ?? stockData?.currentStock ?? 0);
    const received = Number(stockData?.total_received ?? stockData?.totalReceived ?? 0);
    const delivered = Number(stockData?.total_delivered ?? stockData?.totalDelivered ?? 0);

    return {
      inHandQty: current,
      receivedQty: received,
      deliveredQty: delivered,
    };
  }, [stockData]);

  // Global Commission Summary from Backend
  const commissionSummary = useMemo(() => {
    let totalAccrued = 0;
    let totalReceived = 0;

    Object.values(millCommissions).forEach(cList => {
      cList.forEach(c => {
        totalAccrued += Number(c.commission_amount || c.amount || 0);
        (c.receipts || []).forEach(r => {
          totalReceived += Number(r.amount || 0);
        });
      });
    });

    return {
      totalAccrued,
      totalReceived,
      outstandingCommission: Math.max(0, totalAccrued - totalReceived),
    };
  }, [millCommissions]);

  // Global Loan Summary from Backend
  const loanSummary = useMemo(() => {
    let totalLent = 0;
    let totalOutstanding = 0;

    loans.forEach(l => {
      const principal = Number(l.amount || l.principal || 0);
      const balance = Number(l.outstanding_balance ?? l.amount ?? 0);
      totalLent += principal;
      totalOutstanding += balance;
    });

    return {
      totalLent,
      totalRecovered: Math.max(0, totalLent - totalOutstanding),
      totalOutstanding,
    };
  }, [loans]);

  // Per-Mill Breakdown calculated from Backend data
  const millReports = useMemo(() => {
    return mills.map(mill => {
      const millName = mill.name;

      // Deliveries to this mill from backend movement history
      const millDeliveries = movements.filter(
        m =>
          (m.movement_type === 'deliver' || m.type === 'deliver') &&
          (m.mill_name || m.millName) === millName
      );
      const deliveredQty = millDeliveries.reduce(
        (sum, m) => sum + Number(m.quantity || 0),
        0
      );

      // Commissions for this mill from backend
      const commList = millCommissions[mill.id] || [];
      let millEarned = 0;
      let millRecv = 0;

      commList.forEach(c => {
        millEarned += Number(c.commission_amount || c.amount || 0);
        (c.receipts || []).forEach(r => {
          millRecv += Number(r.amount || 0);
        });
      });

      const associatedList = millFarmers[mill.id] || [];

      return {
        ...mill,
        deliveredQty,
        millAccruals: millEarned,
        millReceipts: millRecv,
        pendingBalance: Math.max(0, millEarned - millRecv),
        associatedFarmersCount: associatedList.length,
      };
    });
  }, [mills, movements, millCommissions, millFarmers]);

  // Per-Farmer Breakdown calculated from Backend data
  const farmerReports = useMemo(() => {
    return farmers.map(farmer => {
      const fId = farmer.id || farmer.farmer_id;
      const fName = farmer.name;

      // Loans for this farmer from backend
      const farmerLoans = loans.filter(l => String(l.farmer_id) === String(fId));
      const totalBorrowed = farmerLoans.reduce(
        (sum, l) => sum + Number(l.amount || l.principal || 0),
        0
      );
      const totalOutstanding = farmerLoans.reduce(
        (sum, l) => sum + Number(l.outstanding_balance ?? l.amount ?? 0),
        0
      );

      // Stock supplied by this farmer from backend movements
      const farmerIntakes = movements.filter(
        m =>
          (m.movement_type === 'receive' || m.type === 'receive') &&
          String(m.farmer_id) === String(fId)
      );
      const totalGrainSupplied = farmerIntakes.reduce(
        (sum, m) => sum + Number(m.quantity || 0),
        0
      );

      return {
        ...farmer,
        totalBorrowed,
        totalOutstanding,
        totalGrainSupplied,
        hasActiveLoan: totalOutstanding > 0,
      };
    });
  }, [farmers, loans, movements]);

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
            Live aggregated trade data, mill reconciliations, and farmer loan ledgers powered directly by backend records.
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

      {error && (
        <div className="panel form-error" role="alert" style={{ padding: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

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
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 4 }}>
            YARD STOCK AVAILABLE
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--green-light)' }}>
            {number(stockSummary.inHandQty)} Qtl
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Received: {number(stockSummary.receivedQty)} • Delivered: {number(stockSummary.deliveredQty)}
          </div>
        </div>

        <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 4 }}>
            COMMISSION EARNED
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--gold)' }}>
            {rupees(commissionSummary.totalAccrued)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Received: {rupees(commissionSummary.totalReceived)}
          </div>
        </div>

        <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 4 }}>
            PENDING FROM MILLS
          </div>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: commissionSummary.outstandingCommission > 0 ? '#ef4444' : 'var(--green-light)',
            }}
          >
            {rupees(commissionSummary.outstandingCommission)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Outstanding balance due from mills
          </div>
        </div>

        <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 4 }}>
            FARMER LOAN DUES
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b' }}>
            {rupees(loanSummary.totalOutstanding)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4 }}>
            Total Lent: {rupees(loanSummary.totalLent)} • Recovered: {rupees(loanSummary.totalRecovered)}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
            📦 Grain Movement Ledger ({movements.length})
          </button>
        </div>

        <input
          type="search"
          placeholder="Filter report by name..."
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
        <div className="panel" style={{ padding: 36, textAlign: 'center' }}>
          <p style={{ margin: 0 }}>Generating reports from backend database...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: MILLS RECONCILIATION */}
          {activeTab === 'mills' && (
            <div className="panel" style={{ padding: 24, borderRadius: 18 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 4px' }}>Mill Performance & Commission Reconciliation</h3>
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>
                  Mill-wise breakdown of stock delivered, commission earned, and pending balances from backend records.
                </p>
              </div>

              {millReports.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                  No mills registered yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.82rem' }}>
                        <th style={{ padding: '12px 14px' }}>MILL NAME</th>
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
                          <tr key={mill.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 650 }}>
                              {mill.name}
                              {mill.is_active === false && (
                                <span style={{ marginLeft: 8, fontSize: '0.72rem', color: '#ef4444' }}>
                                  (Deactivated)
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span className="badge" style={{ background: 'var(--surface-soft)' }}>
                                {mill.associatedFarmersCount} farmers
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                              {number(mill.deliveredQty)} Qtl
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--gold)', fontWeight: 600 }}>
                              {rupees(mill.millAccruals)}
                            </td>
                            <td style={{ padding: '12px 14px', color: 'var(--green-light)', fontWeight: 600 }}>
                              {rupees(mill.millReceipts)}
                            </td>
                            <td
                              style={{
                                padding: '12px 14px',
                                fontWeight: 700,
                                color: mill.pendingBalance > 0 ? '#ef4444' : 'var(--green-light)',
                              }}
                            >
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

          {/* TAB 2: FARMER FINANCIAL STATUS */}
          {activeTab === 'farmers' && (
            <div className="panel" style={{ padding: 24, borderRadius: 18 }}>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ margin: '0 0 4px' }}>Farmer Financial & Grain Intake Status</h3>
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>
                  Tracks loans disbursed, outstanding balances, and grain volume supplied per farmer.
                </p>
              </div>

              {farmerReports.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                  No farmers registered in network yet.
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
                          <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 650 }}>{f.name}</td>
                            <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>{f.phone || '—'}</td>
                            <td style={{ padding: '12px 14px' }}>{number(f.totalGrainSupplied)} Qtl</td>
                            <td style={{ padding: '12px 14px', color: 'var(--ink)' }}>{rupees(f.totalBorrowed)}</td>
                            <td
                              style={{
                                padding: '12px 14px',
                                fontWeight: 700,
                                color: f.totalOutstanding > 0 ? '#f59e0b' : 'var(--green-light)',
                              }}
                            >
                              {rupees(f.totalOutstanding)}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  fontSize: '0.72rem',
                                  fontWeight: 650,
                                  background:
                                    f.totalOutstanding > 0
                                      ? 'rgba(245, 158, 11, 0.15)'
                                      : 'rgba(16, 185, 129, 0.15)',
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
                  Audited movement record of stock received from farmers and delivered to partner mills.
                </p>
              </div>

              {movements.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                  No stock movements recorded yet.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.82rem' }}>
                        <th style={{ padding: '12px 14px' }}>TYPE</th>
                        <th style={{ padding: '12px 14px' }}>PARTY / MILL NAME</th>
                        <th style={{ padding: '12px 14px' }}>GRAIN VARIETY</th>
                        <th style={{ padding: '12px 14px' }}>QUANTITY</th>
                        <th style={{ padding: '12px 14px' }}>RATE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements
                        .filter(m => {
                          if (!search) return true;
                          const q = search.toLowerCase();
                          const fName = farmerMap[m.farmer_id] || m.farmer_name || '';
                          const mName = m.mill_name || m.millName || '';
                          const gName = grainMap[m.grain_type_id] || m.grain_name || '';
                          return (
                            fName.toLowerCase().includes(q) ||
                            mName.toLowerCase().includes(q) ||
                            gName.toLowerCase().includes(q)
                          );
                        })
                        .map((m, idx) => {
                          const isReceive = m.movement_type === 'receive' || m.type === 'receive';
                          const partyName = isReceive
                            ? farmerMap[m.farmer_id] || m.farmer_name || `Farmer #${m.farmer_id}`
                            : m.mill_name || m.millName || 'Partner Mill';
                          const gName = grainMap[m.grain_type_id] || m.grain_name || 'Standard Grain';

                          return (
                            <tr key={m.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '12px 14px' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: isReceive
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : 'rgba(59, 130, 246, 0.15)',
                                    color: isReceive ? 'var(--green-light)' : '#60a5fa',
                                  }}
                                >
                                  {isReceive ? '↓ RECEIVED' : '↑ DELIVERED'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', fontWeight: 600 }}>{partyName}</td>
                              <td style={{ padding: '12px 14px' }}>{gName}</td>
                              <td style={{ padding: '12px 14px', fontWeight: 700 }}>{number(m.quantity)} Qtl</td>
                              <td style={{ padding: '12px 14px', color: 'var(--gold)' }}>
                                {m.rate ? rupees(m.rate) : '—'}
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
