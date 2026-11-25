import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getCommissiondarMills,
  createCommissiondarMill,
  updateCommissiondarMill,
  deleteCommissiondarMill,
  getCommissiondarMillFarmers,
  addFarmerToCommissiondarMill,
  removeFarmerFromCommissiondarMill,
  getCommissiondarFarmers,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/SearchableSelect';

export default function CommissiondarMills() {
  const { token } = useAuth();

  const [mills, setMills] = useState([]);
  const [millsLoading, setMillsLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

  const [farmers, setFarmers] = useState([]);
  const [farmersLoading, setFarmersLoading] = useState(false);

  // Mill-to-Farmers mapping cache: { [millId]: [farmerObj] }
  const [millFarmersMap, setMillFarmersMap] = useState({});
  const [associationLoading, setAssociationLoading] = useState(false);

  // Feedback states
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  // Add Mill Form State
  const [millName, setMillName] = useState('');

  // Edit Mill State
  const [editingMill, setEditingMill] = useState(null);
  const [editName, setEditName] = useState('');

  // Farmer Association Modal
  const [associatingMill, setAssociatingMill] = useState(null);
  const [selectedFarmerIdToAdd, setSelectedFarmerIdToAdd] = useState('');
  const [assocError, setAssocError] = useState('');

  // Load Mills from backend
  const loadMills = useCallback(async () => {
    if (!token) return;
    setMillsLoading(true);
    setFormError('');

    try {
      const res = await getCommissiondarMills(token, includeInactive);
      const list = Array.isArray(res) ? res : res?.mills || res?.items || [];
      setMills(list);

      // Load associated farmers for each mill in background
      list.forEach(m => {
        getCommissiondarMillFarmers(m.id, token)
          .then(fRes => {
            const fList = Array.isArray(fRes) ? fRes : fRes?.farmers || fRes?.items || [];
            setMillFarmersMap(prev => ({ ...prev, [m.id]: fList }));
          })
          .catch(() => {});
      });
    } catch (err) {
      setFormError(`Failed to load mills: ${describeError(err)}`);
    } finally {
      setMillsLoading(false);
    }
  }, [token, includeInactive]);

  // Load Commissiondar's Farmers directory
  const loadFarmers = useCallback(async () => {
    if (!token) return;
    setFarmersLoading(true);
    try {
      const res = await getCommissiondarFarmers(token);
      const list = Array.isArray(res) ? res : res?.farmers || res?.items || [];
      setFarmers(list);
    } catch {
      // non-blocking
    } finally {
      setFarmersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadMills();
    loadFarmers();
  }, [loadMills, loadFarmers]);

  // Farmer options for SearchableSelect
  const farmerOptions = useMemo(() => {
    return farmers.map(f => ({
      id: f.id,
      name: f.name,
      subtitle: f.village ? `Village: ${f.village}` : 'Farmer',
      badge: f.phone || undefined,
    }));
  }, [farmers]);

  // Add Mill handler
  const handleAddMill = async e => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    const trimmed = millName.trim();
    if (!trimmed) {
      setFormError('Please enter a mill name.');
      return;
    }

    setActionBusy(true);
    try {
      await createCommissiondarMill({ name: trimmed }, token);
      setSuccess(`✓ Mill "${trimmed}" created successfully.`);
      setMillName('');
      await loadMills();
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setActionBusy(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = mill => {
    setEditingMill(mill);
    setEditName(mill.name);
    setFormError('');
  };

  // Save Edit handler
  const handleSaveEdit = async e => {
    e.preventDefault();
    if (!editName.trim() || !editingMill) return;

    setActionBusy(true);
    try {
      await updateCommissiondarMill(editingMill.id, { name: editName.trim() }, token);
      setSuccess(`✓ Mill "${editName.trim()}" updated successfully.`);
      setEditingMill(null);
      await loadMills();
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setActionBusy(false);
    }
  };

  // Deactivate or reactivate mill
  const handleToggleActive = async mill => {
    setActionBusy(true);
    setSuccess('');
    setFormError('');

    try {
      if (mill.is_active !== false) {
        // Deactivate via DELETE or PUT { is_active: false }
        await deleteCommissiondarMill(mill.id, token);
        setSuccess(`Mill "${mill.name}" deactivated.`);
      } else {
        // Reactivate via PUT { is_active: true }
        await updateCommissiondarMill(mill.id, { is_active: true }, token);
        setSuccess(`Mill "${mill.name}" reactivated.`);
      }
      await loadMills();
    } catch (err) {
      setFormError(describeError(err));
    } finally {
      setActionBusy(false);
    }
  };

  // Open Association Modal for a mill
  const handleOpenAssociations = async mill => {
    setAssociatingMill(mill);
    setSelectedFarmerIdToAdd('');
    setAssocError('');
    setAssociationLoading(true);

    try {
      const res = await getCommissiondarMillFarmers(mill.id, token);
      const list = Array.isArray(res) ? res : res?.farmers || res?.items || [];
      setMillFarmersMap(prev => ({ ...prev, [mill.id]: list }));
    } catch (err) {
      setAssocError(`Could not load farmers for this mill: ${describeError(err)}`);
    } finally {
      setAssociationLoading(false);
    }
  };

  // Associate a farmer to this mill
  const handleAddFarmerToMill = async () => {
    if (!associatingMill || !selectedFarmerIdToAdd) return;
    const fId = Number(selectedFarmerIdToAdd);
    setAssocError('');
    setAssociationLoading(true);

    try {
      await addFarmerToCommissiondarMill(associatingMill.id, fId, token);
      const res = await getCommissiondarMillFarmers(associatingMill.id, token);
      const list = Array.isArray(res) ? res : res?.farmers || res?.items || [];
      setMillFarmersMap(prev => ({ ...prev, [associatingMill.id]: list }));
      setSelectedFarmerIdToAdd('');
      setSuccess('✓ Farmer associated with mill.');
    } catch (err) {
      setAssocError(describeError(err));
    } finally {
      setAssociationLoading(false);
    }
  };

  // Remove farmer association from this mill
  const handleRemoveFarmerFromMill = async (millId, farmerId) => {
    setAssocError('');
    setAssociationLoading(true);

    try {
      await removeFarmerFromCommissiondarMill(millId, farmerId, token);
      const res = await getCommissiondarMillFarmers(millId, token);
      const list = Array.isArray(res) ? res : res?.farmers || res?.items || [];
      setMillFarmersMap(prev => ({ ...prev, [millId]: list }));
      setSuccess('✓ Association removed.');
    } catch (err) {
      setAssocError(describeError(err));
    } finally {
      setAssociationLoading(false);
    }
  };

  return (
    <div className="commissiondar-mills-page">
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">COMMISSIONDAR / MILL NETWORK</p>
        <h1 style={{ margin: '4px 0 8px' }}>My Mills & Farmer Associations</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Manage your independent directory of rice mills and associate farmers with each mill for stock delivery.
        </p>
      </div>

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

      {formError && (
        <div
          className="panel form-error"
          role="alert"
          style={{ padding: 14, marginBottom: 16 }}
        >
          {formError}
        </div>
      )}

      {/* Add Mill Form */}
      <div
        className="panel"
        style={{
          padding: 24,
          borderRadius: 18,
          border: '1px solid var(--border)',
          marginBottom: 26,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 24 }}>🏭</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Add Rice Mill</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Saved to your authenticated account on the backend. Independent of registered miller accounts.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddMill}>
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'flex-end',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: 260 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.86rem',
                  color: '#cbd5e1',
                  marginBottom: 6,
                  fontWeight: 650,
                }}
              >
                Mill Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Sri Lakshmi Srinivasa Rice Mill"
                value={millName}
                onChange={e => setMillName(e.target.value)}
                required
                disabled={actionBusy}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={actionBusy || !millName.trim()}
              style={{ minHeight: 44, padding: '0 24px' }}
            >
              {actionBusy ? 'Adding...' : '+ Add Mill to Account'}
            </button>
          </div>
        </form>
      </div>

      {/* Mills Directory & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
            Registered Mills ({mills.length})
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Each mill supports multiple farmer associations.
          </span>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', color: 'var(--muted)' }}>
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={e => setIncludeInactive(e.target.checked)}
          />
          Show Deactivated Mills
        </label>
      </div>

      {millsLoading ? (
        <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ margin: 0 }}>Loading your mills from backend...</p>
        </div>
      ) : mills.length === 0 ? (
        <div className="panel" style={{ padding: 36, textAlign: 'center' }}>
          <span style={{ fontSize: 36, display: 'block', marginBottom: 10 }}>🏭</span>
          <h3 style={{ margin: '0 0 6px' }}>No Mills Registered Yet</h3>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.9rem' }}>
            Add your first rice mill above to start linking farmers and tracking dispatches.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}
        >
          {mills.map(mill => {
            const isActive = mill.is_active !== false;
            const linkedFarmers = millFarmersMap[mill.id] || [];

            return (
              <div
                key={mill.id}
                className="panel"
                style={{
                  padding: 22,
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  background: isActive ? 'var(--surface)' : 'rgba(255, 255, 255, 0.02)',
                  opacity: isActive ? 1 : 0.7,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem' }}>{mill.name}</h3>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                        Mill Reference #{mill.id}
                      </span>
                    </div>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: isActive ? 'var(--green-light)' : '#ef4444',
                      }}
                    >
                      {isActive ? 'ACTIVE' : 'DEACTIVATED'}
                    </span>
                  </div>

                  {/* Associated Farmers count & preview */}
                  <div
                    style={{
                      background: 'var(--surface-soft)',
                      padding: '10px 14px',
                      borderRadius: 10,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        Associated Farmers:
                      </span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--green-light)' }}>
                        {linkedFarmers.length}
                      </strong>
                    </div>

                    {linkedFarmers.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                        {linkedFarmers.slice(0, 3).map(f => f.name || f.farmer_name).join(', ')}
                        {linkedFarmers.length > 3 && ` +${linkedFarmers.length - 3} more`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '7px 12px', fontSize: '0.82rem' }}
                    onClick={() => handleOpenAssociations(mill)}
                  >
                    👨‍🌾 Manage Farmers ({linkedFarmers.length})
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                    onClick={() => handleOpenEdit(mill)}
                  >
                    ✎ Edit
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{
                      padding: '7px 12px',
                      fontSize: '0.82rem',
                      color: isActive ? '#ef4444' : 'var(--green-light)',
                    }}
                    onClick={() => handleToggleActive(mill)}
                    disabled={actionBusy}
                  >
                    {isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT MILL MODAL */}
      {editingMill && (
        <div
          className="delete-modal-overlay"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget && !actionBusy) setEditingMill(null);
          }}
        >
          <div className="delete-modal" style={{ maxWidth: 440, textAlign: 'left', padding: 24 }}>
            <h2 style={{ margin: '0 0 14px' }}>Edit Mill Name</h2>

            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: 6 }}>
                  Mill Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditingMill(null)}
                  disabled={actionBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionBusy || !editName.trim()}
                >
                  {actionBusy ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FARMER ASSOCIATION MODAL */}
      {associatingMill && (
        <div
          className="delete-modal-overlay"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget && !associationLoading) setAssociatingMill(null);
          }}
        >
          <div
            className="delete-modal"
            style={{ maxWidth: 560, width: '100%', textAlign: 'left', padding: 26 }}
            role="dialog"
            aria-modal="true"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
                  Farmers Associated with {associatingMill.name}
                </h2>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: '2px 0 0' }}>
                  Link farmers from your directory. A farmer can belong to multiple mills.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setAssociatingMill(null)}
                style={{ fontSize: 20, padding: '2px 8px' }}
              >
                ×
              </button>
            </div>

            {assocError && (
              <div className="panel form-error" role="alert" style={{ padding: 10, marginBottom: 14 }}>
                {assocError}
              </div>
            )}

            {/* Associate New Farmer Section */}
            <div
              style={{
                background: 'var(--surface-soft)',
                padding: 16,
                borderRadius: 14,
                marginBottom: 20,
              }}
            >
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: 8, fontWeight: 650 }}>
                Link a Farmer to this Mill:
              </label>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <SearchableSelect
                    options={farmerOptions}
                    value={selectedFarmerIdToAdd}
                    onChange={setSelectedFarmerIdToAdd}
                    placeholder="Search farmer by name or village..."
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddFarmerToMill}
                  disabled={associationLoading || !selectedFarmerIdToAdd}
                  style={{ minHeight: 42, padding: '0 16px', whiteSpace: 'nowrap' }}
                >
                  {associationLoading ? 'Adding...' : '+ Associate'}
                </button>
              </div>
            </div>

            {/* Currently Associated Farmers List */}
            <div>
              <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: 'var(--muted)' }}>
                CURRENTLY LINKED FARMERS ({(millFarmersMap[associatingMill.id] || []).length})
              </h3>

              {associationLoading && (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>Updating associations...</p>
              )}

              {(millFarmersMap[associatingMill.id] || []).length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 10 }}>
                  No farmers currently linked to this mill. Select a farmer above to associate.
                </div>
              ) : (
                <div style={{ maxHeight: 240, overflowY: 'auto', display: 'grid', gap: 8 }}>
                  {(millFarmersMap[associatingMill.id] || []).map(f => {
                    const fId = f.id || f.farmer_id;
                    const fName = f.name || f.farmer_name;

                    return (
                      <div
                        key={fId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: 'var(--surface-soft)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '0.92rem' }}>{fName}</strong>
                          {f.village && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', marginLeft: 8 }}>
                              ({f.village})
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{
                            fontSize: '0.78rem',
                            color: '#ef4444',
                            padding: '4px 10px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                          }}
                          onClick={() => handleRemoveFarmerFromMill(associatingMill.id, fId)}
                          disabled={associationLoading}
                          title="Remove association (does not delete farmer from directory)"
                        >
                          ✕ Disassociate
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
                className="btn btn-secondary"
                onClick={() => setAssociatingMill(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
