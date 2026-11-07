
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { getItems, describeError } from '../api';
import { useAuth } from '../context/AuthContext';
import SaveSuccess from '../components/SaveSuccess';
import { t } from '../strings';

const rupees = n => '₹' + n.toLocaleString('en-IN');

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

  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [saved, setSaved] = useState(false);

  // Hide the Swagger test farmer named "string".
  const visibleFarmers = farmers.filter(
    f => f.name?.trim().toLowerCase() !== 'string'
  );

  // Load actual items from the authenticated backend.
  useEffect(() => {
    if (!token) {
      setItems([]);
      return;
    }

    let active = true;

    const loadItems = async () => {
      try {
        setItemsLoading(true);
        setItemsError('');

        const data = await getItems(token);

        if (active) {
          setItems(
            Array.isArray(data?.items) ? data.items : []
          );
        }
      } catch (err) {
        if (active) {
          setItemsError(describeError(err));
        }
      } finally {
        if (active) {
          setItemsLoading(false);
        }
      }
    };

    loadItems();

    return () => {
      active = false;
    };
  }, [token]);

  // Navigate after successful intake submission.
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

  const total =
    qty > 0 && rt > 0
      ? Math.round(qty * rt * 100) / 100
      : 0;

  const handleSubmit = async e => {
    e.preventDefault();

    const found = {};

    if (!farmerId) {
      found.farmerId = t.errFarmer;
    }

    if (!itemId) {
      found.itemId = 'Please select an item.';
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
        farmerId: Number(farmerId),
        itemId: Number(itemId),
        quantity: qty,
        rate: rt
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
      <h1>{t.recordIntakeTitle}</h1>

      {/* Farmer Selection */}
      <div className={`field ${errors.farmerId ? 'invalid' : ''}`}>
        <label htmlFor="farmer">{t.selectFarmer}</label>

        <select
          id="farmer"
          value={farmerId}
          onChange={e => setFarmerId(e.target.value)}
        >
          <option value="">{t.chooseFarmer}</option>

          {visibleFarmers.map(f => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.village})
            </option>
          ))}
        </select>

        {errors.farmerId && (
          <div className="field-error">
            {errors.farmerId}
          </div>
        )}
      </div>

      {/* Backend Item Selection */}
      <div className={`field ${errors.itemId ? 'invalid' : ''}`}>
        <label htmlFor="item">Select Paddy Item</label>

        <select
          id="item"
          value={itemId}
          onChange={e => setItemId(e.target.value)}
          disabled={itemsLoading || items.length === 0}
        >
          <option value="">
            {itemsLoading ? 'Loading items...' : 'Choose an item'}
          </option>

          {items.map(item => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.category} - {item.unit})
            </option>
          ))}
        </select>

        {errors.itemId && (
          <div className="field-error">
            {errors.itemId}
          </div>
        )}

        {itemsError && (
          <div className="field-error">
            {itemsError}
          </div>
        )}

        {!itemsLoading && !itemsError && items.length === 0 && (
          <div className="field-error">
            No active items available.
          </div>
        )}
      </div>

      {/* Quantity */}
      <div className={`field ${errors.quantity ? 'invalid' : ''}`}>
        <label htmlFor="quantity">{t.quantity}</label>

        <input
          id="quantity"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={quantity}
          onKeyDown={blockBadKeys}
          onChange={e => setQuantity(e.target.value)}
        />

        {errors.quantity && (
          <div className="field-error">
            {errors.quantity}
          </div>
        )}
      </div>

      {/* Rate */}
      <div className={`field ${errors.rate ? 'invalid' : ''}`}>
        <label htmlFor="rate">{t.rate}</label>

        <input
          id="rate"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={rate}
          onKeyDown={blockBadKeys}
          onChange={e => setRate(e.target.value)}
        />

        {errors.rate && (
          <div className="field-error">
            {errors.rate}
          </div>
        )}
      </div>

      {/* Total Amount */}
      <div className="total-row">
        <span>{t.totalAmount}</span>
        <strong>{rupees(total)}</strong>
      </div>

      {submitError && (
        <div className="form-error" role="alert">
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="form-actions">
        <button
          type="submit"
          disabled={saving || itemsLoading || !!itemsError || items.length === 0}
        >
          {saving ? t.saving : t.save}
        </button>

        <Link to="/farmers">{t.cancel}</Link>
      </div>
    </form>
  );
}
