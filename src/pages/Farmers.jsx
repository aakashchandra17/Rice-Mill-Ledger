
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { t } from '../strings';

export default function Farmers() {
  const {
    farmers,
    addFarmerRecord,
    farmersLoading,
    farmersError,
  } = useData();

  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
      });

      setName('');
      setVillage('');
      setMessage('Farmer added successfully!');
    } catch (err) {
      setError(
        err.message || 'Unable to add farmer. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel">
      <h1>{t.farmers}</h1>

      {/* Add Farmer Section */}
      <div style={{ marginBottom: 30 }}>
        <h2>Add New Farmer</h2>

        <form onSubmit={handleSubmit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 15,
              marginBottom: 15,
            }}
          >
            <div>
              <label htmlFor="farmerName">Farmer Name</label>
              <input
                id="farmerName"
                type="text"
                placeholder="Enter farmer name"
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
                placeholder="Enter village name"
                value={village}
                onChange={e => setVillage(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Add Farmer'}
          </button>
        </form>

        {message && (
          <p style={{ color: 'green', marginTop: 12 }}>
            {message}
          </p>
        )}

        {error && (
          <p style={{ color: 'red', marginTop: 12 }}>
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
        <p style={{ color: 'red' }}>{farmersError}</p>
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
              <th>{t.stock}</th>
              <th>{t.owed}</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {visibleFarmers.map(f => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td>{f.village}</td>
                <td>{f.stock}</td>
                <td>
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
                    <Link to={`/farmers/${f.id}`}>
                      {t.view}
                    </Link>

                    <Link
                      className="btn"
                      to={`/intake?farmer=${f.id}`}
                    >
                      {t.recordIntake}
                    </Link>

                    <Link
                      className="btn btn-ghost"
                      to={`/payment?farmer=${f.id}`}
                    >
                      {t.recordPayment}
                    </Link>

                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => setSelectedFarmer(f)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {selectedFarmer && (
        <div
          className="delete-modal-overlay"
          onClick={() => setSelectedFarmer(null)}
        >
          <div
            className="delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="delete-title">
              Confirm Farmer Deletion
            </h2>

            <p>
              Are you sure you want to delete{' '}
              <strong>{selectedFarmer.name}</strong>?
            </p>

            <p className="delete-warning">
              Actual deletion is not connected yet. Your farmer
              data is safe.
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedFarmer(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setSelectedFarmer(null)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
