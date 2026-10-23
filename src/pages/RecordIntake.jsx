import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import SaveSuccess from '../components/SaveSuccess';
import { t } from '../strings';

// suggestions only: replace with your mill's real varieties
const VARIETIES = ['Sona Masoori (BPT 5204)', 'Swarna (MTU 7029)', 'MTU 1010'];

const rupees = n => '₹' + n.toLocaleString('en-IN');
const blockBadKeys = e => {
  if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
};

export default function RecordIntake() {
  const { farmers, addIntake } = useData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [farmerId, setFarmerId] = useState(searchParams.get('farmer') || '');
  const [variety, setVariety] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(() => navigate(`/farmers/${farmerId}`), 1400);
    return () => clearTimeout(id);
  }, [saved, farmerId, navigate]);

  const qty = Number(quantity);
  const rt = Number(rate);
  const total = qty > 0 && rt > 0 ? Math.round(qty * rt * 100) / 100 : 0;

  const handleSubmit = e => {
    e.preventDefault();
    const found = {};
    if (!farmerId) found.farmerId = t.errFarmer;
    if (!variety.trim()) found.variety = t.errVariety;
    if (!(qty > 0)) found.quantity = t.errQuantity;
    if (!(rt > 0)) found.rate = t.errRate;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    addIntake({ farmerId: Number(farmerId), variety: variety.trim(), quantity: qty, rate: rt });
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="panel form-card">
        <SaveSuccess />
      </div>
    );
  }

  return (
    <form className="panel form-card" onSubmit={handleSubmit} noValidate>
      <h1>{t.recordIntakeTitle}</h1>

      <div className={`field ${errors.farmerId ? 'invalid' : ''}`}>
        <label htmlFor="farmer">{t.selectFarmer}</label>
        <select id="farmer" value={farmerId} onChange={e => setFarmerId(e.target.value)}>
          <option value="">{t.chooseFarmer}</option>
          {farmers.map(f => (
            <option key={f.id} value={f.id}>{f.name} ({f.village})</option>
          ))}
        </select>
        {errors.farmerId && <div className="field-error">{errors.farmerId}</div>}
      </div>

      <div className={`field ${errors.variety ? 'invalid' : ''}`}>
        <label htmlFor="variety">{t.variety}</label>
        <input
          id="variety"
          list="varieties"
          placeholder={t.varietyPlaceholder}
          value={variety}
          onChange={e => setVariety(e.target.value)}
        />
        <datalist id="varieties">
          {VARIETIES.map(v => <option key={v} value={v} />)}
        </datalist>
        {errors.variety && <div className="field-error">{errors.variety}</div>}
      </div>

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
        {errors.quantity && <div className="field-error">{errors.quantity}</div>}
      </div>

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
        {errors.rate && <div className="field-error">{errors.rate}</div>}
      </div>

      <div className="total-row">
        <span>{t.totalAmount}</span>
        <strong>{rupees(total)}</strong>
      </div>

      <div className="form-actions">
        <button type="submit">{t.save}</button>
        <Link to="/farmers">{t.cancel}</Link>
      </div>
    </form>
  );
}