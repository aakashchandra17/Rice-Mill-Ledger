import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { getItems, getMillerCommissiondars, describeError } from '../api';
import { useAuth } from '../context/AuthContext';
import SaveSuccess from '../components/SaveSuccess';
import SearchableSelect from '../components/SearchableSelect';
import { t } from '../strings';

const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN');

const blockBadKeys = e => {
  if (['-', '+', 'e', 'E'].includes(e.key)) {
    e.preventDefault();
  }
};

export default function RecordIntake() {
  const { farmers, addIntake } = useData();
  const { token } = useAuth();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [farmerId, setFarmerId] = useState(
    searchParams.get('farmer') || ''
  );

  const [itemId, setItemId] = useState('');
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState('');

  const [brokerId, setBrokerId] = useState('');
  const [contacts, setContacts] = useState([]);

  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [moisturePct, setMoisturePct] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [saved, setSaved] = useState(false);

  // Filter out any Swagger test farmer named "string"
  const visibleFarmers = useMemo(() => {
    return farmers.filter(
      f => f.name?.trim().toLowerCase() !== 'string'
    );
  }, [farmers]);

  // Options for Farmer SearchableSelect
  const farmerOptions = useMemo(() => {
    return visibleFarmers.map(f => ({
      id: f.id,
      name: f.name,
      subtitle: `Village: ${f.village || '-'} • Stock: ${f.stock} • Owed: ₹${Number(f.owed || 0).toLocaleString('en-IN')}`,
      badge: f.stock > 0 ? `${f.stock} in stock` : undefined,
    }));
  }, [visibleFarmers]);

  // Load items from backend
  useEffect(() => {
    if (!token) return;
    let active = true;

    setItemsLoading(true);
    setItemsError('');

    getItems(token)
      .then(data => {
        if (!active) return;
        const list = Array.isArray(data?.items) ? data.items : [];
        setItems(list);
        if (list.length > 0 && !itemId) {
          setItemId(list[0].id);
        }
      })
      .catch(err => {
        if (active) setItemsError(describeError(err));
      })
      .finally(() => {
        if (active) setItemsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  // Load commissiondar contacts for broker selection
  useEffect(() => {
    if (!token) return;
    let active = true;

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

  // Automatically pre-fill broker if farmer has associated commissiondar
  useEffect(() => {
    if (farmerId) {
      const selectedFarmer = farmers.find(f => Number(f.id) === Number(farmerId));
      if (selectedFarmer?.associated_commissiondar_id) {
        setBrokerId(selectedFarmer.associated_commissiondar_id);
      }
    }
  }, [farmerId, farmers]);

  // Options for Paddy Items
  const itemOptions = useMemo(() => {
    return items.map(item => ({
      id: item.id,
      name: item.name,
      subtitle: [item.category, item.unit].filter(Boolean).join(' • ') || 'Grain Item',
      badge: item.unit || undefined,
    }));
  }, [items]);

  // Options for Broker Contacts
  const brokerOptions = useMemo(() => {
    return contacts.map(c => ({
      id: c.id,
      name: c.name,
      subtitle: c.village ? `Village: ${c.village} • Phone: ${c.phone || '-'}` : (c.phone || 'Broker'),
      badge: 'Broker',
    }));
  }, [contacts]);

  // Auto-redirect after save
  useEffect(() => {
    if (!saved) return;

    const id = setTimeout(
      () => navigate(`/farmers/${farmerId}`, {
        state: { flash: true }
      }),
      1400
    );

    return () => clearTimeout(id);
  }, [saved, farmerId, navigate]);

  const qty = Number(quantity);
  const rt = Number(rate);
  const total = qty > 0 && rt > 0 ? Math.round(qty * rt * 100) / 100 : 0;

  const handleSubmit = async e => {
    e.preventDefault();

    const found = {};

    if (!farmerId) {
      found.farmerId = t.errFarmer;
    }

    if (!itemId) {
      found.itemId = 'Please select a grain item.';
    }

    if (!(qty > 0)) {
      found.quantity = t.errQuantity;
    }

    if (!(rt > 0)) {
      found.rate = t.errRate;
    }

    setErrors(found);

    if (Object.keys(found).length > 0) return;

    setSubmitError('');
    setSaving(true);

    try {
      await addIntake({
        farmer_id: Number(farmerId),
        item_id: Number(itemId),
        quantity: qty,
        rate: rt,
        moisturePct: moisturePct ? Number(moisturePct) : null,
        brokerId: brokerId ? Number(brokerId) : null,
        commissionAmount: commissionAmount ? Number(commissionAmount) : null,
      });

      setSaved(true);
    } catch (err) {
      setSubmitError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="panel form-card">
        <SaveSuccess />
      </div>
    );
  }

  return (
    <form
      className="panel form-card"
      onSubmit={handleSubmit}
      noValidate
    >
      <div style={{ marginBottom: 4 }}>
        <p className="dashboard-eyebrow">MILLER / INVENTORY</p>
        <h1 style={{ margin: '4px 0 6px' }}>{t.recordIntakeTitle}</h1>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.9rem' }}>
          Record arriving paddy stock, calculate totals, and track optional broker commission.
        </p>
      </div>

      {/* Name-based Farmer Selection */}
      <div className="field">
        <SearchableSelect
          id="intakeFarmer"
          label={t.selectFarmer}
          placeholder="Search and select farmer by name..."
          options={farmerOptions}
          value={farmerId}
          onChange={id => {
            setFarmerId(id);
            setErrors(prev => ({ ...prev, farmerId: undefined }));
          }}
          required
          error={errors.farmerId}
        />
      </div>

      {/* Name-based Paddy Item Selection */}
      <div className="field">
        <SearchableSelect
          id="intakeItem"
          label="Paddy / Grain Variety"
          placeholder={itemsLoading ? 'Loading grain items...' : 'Search grain variety by name...'}
          options={itemOptions}
          value={itemId}
          onChange={id => {
            setItemId(id);
            setErrors(prev => ({ ...prev, itemId: undefined }));
          }}
          disabled={itemsLoading || items.length === 0}
          required
          error={errors.itemId || itemsError}
        />
      </div>

      {/* Optional Broker Selection */}
      <div className="field">
        <SearchableSelect
          id="intakeBroker"
          label="Commissiondar / Broker Contact (Optional)"
          placeholder="Search broker contact name..."
          options={brokerOptions}
          value={brokerId}
          onChange={id => setBrokerId(id)}
        />
      </div>

      {/* Quantity & Rate in a 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className={`field ${errors.quantity ? 'invalid' : ''}`}>
          <label htmlFor="quantity">{t.quantity} (Quintals/Bags) *</label>
          <input
            id="quantity"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="e.g. 50"
            value={quantity}
            onKeyDown={blockBadKeys}
            onChange={e => {
              setQuantity(e.target.value);
              setErrors(prev => ({ ...prev, quantity: undefined }));
            }}
          />
          {errors.quantity && <div className="field-error">{errors.quantity}</div>}
        </div>

        <div className={`field ${errors.rate ? 'invalid' : ''}`}>
          <label htmlFor="rate">{t.rate} (₹ per unit) *</label>
          <input
            id="rate"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="e.g. 2150"
            value={rate}
            onKeyDown={blockBadKeys}
            onChange={e => {
              setRate(e.target.value);
              setErrors(prev => ({ ...prev, rate: undefined }));
            }}
          />
          {errors.rate && <div className="field-error">{errors.rate}</div>}
        </div>
      </div>

      {/* Optional Moisture % and Commission */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div className="field">
          <label htmlFor="moisture">Moisture % (Optional)</label>
          <input
            id="moisture"
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="e.g. 14.5"
            value={moisturePct}
            onChange={e => setMoisturePct(e.target.value)}
          />
        </div>

        {brokerId && (
          <div className="field">
            <label htmlFor="commission">Broker Commission (₹) (Optional)</label>
            <input
              id="commission"
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 250"
              value={commissionAmount}
              onChange={e => setCommissionAmount(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Total Amount Card */}
      <div className="total-row">
        <div>
          <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{t.totalAmount}</span>
          <div style={{ fontSize: '0.8rem', color: 'var(--green-light)', marginTop: 2 }}>
            {qty > 0 && rt > 0 ? `${qty} units @ ₹${rt}` : 'Enter quantity and rate'}
          </div>
        </div>
        <strong>{rupees(total)}</strong>
      </div>

      {submitError && (
        <div className="form-error" role="alert">
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="form-actions" style={{ marginTop: 8 }}>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving || itemsLoading || items.length === 0}
        >
          {saving ? t.saving : t.save}
        </button>

        <Link to="/farmers" className="btn btn-ghost">
          {t.cancel}
        </Link>
      </div>
    </form>
  );
}
