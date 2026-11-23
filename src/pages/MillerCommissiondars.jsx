import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  getMillerCommissiondars,
  createMillerCommissiondar,
  updateMillerCommissiondar,
  getBrokerCommissions,
  payBrokerCommission,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

const rupees = value => '₹' + Number(value || 0).toLocaleString('en-IN');

export default function MillerCommissiondars() {
  const { token } = useAuth();
  const { farmers, transactions } = useData();

  const [contacts, setContacts] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Contact Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [village, setVillage] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Contact Detail Modal / Report State
  const [selectedContact, setSelectedContact] = useState(null);
  const [payingCommissionId, setPayingCommissionId] = useState(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const [cRes, commRes] = await Promise.allSettled([
        getMillerCommissiondars(token),
        getBrokerCommissions(token),
      ]);

      if (cRes.status === 'fulfilled') {
        setContacts(Array.isArray(cRes.value) ? cRes.value : cRes.value?.contacts || []);
      }

      if (commRes.status === 'fulfilled') {
        setCommissions(
          Array.isArray(commRes.value) ? commRes.value : commRes.value?.commissions || []
        );
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Map metrics and associated records by broker contact ID
  const contactMetrics = useMemo(() => {
    const map = {};

    contacts.forEach(contact => {
      const contactId = Number(contact.id);

      // Associated farmers from actual backend farmers
      const associatedFarmers = farmers.filter(
        f => Number(f.associated_commissiondar_id) === contactId
      );

      // Total quantity brought by these associated farmers
      const associatedFarmerIds = new Set(associatedFarmers.map(f => Number(f.id)));
      const farmerIntakeQuantities = {};
      associatedFarmers.forEach(f => {
        farmerIntakeQuantities[f.id] = 0;
      });

      transactions
        .filter(t => t.type === 'intake' && associatedFarmerIds.has(Number(t.farmerId)))
        .forEach(t => {
          farmerIntakeQuantities[t.farmerId] = (farmerIntakeQuantities[t.farmerId] || 0) + Number(t.quantity || 0);
        });

      // Commissions from actual backend broker commissions
      const contactComms = commissions.filter(
        c => Number(c.broker_id) === contactId
      );

      const generated = contactComms.reduce(
        (sum, c) => sum + Number(c.amount || c.commission_amount || 0),
        0
      );

      const paid = contactComms
        .filter(c => c.status === 'paid' || c.is_paid === true)
        .reduce((sum, c) => sum + Number(c.amount || c.commission_amount || 0), 0);

      const outstanding = generated - paid;

      map[contactId] = {
        farmers: associatedFarmers,
        farmerCount: associatedFarmers.length,
        farmerIntakeQuantities,
        commissions: contactComms,
        generated,
        paid,
        outstanding,
      };
    });

    return map;
  }, [contacts, farmers, commissions, transactions]);

  const totals = useMemo(() => {
    let farmersTotal = 0;
    let generatedTotal = 0;
    let paidTotal = 0;
    let outstandingTotal = 0;

    Object.values(contactMetrics).forEach(m => {
      farmersTotal += m.farmerCount;
      generatedTotal += m.generated;
      paidTotal += m.paid;
      outstandingTotal += m.outstanding;
    });

    return {
      contactsCount: contacts.length,
      farmersTotal,
      generatedTotal,
      paidTotal,
      outstandingTotal,
    };
  }, [contactMetrics, contacts.length]);

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    if (!name.trim()) {
      setFormError('Please enter a commissiondar / broker name.');
      return;
    }

    setSaving(true);

    try {
      await createMillerCommissiondar(
        {
          name: name.trim(),
          phone: phone.trim() || null,
          village: village.trim() || null,
        },
        token
      );

      setSuccess(`✓ Commissiondar "${name.trim()}" added successfully.`);
      setName('');
      setPhone('');
      setVillage('');
      await loadData();
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePayCommission = async commissionId => {
    if (!token || !commissionId) return;
    setPayingCommissionId(commissionId);
    setError('');

    try {
      await payBrokerCommission({ commission_id: Number(commissionId) }, token);
      setSuccess('✓ Commission payment recorded successfully.');
      await loadData();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setPayingCommissionId(null);
    }
  };

  const handleToggleActive = async contact => {
    if (!token) return;
    try {
      await updateMillerCommissiondar(
        contact.id,
        {
          name: contact.name,
          phone: contact.phone,
          village: contact.village,
          is_active: !contact.is_active,
        },
        token
      );
      await loadData();
    } catch (err) {
      setError(describeError(err));
    }
  };

  const cardStyle = {
    padding: 24,
    borderRadius: 18,
    marginBottom: 24,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 12px',
    marginTop: 6,
    borderRadius: 9,
    border: '1px solid rgba(52, 211, 153, 0.22)',
    background: 'rgba(11, 24, 18, 0.85)',
    color: 'var(--ink)',
    boxSizing: 'border-box',
    fontSize: '0.95rem',
  };

  return (
    <div className="miller-commissiondars-page">
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">MILLER / BROKER MANAGEMENT</p>
        <h1 style={{ margin: '4px 0 8px' }}>Commissiondar Contacts & Reports</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Manage your internal broker network, associated farmer reports, farmer-wise intake quantities, and commission ledgers.
        </p>
      </div>

      {error && (
        <div className="panel form-error" role="alert" style={{ padding: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {success && (
        <div className="panel" role="status" style={{ padding: 14, marginBottom: 16, color: 'var(--green-light)', borderLeft: '4px solid var(--green)' }}>
          {success}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
          marginBottom: 26,
        }}
      >
        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 8px', fontWeight: 600 }}>
            Active Commissiondars
          </p>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.9rem', color: 'var(--ink)' }}>
            {totals.contactsCount}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            In your broker directory
          </p>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 8px', fontWeight: 600 }}>
            Brought Farmers
          </p>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.9rem', color: 'var(--green-light)' }}>
            {totals.farmersTotal}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Farmers mapped to brokers
          </p>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 8px', fontWeight: 600 }}>
            Commission Generated
          </p>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.9rem', color: 'var(--gold)' }}>
            {rupees(totals.generatedTotal)}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Total broker commission accrued
          </p>
        </div>

        <div className="panel" style={{ padding: 22, borderRadius: 16, border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 8px', fontWeight: 600 }}>
            Outstanding Commission
          </p>
          <h2 style={{ margin: '0 0 6px', fontSize: '1.9rem', color: totals.outstandingTotal > 0 ? '#fca5a5' : 'var(--green-light)' }}>
            {rupees(totals.outstandingTotal)}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Pending balance to settle
          </p>
        </div>
      </div>

      {/* Add New Commissiondar Form */}
      <div className="panel" style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>🤝</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Add New Commissiondar Contact</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Create an internal broker contact to associate with farmers and intake shipments.
            </p>
          </div>
        </div>

        {formError && (
          <p style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>
            {formError}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
            alignItems: 'end',
          }}
        >
          <label>
            <span style={{ color: '#cbd5e1', fontSize: '0.86rem', fontWeight: 600 }}>Commissiondar Name *</span>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g. Ramesh Kumar"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={saving}
              required
            />
          </label>

          <label>
            <span style={{ color: '#cbd5e1', fontSize: '0.86rem', fontWeight: 600 }}>Phone Number</span>
            <input
              style={inputStyle}
              type="tel"
              placeholder="10-digit mobile"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={saving}
            />
          </label>

          <label>
            <span style={{ color: '#cbd5e1', fontSize: '0.86rem', fontWeight: 600 }}>Village / Location</span>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g. Rampur"
              value={village}
              onChange={e => setVillage(e.target.value)}
              disabled={saving}
            />
          </label>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ minHeight: 46 }}
          >
            {saving ? 'Saving...' : 'Add Commissiondar'}
          </button>
        </form>
      </div>

      {/* Contacts Table */}
      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Commissiondar Directory</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
              Your internal contacts with associated farmer counts, intake quantities, and commission ledgers.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadData}
            disabled={loading || saving}
          >
            {loading ? 'Refreshing...' : '↻ Refresh Data'}
          </button>
        </div>

        {loading ? (
          <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
            Loading commissiondar directory...
          </p>
        ) : contacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36 }}>
            <p style={{ fontSize: 32, margin: 0 }}>👥</p>
            <h3 style={{ margin: '12px 0 6px' }}>No commissiondar contacts found</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Add your first broker contact above to track associated farmers and commissions.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 840 }}>
              <thead>
                <tr>
                  <th>Contact Name</th>
                  <th>Contact Info</th>
                  <th>Associated Farmers</th>
                  <th>Commission Accrued</th>
                  <th>Paid</th>
                  <th>Outstanding</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {contacts.map(c => {
                  const m = contactMetrics[c.id] || {
                    farmers: [],
                    farmerCount: 0,
                    farmerIntakeQuantities: {},
                    commissions: [],
                    generated: 0,
                    paid: 0,
                    outstanding: 0,
                  };

                  return (
                    <tr key={c.id}>
                      <td>
                        <strong style={{ color: 'var(--ink)' }}>{c.name}</strong>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        <div>📞 {c.phone || 'No phone'}</div>
                        <div style={{ color: 'var(--muted)' }}>📍 {c.village || 'No location'}</div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: m.farmerCount > 0 ? 'rgba(0, 201, 120, 0.15)' : 'rgba(255,255,255,0.06)',
                            color: m.farmerCount > 0 ? 'var(--green-light)' : 'var(--muted)',
                          }}
                        >
                          {m.farmerCount} farmers
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 650 }}>
                        {rupees(m.generated)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--green-light)' }}>
                        {rupees(m.paid)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong style={{ color: m.outstanding > 0 ? '#fca5a5' : 'var(--green-light)' }}>
                          {rupees(m.outstanding)}
                        </strong>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(c)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 14,
                            fontSize: 11,
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            color: c.is_active === false ? '#fca5a5' : 'var(--green-light)',
                            background: c.is_active === false ? 'rgba(248, 113, 113, 0.15)' : 'rgba(0, 201, 120, 0.15)',
                          }}
                        >
                          {c.is_active === false ? 'Inactive' : 'Active'}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-small"
                          onClick={() => setSelectedContact(c)}
                        >
                          📊 View Report & Farmers
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expanded Contact Detail & Farmer Report Modal */}
      {selectedContact && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true">
          <div className="admin-confirm-modal" style={{ maxWidth: 740, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p className="dashboard-eyebrow" style={{ margin: 0 }}>COMMISSIONDAR REPORT</p>
                <h2 style={{ margin: '4px 0 6px' }}>{selectedContact.name}</h2>
                <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.85rem' }}>
                  📍 {selectedContact.village || 'No village specified'} • 📞 {selectedContact.phone || 'No phone'}
                </p>
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => setSelectedContact(null)}
              >
                ✕ Close
              </button>
            </div>

            {/* Metrics bar */}
            {(() => {
              const m = contactMetrics[selectedContact.id] || {
                farmers: [],
                farmerCount: 0,
                farmerIntakeQuantities: {},
                commissions: [],
                generated: 0,
                paid: 0,
                outstanding: 0,
              };

              return (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
                      <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Commission Accrued</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--gold)', marginTop: 2 }}>
                        {rupees(m.generated)}
                      </div>
                    </div>
                    <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
                      <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Commission Paid</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--green-light)', marginTop: 2 }}>
                        {rupees(m.paid)}
                      </div>
                    </div>
                    <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
                      <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Outstanding Due</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: m.outstanding > 0 ? '#fca5a5' : 'var(--green-light)', marginTop: 2 }}>
                        {rupees(m.outstanding)}
                      </div>
                    </div>
                  </div>

                  {/* Section 1: Associated Farmers & Quantities */}
                  <div style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: 8, color: 'var(--green-light)' }}>
                      Associated Farmers ({m.farmers.length})
                    </h3>
                    {m.farmers.length === 0 ? (
                      <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
                        No farmers are currently mapped to this commissiondar contact.
                      </p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Farmer Name</th>
                              <th>Village</th>
                              <th>Current Stock</th>
                              <th>Session Intake Quantity</th>
                              <th>Owed to Farmer</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.farmers.map(f => (
                              <tr key={f.id}>
                                <td>
                                  <Link to={`/farmers/${f.id}`} style={{ fontWeight: 650, color: 'var(--green-light)' }}>
                                    {f.name}
                                  </Link>
                                </td>
                                <td>{f.village || '-'}</td>
                                <td>{f.stock}</td>
                                <td style={{ fontWeight: 700 }}>
                                  {m.farmerIntakeQuantities[f.id] || 0} units
                                </td>
                                <td style={{ color: Number(f.owed) > 0 ? 'var(--gold)' : 'inherit' }}>
                                  {rupees(f.owed)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Section 2: Commission Records & Payments */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: 8, color: 'var(--gold)' }}>
                      Commission Ledgers & Settlements
                    </h3>
                    {m.commissions.length === 0 ? (
                      <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
                        No commission lines recorded yet for this contact. Record intake shipments specifying this broker to accrue commission.
                      </p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Commission Amount</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.commissions.map((comm, idx) => {
                              const isPaid = comm.status === 'paid' || comm.is_paid === true;

                              return (
                                <tr key={comm.id || comm.commission_id || idx}>
                                  <td>{comm.created_at ? new Date(comm.created_at).toLocaleDateString('en-IN') : 'Recent'}</td>
                                  <td style={{ fontWeight: 750, color: 'var(--gold)' }}>
                                    {rupees(comm.amount || comm.commission_amount)}
                                  </td>
                                  <td>
                                    <span
                                      className="badge"
                                      style={{
                                        background: isPaid ? 'rgba(0, 201, 120, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                                        color: isPaid ? 'var(--green-light)' : 'var(--gold)',
                                      }}
                                    >
                                      {isPaid ? '✓ Paid' : '⏳ Pending'}
                                    </span>
                                  </td>
                                  <td>
                                    {!isPaid && (
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-small"
                                        onClick={() => handlePayCommission(comm.id || comm.commission_id)}
                                        disabled={payingCommissionId === (comm.id || comm.commission_id)}
                                      >
                                        {payingCommissionId === (comm.id || comm.commission_id) ? 'Paying...' : 'Pay Commission'}
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
                </>
              );
            })()}

            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedContact(null)}
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
