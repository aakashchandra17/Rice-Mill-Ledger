import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { getMillerCommissiondars, describeError } from '../api';
import SearchableSelect from '../components/SearchableSelect';
import { t } from '../strings';

export default function Farmers() {
  const {
    farmers,
    addFarmerRecord,
    editFarmerRecord,
    farmersLoading,
    farmersError,
  } = useData();
  const { token } = useAuth();

  // Create form state
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [contactId, setContactId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Contacts for broker mapping
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit modal state
  const [editingFarmer, setEditingFarmer] = useState(null);
  const [editName, setEditName] = useState('');
  const [editVillage, setEditVillage] = useState('');
  const [editContactId, setEditContactId] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Load contacts
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

  // Map contact options for SearchableSelect
  const contactOptions = useMemo(() => {
    return contacts.map(c => ({
      id: c.id,
      name: c.name,
      subtitle: c.village ? `Village: ${c.village} • Phone: ${c.phone || '-'}` : (c.phone || 'Contact'),
      badge: 'Broker',
    }));
  }, [contacts]);

  // Lookup map for fast contact name display
  const contactMap = useMemo(() => {
    const map = {};
    contacts.forEach(c => {
      map[c.id] = c.name;
    });
    return map;
  }, [contacts]);

  // Hide the Swagger test farmer named "string".
  // Filter farmers by name or village.
  const visibleFarmers = farmers.filter(farmer => {
    const isNotTestFarmer =
      farmer.name?.trim().toLowerCase() !== 'string';

    const search = searchTerm.trim().toLowerCase();

    const matchesSearch =
      farmer.name?.toLowerCase().includes(search) ||
      farmer.village?.toLowerCase().includes(search);

    return isNotTestFarmer && matchesSearch;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!name.trim() || !village.trim()) {
      setError('Please enter both farmer name and village.');
      return;
    }

    try {
      setSaving(true);

      await addFarmerRecord({
        name: name.trim(),
        village: village.trim(),
        associated_commissiondar_id: contactId ? Number(contactId) : null,
      });

      setName('');
      setVillage('');
      setContactId('');
      setMessage('Farmer added successfully!');
    } catch (err) {
      setError(
        err.message || 'Unable to add farmer. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = farmer => {
    setEditingFarmer(farmer);
    setEditName(farmer.name || '');
    setEditVillage(farmer.village || '');
    setEditContactId(farmer.associated_commissiondar_id || '');
    setEditError('');
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
      await editFarmerRecord(editingFarmer.id, {
        name: editName.trim(),
        village: editVillage.trim(),
        associated_commissiondar_id: editContactId ? Number(editContactId) : null,
      });
      setEditingFarmer(null);
    } catch (err) {
      setEditError(describeError(err));
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="panel">
      <h1>{t.farmers}</h1>

      {/* Add Farmer Section */}
      <div style={{ marginBottom: 32 }}>
        <h2>Add New Farmer</h2>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div>
              <label htmlFor="farmerName">Farmer Name</label>
              <input
                id="farmerName"
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="farmerVillage">Village</label>
              <input
                id="farmerVillage"
                type="text"
                placeholder="e.g. Rampur"
                value={village}
                onChange={e => setVillage(e.target.value)}
                required
              />
            </div>

            <div>
              <SearchableSelect
                id="associatedContact"
                label="Brought by Commissiondar Contact (Optional)"
                placeholder="Type contact name..."
                options={contactOptions}
                value={contactId}
                onChange={id => setContactId(id)}
              />
            </div>
          </div>

          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Add Farmer'}
          </button>
        </form>

        {message && (
          <p style={{ color: 'var(--green-glow)', marginTop: 12, fontWeight: 650 }}>
            {message}
          </p>
        )}

        {error && (
          <p style={{ color: 'var(--danger)', marginTop: 12, fontWeight: 650 }}>
            {error}
          </p>
        )}
      </div>

      {/* Farmer List and Search */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 15,
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <h2>Farmer List</h2>

        <input
          type="text"
          placeholder="Search by farmer name or village..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      <p
        style={{
          color: 'var(--muted)',
          marginBottom: 15,
          fontWeight: 600,
        }}
      >
        Total Farmers: {visibleFarmers.length}
      </p>

      {farmersLoading && <p>Loading farmers...</p>}

      {farmersError && (
        <p style={{ color: 'var(--danger)', fontWeight: 650 }}>{farmersError}</p>
      )}

      {!farmersLoading &&
        !farmersError &&
        visibleFarmers.length === 0 && (
          <p>No farmers found. Add your first farmer above.</p>
        )}

      {/* Farmers Table */}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>{t.name}</th>
              <th>{t.village}</th>
              <th>Commissiondar Contact</th>
              <th>{t.stock}</th>
              <th>{t.owed}</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {visibleFarmers.map(f => {
              const brokerName = f.associated_commissiondar_id
                ? contactMap[f.associated_commissiondar_id] || `Contact #${f.associated_commissiondar_id}`
                : '—';

              return (
                <tr key={f.id}>
                  <td style={{ fontWeight: 650 }}>{f.name}</td>
                  <td>{f.village}</td>
                  <td>
                    {brokerName !== '—' ? (
                      <span className="badge badge-agent">
                        {brokerName}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>Direct</span>
                    )}
                  </td>
                  <td>{f.stock}</td>
                  <td style={{ fontWeight: 700, color: Number(f.owed) > 0 ? 'var(--gold)' : 'inherit' }}>
                    ₹{Number(f.owed || 0).toLocaleString('en-IN')}
                  </td>

                  <td>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Link className="btn btn-ghost btn-small" to={`/farmers/${f.id}`}>
                        {t.view}
                      </Link>

                      <Link
                        className="btn btn-small"
                        to={`/intake?farmer=${f.id}`}
                      >
                        {t.recordIntake}
                      </Link>

                      <Link
                        className="btn btn-ghost btn-small"
                        to={`/payment?farmer=${f.id}`}
                      >
                        {t.recordPayment}
                      </Link>

                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => handleOpenEdit(f)}
                        style={{ fontSize: '0.8rem' }}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Farmer Modal */}
      {editingFarmer && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true">
          <div className="admin-confirm-modal" style={{ maxWidth: 480 }}>
            <h3>Edit Farmer: {editingFarmer.name}</h3>
            <p>Update farmer name, village, or commissiondar contact mapping.</p>

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
                    id="editContact"
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
                  onClick={() => setEditingFarmer(null)}
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
