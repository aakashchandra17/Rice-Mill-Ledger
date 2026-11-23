import { useState, useEffect, useMemo } from 'react';
import { getCommissiondarFarmers } from '../api';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

export default function CommissiondarMills() {
  const { token, user } = useAuth();

  const [farmers, setFarmers] = useState([]);
  const [farmersLoading, setFarmersLoading] = useState(false);

  // Storage key per Commissiondar
  const storageKey = `commissiondar_mills_${user?.id || user?.phone || 'default'}`;

  const [mills, setMills] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Sensible defaults if first time
    return [
      {
        id: 'mill_1',
        name: 'Sri Lakshmi Srinivasa Rice Mill',
        location: 'Tadepalligudem',
        contactPerson: 'Venkatesh Rao',
        phone: '9848012345',
        isActive: true,
        associatedFarmerIds: [],
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(mills));
    } catch {}
  }, [mills, storageKey]);

  // Load Commissiondar's farmers for mapping
  useEffect(() => {
    if (!token) return;
    setFarmersLoading(true);

    getCommissiondarFarmers(token)
      .then(data => {
        const list = Array.isArray(data) ? data : data?.farmers || [];
        setFarmers(list);
      })
      .catch(() => {})
      .finally(() => {
        setFarmersLoading(false);
      });
  }, [token]);

  // Add Mill Form State
  const [millName, setMillName] = useState('');
  const [location, setLocation] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit Mill State
  const [editingMill, setEditingMill] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Farmer Association Modal
  const [associatingMill, setAssociatingMill] = useState(null);
  const [selectedFarmerIdToAdd, setSelectedFarmerIdToAdd] = useState('');

  const farmerOptions = useMemo(() => {
    return farmers.map(f => ({
      id: f.id,
      name: f.name,
      subtitle: f.village ? `Village: ${f.village}` : 'Farmer',
      badge: f.phone || undefined,
    }));
  }, [farmers]);

  const handleAddMill = e => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    if (!millName.trim()) {
      setFormError('Please enter a mill name.');
      return;
    }

    const newMill = {
      id: `mill_${Date.now()}`,
      name: millName.trim(),
      location: location.trim() || '',
      contactPerson: contactPerson.trim() || '',
      phone: phone.trim() || '',
      isActive: true,
      associatedFarmerIds: [],
    };

    setMills(prev => [newMill, ...prev]);
    setSuccess(`✓ Mill "${millName.trim()}" added to your account.`);
    setMillName('');
    setLocation('');
    setContactPerson('');
    setPhone('');
  };

  const handleToggleActive = millId => {
    setMills(prev =>
      prev.map(m => (m.id === millId ? { ...m, isActive: !m.isActive } : m))
    );
  };

  const handleOpenEdit = mill => {
    setEditingMill(mill);
    setEditName(mill.name);
    setEditLocation(mill.location || '');
    setEditContact(mill.contactPerson || '');
    setEditPhone(mill.phone || '');
  };

  const handleSaveEdit = e => {
    e.preventDefault();
    if (!editName.trim()) return;

    setMills(prev =>
      prev.map(m =>
        m.id === editingMill.id
          ? {
              ...m,
              name: editName.trim(),
              location: editLocation.trim(),
              contactPerson: editContact.trim(),
              phone: editPhone.trim(),
            }
          : m
      )
    );

    setEditingMill(null);
    setSuccess('✓ Mill details updated.');
  };

  const handleAddFarmerToMill = () => {
    if (!associatingMill || !selectedFarmerIdToAdd) return;
    const fId = Number(selectedFarmerIdToAdd);

    setMills(prev =>
      prev.map(m => {
        if (m.id === associatingMill.id) {
          const existing = m.associatedFarmerIds || [];
          if (existing.includes(fId)) return m;
          return { ...m, associatedFarmerIds: [...existing, fId] };
        }
        return m;
      })
    );

    setSelectedFarmerIdToAdd('');
  };

  const handleRemoveFarmerFromMill = (millId, farmerId) => {
    setMills(prev =>
      prev.map(m => {
        if (m.id === millId) {
          return {
            ...m,
            associatedFarmerIds: (m.associatedFarmerIds || []).filter(
              id => id !== farmerId
            ),
          };
        }
        return m;
      })
    );
  };

  return (
    <div className="commissiondar-mills-page">
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">COMMISSIONDAR / MILL NETWORK</p>
        <h1 style={{ margin: '4px 0 8px' }}>My Mills & Farmer Associations</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Manage your own private directory of rice mills and associate farmers with each mill for stock delivery.
        </p>
      </div>

      {success && (
        <div className="panel" role="status" style={{ padding: 14, marginBottom: 16, color: 'var(--green-light)', borderLeft: '4px solid var(--green)' }}>
          {success}
        </div>
      )}

      {/* Add Mill Form */}
      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)', marginBottom: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>🏭</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Add New Mill Reference</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Plain-text mill names in your account. Independent of registered mill accounts.
            </p>
          </div>
        </div>

        {formError && (
          <p style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>
            {formError}
          </p>
        )}

        <form onSubmit={handleAddMill}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
              alignItems: 'end',
              marginBottom: 16,
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                Mill Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Sri Lakshmi Srinivasa Mill"
                value={millName}
                onChange={e => setMillName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                Location / Town
              </label>
              <input
                type="text"
                placeholder="e.g. Tadepalligudem"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Venkatesh Rao"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.86rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 650 }}>
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="10-digit mobile"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ minHeight: 44 }}>
            Add Mill Reference
          </button>
        </form>
      </div>

      {/* Mills Directory */}
      <div className="panel" style={{ padding: 24, borderRadius: 18, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0 }}>Registered Mill References ({mills.length})</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>
              Select any mill to associate farmers or update contact details.
            </p>
          </div>
        </div>

        {mills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 36 }}>
            <p style={{ fontSize: 32, margin: 0 }}>🏭</p>
            <h3 style={{ margin: '12px 0 6px' }}>No mills added yet</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Add your first mill above to associate farmers and record stock deliveries.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mills.map(mill => {
              const associatedFarmers = farmers.filter(f =>
                (mill.associatedFarmerIds || []).includes(Number(f.id))
              );

              return (
                <div
                  key={mill.id}
                  style={{
                    padding: 20,
                    borderRadius: 14,
                    background: 'var(--surface-soft)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: mill.isActive ? 'var(--ink)' : 'var(--muted)' }}>
                          {mill.name}
                        </h3>
                        <span
                          className="badge"
                          style={{
                            background: mill.isActive ? 'rgba(0, 201, 120, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                            color: mill.isActive ? 'var(--green-light)' : '#fca5a5',
                          }}
                        >
                          {mill.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                        📍 {mill.location || 'Location not specified'} • 👤 {mill.contactPerson || 'Contact'} ({mill.phone || 'No phone'})
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => setAssociatingMill(mill)}
                      >
                        👥 Manage Farmers ({associatedFarmers.length})
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => handleOpenEdit(mill)}
                      >
                        ✎ Edit
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => handleToggleActive(mill.id)}
                        style={{ color: mill.isActive ? '#fca5a5' : 'var(--green-light)' }}
                      >
                        {mill.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>

                  {/* Associated Farmers preview tags */}
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(52, 211, 153, 0.1)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)', marginRight: 8 }}>
                      Associated Farmers:
                    </span>
                    {associatedFarmers.length === 0 ? (
                      <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        No farmers mapped to this mill yet. Click "Manage Farmers" to associate.
                      </span>
                    ) : (
                      <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {associatedFarmers.map(f => (
                          <span
                            key={f.id}
                            className="badge badge-farmer"
                            style={{ fontSize: '0.76rem' }}
                          >
                            {f.name} ({f.village || '-'})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manage Farmers Modal */}
      {associatingMill && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true">
          <div className="admin-confirm-modal" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0 }}>Associated Farmers: {associatingMill.name}</h3>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => setAssociatingMill(null)}
              >
                ✕
              </button>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 18 }}>
              Farmers linked to this mill can supply stock directly. One farmer can be associated with multiple mills.
            </p>

            {/* Add Farmer to Mill Combobox */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <SearchableSelect
                  id="addFarmerToMill"
                  label="Select Farmer by Name"
                  placeholder="Type farmer name..."
                  options={farmerOptions.filter(
                    opt => !(associatingMill.associatedFarmerIds || []).includes(Number(opt.id))
                  )}
                  value={selectedFarmerIdToAdd}
                  onChange={id => setSelectedFarmerIdToAdd(id)}
                />
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddFarmerToMill}
                disabled={!selectedFarmerIdToAdd}
                style={{ minHeight: 42 }}
              >
                + Link Farmer
              </button>
            </div>

            {/* Currently Associated Farmers List */}
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              <h4 style={{ fontSize: '0.92rem', color: '#cbd5e1', marginBottom: 8 }}>
                Linked Farmers ({(associatingMill.associatedFarmerIds || []).length})
              </h4>
              {(associatingMill.associatedFarmerIds || []).length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No farmers currently linked.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(associatingMill.associatedFarmerIds || []).map(fId => {
                    const farmerObj = farmers.find(f => Number(f.id) === Number(fId));
                    return (
                      <div
                        key={fId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: 'var(--surface-soft)',
                        }}
                      >
                        <span style={{ fontSize: '0.9rem', color: 'var(--ink)' }}>
                          <strong>{farmerObj?.name || `Farmer #${fId}`}</strong>{' '}
                          <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                            ({farmerObj?.village || 'No village'})
                          </span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveFarmerFromMill(associatingMill.id, fId)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#fca5a5',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                          }}
                        >
                          ✕ Unlink
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ marginTop: 22, textAlign: 'right' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setAssociatingMill(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Mill Modal */}
      {editingMill && (
        <div className="admin-confirm-overlay" role="dialog" aria-modal="true">
          <div className="admin-confirm-modal" style={{ maxWidth: 460 }}>
            <h3>Edit Mill Reference</h3>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4, color: '#cbd5e1' }}>
                    Mill Name *
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
                    Location
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={e => setEditLocation(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4, color: '#cbd5e1' }}>
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={editContact}
                    onChange={e => setEditContact(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 4, color: '#cbd5e1' }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-confirm-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditingMill(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
