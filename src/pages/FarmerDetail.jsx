import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { getMillerCommissiondars, describeError } from '../api';
import SearchableSelect from '../components/SearchableSelect';
import { t } from '../strings';

const rupees = (value) =>
  '₹' + Number(value || 0).toLocaleString('en-IN');

export default function FarmerDetail({ farmerId }) {
  const { farmers, transactions, farmersLoading, editFarmerRecord } = useData();
  const { token } = useAuth();
  const params = useParams();
  const location = useLocation();
  const reduce = useReducedMotion();

  const flashLast = Boolean(location.state?.flash) && !reduce;
  const id = farmerId ?? params.id;
  const farmer = farmers.find((f) => f.id === Number(id));
  const ownPage = farmerId !== undefined;

  const [contacts, setContacts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editContactId, setEditContactId] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    let active = true;
    if (!token) return;

    getMillerCommissiondars(token)
      .then(res => {
        if (!active) return;
        const list = Array.isArray(res) ? res : res?.contacts || [];
        setContacts(list);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [token]);

  const contactOptions = contacts.map(c => ({
    id: c.id,
    name: c.name,
    subtitle: c.village ? `Village: ${c.village}` : 'Contact',
    badge: 'Broker',
  }));

  const associatedContact = contacts.find(
    c => Number(c.id) === Number(farmer?.associated_commissiondar_id)
  );

  const handleOpenEdit = () => {
    setEditName(farmer.name || '');
    setEditVillage(farmer.village || '');
    setEditContactId(farmer.associated_commissiondar_id || '');
    setEditError('');
    setEditing(true);
  };

  const handleSaveEdit = async e => {
    e.preventDefault();
    if (!editName.trim() || !editVillage.trim()) {
      setEditError('Farmer name and village are required.');
      return;
    }

    setEditSaving(true);
    setEditError('');

    try {
      await editFarmerRecord(farmer.id, {
        name: editName.trim(),
        village: editVillage.trim(),
        associated_commissiondar_id: editContactId ? Number(editContactId) : null,
      });
      setEditing(false);
    } catch (err) {
      setEditError(describeError(err));
    } finally {
      setEditSaving(false);
    }
  };

  if (farmersLoading && !farmer) {
    return (
      <div className="panel" style={{ padding: 36, textAlign: 'center' }}>
        <p style={{ margin: 0, color: 'var(--muted)' }}>Loading farmer details...</p>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="panel" style={{ padding: 30 }}>
        <h1>{t.notFound}</h1>
        <p style={{ color: 'var(--muted)' }}>
          The requested farmer record could not be found.
        </p>
        {!ownPage && (
          <Link to="/farmers" className="btn btn-ghost" style={{ marginTop: 12 }}>
            ← {t.back}
          </Link>
        )}
      </div>
    );
  }

  const history = transactions
    .filter((tx) => Number(tx.farmerId) === Number(farmer.id))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalIntake = history
    .filter((tx) => tx.type === 'intake')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const totalPayments = history
    .filter((tx) => tx.type === 'payment')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  let balance = 0;

  const rows = history.map((tx) => {
    balance += tx.type === 'intake'
      ? Number(tx.amount || 0)
      : -Number(tx.amount || 0);

    return { ...tx, balance };
  });

  const StatCard = ({ label, value, description }) => (
    <div className="panel">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {description && (
        <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 0 }}>
          {description}
        </p>
      )}
    </div>
  );

  return (
    <div>
      {!ownPage && (
        <Link to="/farmers" className="btn btn-ghost btn-small" style={{ marginBottom: 16 }}>
          ← Back to Farmers
        </Link>
      )}

      <div
        className="panel"
        style={{
          marginTop: ownPage ? 0 : 8,
          marginBottom: 18,
          padding: 24,
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
            <h1 style={{ margin: '0 0 6px' }}>{farmer.name}</h1>
            <p style={{ color: 'var(--muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
              <span>📍 Village: <strong style={{ color: '#cbd5e1' }}>{farmer.village || 'Not specified'}</strong></span>
              <span>•</span>
              <span>
                🤝 Contact:{' '}
                {associatedContact ? (
                  <strong style={{ color: 'var(--green-light)' }}>
                    {associatedContact.name} ({associatedContact.village || 'Broker'})
                  </strong>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>Direct (None)</span>
                )}
              </span>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link className="btn btn-primary btn-small" to={`/intake?farmer=${farmer.id}`}>
              + Record Intake
            </Link>
            <Link className="btn btn-ghost btn-small" to={`/payment?farmer=${farmer.id}`}>
              ₹ Record Payment
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={handleOpenEdit}
            >
              ✎ Edit Farmer
            </button>
          </div>
        </div>
      </div>

      <div className="stats" style={{ marginBottom: 20 }}>
        <StatCard
          label={t.stock}
          value={Number(farmer.stock || 0).toLocaleString('en-IN')}
          description="Current recorded stock"
        />

        <StatCard
          label={t.owed}
          value={rupees(farmer.owed)}
          description="Current outstanding balance"
        />

        <StatCard
          label="Total Intake"
          value={rupees(totalIntake)}
          description="Recorded in this session"
        />

        <StatCard
          label="Total Payments"
          value={rupees(totalPayments)}
          description="Recorded in this session"
        />
      </div>

      <div
        className="panel"
        style={{ overflowX: 'auto' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Transaction History</h2>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 0 }}>
              {history.length} transactions recorded in this session
            </p>
          </div>

          <span
            style={{
              color: 'var(--gold)',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Session balance: {rupees(balance)}
          </span>
        </div>

        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 10px' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <p style={{ margin: 0, fontWeight: 650 }}>{t.noHistory}</p>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
              Transactions will appear here after they are recorded.
            </p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t.date}</th>
                <th>{t.type}</th>
                <th>{t.quantity}</th>
                <th>{t.amount}</th>
                <th>{t.balance}</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, i) => {
                const isNew = flashLast && i === rows.length - 1;

                return (
                  <motion.tr
                    key={r.id}
                    layout={!reduce}
                    {...(isNew && {
                      initial: {
                        backgroundColor: 'rgba(0, 201, 120, 0.4)',
                      },
                      animate: {
                        backgroundColor: 'rgba(0, 201, 120, 0)',
                      },
                      transition: {
                        duration: 0.4,
                        delay: 0.5,
                      },
                    })}
                  >
                    <td>{r.date}</td>

                    <td>
                      <span
                        className="badge"
                        style={{
                          background:
                            r.type === 'intake'
                              ? 'rgba(0, 201, 120, 0.15)'
                              : 'rgba(251, 191, 36, 0.15)',
                          color:
                            r.type === 'intake'
                              ? 'var(--green-glow)'
                              : 'var(--gold)',
                          borderColor:
                            r.type === 'intake'
                              ? 'rgba(0, 201, 120, 0.35)'
                              : 'rgba(251, 191, 36, 0.35)',
                        }}
                      >
                        {r.type === 'intake' ? '📥 ' + t.intake : '💸 ' + t.payment}
                      </span>
                    </td>

                    <td>{r.quantity ?? '-'}</td>
                    <td style={{ fontWeight: 650 }}>{rupees(r.amount)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--gold)' }}>{rupees(r.balance)}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Farmer Modal */}
      {editing && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true">
          <div className="admin-confirm-modal" style={{ maxWidth: 460 }}>
            <h3>Edit Farmer Profile</h3>
            <p>Update farmer details and associated broker contact.</p>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4, color: '#cbd5e1' }}>
                    Farmer Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4, color: '#cbd5e1' }}>
                    Village
                  </label>
                  <input
                    type="text"
                    value={editVillage}
                    onChange={e => setEditVillage(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <SearchableSelect
                    id="editDetailContact"
                    label="Associated Commissiondar Contact"
                    placeholder="Search contact name..."
                    options={contactOptions}
                    value={editContactId}
                    onChange={id => setEditContactId(id)}
                  />
                </div>
              </div>

              {editError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.88rem', marginBottom: 14 }}>
                  {editError}
                </div>
              )}

              <div className="admin-confirm-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditing(false)}
                  disabled={editSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editSaving}
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
