import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getItems,
  createItem,
  updateItem,
  deactivateItem,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';

const COMMON_UNITS = ['quintal', 'kg', 'bag', 'ton', 'metric ton'];
const COMMON_CATEGORIES = [
  'Paddy',
  'Raw Rice',
  'Boiled Rice',
  'Steam Rice',
  'Basmati',
  'Non-Basmati',
  'Broken Rice',
  'Bran',
  'Husk',
];

export default function MillerGrains() {
  const { token } = useAuth();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('quintal');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editUnit, setEditUnit] = useState('quintal');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Deactivate confirmation modal state
  const [deactivatingItem, setDeactivatingItem] = useState(null);
  const [deactivateSaving, setDeactivateSaving] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'

  const loadItems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const data = await getItems(token);
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];
      setItems(list);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Handle Add Item
  const handleAddSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setSuccess('');

    const trimmedName = name.trim();
    const trimmedUnit = unit.trim();
    const trimmedCategory = category.trim();

    if (!trimmedName) {
      setFormError('Please enter a grain variety name.');
      return;
    }

    if (!trimmedUnit) {
      setFormError('Please enter or select a unit of measurement.');
      return;
    }

    setSaving(true);

    try {
      await createItem(
        {
          name: trimmedName,
          category: trimmedCategory || undefined,
          unit: trimmedUnit,
        },
        token
      );

      setSuccess(`✓ Grain variety "${trimmedName}" created successfully.`);
      setName('');
      setCategory('');
      setUnit('quintal');
      await loadItems();
    } catch (err) {
      if (err?.status === 409) {
        setFormError(
          err.message ||
            `A grain variety named "${trimmedName}" already exists for your mill.`
        );
      } else {
        setFormError(describeError(err));
      }
    } finally {
      setSaving(false);
    }
  };

  // Open Edit Modal
  const openEditModal = item => {
    setEditingItem(item);
    setEditName(item.name || '');
    setEditCategory(item.category || '');
    setEditUnit(item.unit || 'quintal');
    setEditError('');
  };

  const closeEditModal = () => {
    if (editSaving) return;
    setEditingItem(null);
    setEditError('');
  };

  // Handle Edit Submit
  const handleEditSubmit = async e => {
    e.preventDefault();
    if (!editingItem) return;

    setEditError('');
    const trimmedName = editName.trim();
    const trimmedUnit = editUnit.trim();
    const trimmedCategory = editCategory.trim();

    if (!trimmedName) {
      setEditError('Please enter a grain variety name.');
      return;
    }

    if (!trimmedUnit) {
      setEditError('Please enter or select a unit.');
      return;
    }

    setEditSaving(true);

    try {
      await updateItem(
        editingItem.id,
        {
          name: trimmedName,
          category: trimmedCategory || undefined,
          unit: trimmedUnit,
        },
        token
      );

      setSuccess(`✓ Grain variety "${trimmedName}" updated successfully.`);
      closeEditModal();
      await loadItems();
    } catch (err) {
      if (err?.status === 409) {
        setEditError(
          err.message ||
            `Another grain variety named "${trimmedName}" already exists.`
        );
      } else {
        setEditError(describeError(err));
      }
    } finally {
      setEditSaving(false);
    }
  };

  // Open Deactivate Confirmation Modal
  const openDeactivateModal = item => {
    setDeactivatingItem(item);
    setDeactivateError('');
  };

  const closeDeactivateModal = () => {
    if (deactivateSaving) return;
    setDeactivatingItem(null);
    setDeactivateError('');
  };

  // Handle Deactivate Confirm
  const handleDeactivateConfirm = async () => {
    if (!deactivatingItem) return;
    setDeactivateError('');
    setDeactivateSaving(true);

    try {
      await deactivateItem(deactivatingItem.id, token);
      setSuccess(
        `✓ Grain variety "${deactivatingItem.name}" deactivated. It will no longer appear in new Intake or Export options.`
      );
      closeDeactivateModal();
      await loadItems();
    } catch (err) {
      setDeactivateError(describeError(err));
    } finally {
      setDeactivateSaving(false);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = items.length;
    const active = items.filter(i => i.is_active !== false).length;
    const inactive = items.filter(i => i.is_active === false).length;
    return { total, active, inactive };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return items.filter(item => {
      const matchesSearch =
        !query ||
        item.name?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.unit?.toLowerCase().includes(query);

      const isActive = item.is_active !== false;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && isActive) ||
        (statusFilter === 'inactive' && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter]);

  return (
    <div className="miller-grains-page">
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <p className="dashboard-eyebrow">MILLER / GRAIN MANAGEMENT</p>
        <h1 style={{ margin: '4px 0 8px' }}>Custom Grain Varieties</h1>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          Manage custom paddy and grain varieties processed by your mill. Active
          varieties appear in Record Intake and Export dispatches.
        </p>
      </div>

      {/* Global Alerts */}
      {error && (
        <div
          className="panel form-error"
          role="alert"
          style={{ padding: 14, marginBottom: 16 }}
        >
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

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          className="panel"
          style={{
            padding: 20,
            borderRadius: 16,
            border: '1px solid var(--border)',
          }}
        >
          <p
            style={{
              color: 'var(--muted)',
              fontSize: 13,
              margin: '0 0 6px',
              fontWeight: 600,
            }}
          >
            Total Grain Varieties
          </p>
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: '1.9rem',
              color: 'var(--ink)',
            }}
          >
            {metrics.total}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Configured in catalog
          </p>
        </div>

        <div
          className="panel"
          style={{
            padding: 20,
            borderRadius: 16,
            border: '1px solid var(--border)',
          }}
        >
          <p
            style={{
              color: 'var(--muted)',
              fontSize: 13,
              margin: '0 0 6px',
              fontWeight: 600,
            }}
          >
            Active Varieties
          </p>
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: '1.9rem',
              color: 'var(--green-light)',
            }}
          >
            {metrics.active}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Available for intake & exports
          </p>
        </div>

        <div
          className="panel"
          style={{
            padding: 20,
            borderRadius: 16,
            border: '1px solid var(--border)',
          }}
        >
          <p
            style={{
              color: 'var(--muted)',
              fontSize: 13,
              margin: '0 0 6px',
              fontWeight: 600,
            }}
          >
            Inactive Varieties
          </p>
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: '1.9rem',
              color: 'var(--muted)',
            }}
          >
            {metrics.inactive}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, margin: 0 }}>
            Preserved in audit history
          </p>
        </div>
      </div>

      {/* Add New Grain Variety Panel */}
      <div
        className="panel"
        style={{
          padding: 24,
          borderRadius: 18,
          border: '1px solid var(--border)',
          marginBottom: 26,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 24 }}>🌾</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>
              Add Custom Grain Variety
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '2px 0 0' }}>
              Create a new grain or paddy variety for your mill with a name,
              optional category, and measurement unit.
            </p>
          </div>
        </div>

        {formError && (
          <div
            className="panel form-error"
            role="alert"
            style={{ padding: 12, marginBottom: 14 }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleAddSubmit}>
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
              <label
                htmlFor="grainName"
                style={{
                  display: 'block',
                  fontSize: '0.86rem',
                  color: '#cbd5e1',
                  marginBottom: 6,
                  fontWeight: 650,
                }}
              >
                Grain Variety Name *
              </label>
              <input
                id="grainName"
                type="text"
                placeholder="e.g. Sona Masoori Raw, BPT 5204"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={saving}
              />
            </div>

            <div>
              <label
                htmlFor="grainCategory"
                style={{
                  display: 'block',
                  fontSize: '0.86rem',
                  color: '#cbd5e1',
                  marginBottom: 6,
                  fontWeight: 650,
                }}
              >
                Category (Optional)
              </label>
              <input
                id="grainCategory"
                type="text"
                list="categoryList"
                placeholder="e.g. Paddy, Raw Rice, Basmati"
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={saving}
              />
              <datalist id="categoryList">
                {COMMON_CATEGORIES.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="grainUnit"
                style={{
                  display: 'block',
                  fontSize: '0.86rem',
                  color: '#cbd5e1',
                  marginBottom: 6,
                  fontWeight: 650,
                }}
              >
                Measurement Unit *
              </label>
              <input
                id="grainUnit"
                type="text"
                list="unitList"
                placeholder="e.g. quintal, kg, bag"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                required
                disabled={saving}
              />
              <datalist id="unitList">
                {COMMON_UNITS.map(u => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !name.trim()}
            style={{ minHeight: 44 }}
          >
            {saving ? 'Adding Variety...' : '+ Add Grain Variety'}
          </button>
        </form>
      </div>

      {/* Grain Varieties Table Panel */}
      <div
        className="panel"
        style={{
          padding: 24,
          borderRadius: 18,
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Configured Grain Varieties</h2>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: 13,
                margin: '4px 0 0',
              }}
            >
              List of all grain varieties configured under your authenticated
              mill account.
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Search varieties..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                maxWidth: 220,
                padding: '8px 12px',
                fontSize: '0.88rem',
              }}
            />

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                fontSize: '0.88rem',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={loadItems}
              disabled={loading}
              title="Refresh list"
              style={{ padding: '8px 14px', fontSize: '0.88rem' }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
            <p style={{ fontSize: 28, margin: 0 }}>⏳</p>
            <p style={{ marginTop: 10 }}>Loading grain varieties...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 32, margin: 0 }}>🌾</p>
            <h3 style={{ margin: '12px 0 6px' }}>
              {items.length === 0
                ? 'No grain varieties added yet'
                : 'No matching grain varieties'}
            </h3>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: 13,
                maxWidth: 400,
                margin: '0 auto',
              }}
            >
              {items.length === 0
                ? 'Use the form above to add your first custom grain variety, such as Sona Masoori or Basmati.'
                : 'Try clearing your search term or changing the status filter.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 14px' }}>
                    Grain Variety Name
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 14px' }}>
                    Category
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 14px' }}>
                    Unit
                  </th>
                  <th style={{ textAlign: 'left', padding: '12px 14px' }}>
                    Status
                  </th>
                  <th style={{ textAlign: 'right', padding: '12px 14px' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const isActive = item.is_active !== false;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        opacity: isActive ? 1 : 0.65,
                      }}
                    >
                      <td
                        style={{
                          padding: '14px',
                          fontWeight: 650,
                          color: isActive ? 'var(--ink)' : 'var(--muted)',
                        }}
                      >
                        {item.name}
                      </td>
                      <td style={{ padding: '14px', color: 'var(--muted)' }}>
                        {item.category || '—'}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: 'rgba(255, 255, 255, 0.06)',
                            fontSize: '0.82rem',
                            color: '#cbd5e1',
                          }}
                        >
                          {item.unit || 'quintal'}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 9px',
                            borderRadius: 12,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            background: isActive
                              ? 'rgba(34, 197, 94, 0.15)'
                              : 'rgba(148, 163, 184, 0.15)',
                            color: isActive
                              ? 'var(--green-light)'
                              : 'var(--muted)',
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: isActive
                                ? 'var(--green)'
                                : 'var(--muted)',
                            }}
                          />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: 8,
                            justifyContent: 'flex-end',
                          }}
                        >
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => openEditModal(item)}
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.82rem',
                            }}
                          >
                            Edit
                          </button>

                          {isActive && (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => openDeactivateModal(item)}
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.82rem',
                                color: '#fca5a5',
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                              }}
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={e => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div
            className="panel modal-card"
            style={{
              width: '100%',
              maxWidth: 480,
              padding: 26,
              borderRadius: 18,
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                Edit Grain Variety
              </h3>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeEditModal}
                disabled={editSaving}
                style={{
                  padding: '2px 8px',
                  borderRadius: '50%',
                  lineHeight: '1.2',
                }}
              >
                ✕
              </button>
            </div>

            {editError && (
              <div
                className="panel form-error"
                role="alert"
                style={{ padding: 12, marginBottom: 14 }}
              >
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="editName"
                  style={{
                    display: 'block',
                    fontSize: '0.86rem',
                    color: '#cbd5e1',
                    marginBottom: 6,
                    fontWeight: 650,
                  }}
                >
                  Grain Variety Name *
                </label>
                <input
                  id="editName"
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  disabled={editSaving}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="editCategory"
                  style={{
                    display: 'block',
                    fontSize: '0.86rem',
                    color: '#cbd5e1',
                    marginBottom: 6,
                    fontWeight: 650,
                  }}
                >
                  Category
                </label>
                <input
                  id="editCategory"
                  type="text"
                  list="editCategoryList"
                  placeholder="e.g. Paddy, Basmati"
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value)}
                  disabled={editSaving}
                />
                <datalist id="editCategoryList">
                  {COMMON_CATEGORIES.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="editUnit"
                  style={{
                    display: 'block',
                    fontSize: '0.86rem',
                    color: '#cbd5e1',
                    marginBottom: 6,
                    fontWeight: 650,
                  }}
                >
                  Measurement Unit *
                </label>
                <input
                  id="editUnit"
                  type="text"
                  list="editUnitList"
                  placeholder="e.g. quintal, kg, bag"
                  value={editUnit}
                  onChange={e => setEditUnit(e.target.value)}
                  required
                  disabled={editSaving}
                />
                <datalist id="editUnitList">
                  {COMMON_UNITS.map(u => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeEditModal}
                  disabled={editSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editSaving || !editName.trim()}
                >
                  {editSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {deactivatingItem && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={e => {
            if (e.target === e.currentTarget) closeDeactivateModal();
          }}
        >
          <div
            className="panel modal-card"
            style={{
              width: '100%',
              maxWidth: 460,
              padding: 26,
              borderRadius: 18,
              border: '1px solid rgba(239, 68, 68, 0.4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 14,
              }}
            >
              <span style={{ fontSize: 28 }}>⚠️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fca5a5' }}>
                  Deactivate Grain Variety?
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: 13, margin: '2px 0 0' }}>
                  Confirmation required
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.92rem', color: '#e2e8f0', lineHeight: 1.5 }}>
              Are you sure you want to deactivate{' '}
              <strong>"{deactivatingItem.name}"</strong>?
            </p>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                fontSize: '0.84rem',
                color: '#fca5a5',
                marginBottom: 18,
              }}
            >
              <strong>Note:</strong> Deactivating will remove this variety from
              new intake and export selection lists. All historical movement
              records and inventory ledgers will remain completely intact.
            </div>

            {deactivateError && (
              <div
                className="panel form-error"
                role="alert"
                style={{ padding: 12, marginBottom: 14 }}
              >
                {deactivateError}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeDeactivateModal}
                disabled={deactivateSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDeactivateConfirm}
                disabled={deactivateSaving}
                style={{
                  backgroundColor: '#dc2626',
                  borderColor: '#dc2626',
                  color: '#fff',
                }}
              >
                {deactivateSaving ? 'Deactivating...' : 'Confirm Deactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
