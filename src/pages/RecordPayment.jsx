import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import SaveSuccess from '../components/SaveSuccess';
import { t } from '../strings';

const rupees = n => '₹' + n.toLocaleString('en-IN');
const blockBadKeys = e => {
  if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
};

export default function RecordPayment() {
  const { farmers, addPayment } = useData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [farmerId, setFarmerId] = useState(searchParams.get('farmer') || '');
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState(''); // optional
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const id = setTimeout(
      () => navigate(`/farmers/${farmerId}`, { state: { flash: true } }),
      1400
    );
    return () => clearTimeout(id);
  }, [saved, farmerId, navigate]);

  const selected = farmers.find(f => f.id === Number(farmerId));
  const amt = Number(amount);
  const overpay = selected && amt > selected.owed;

  const handleSubmit = e => {
    e.preventDefault();
    const found = {};
    if (!farmerId) found.farmerId = t.errFarmer;
    if (!(amt > 0)) found.amount = t.errAmount;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    addPayment({ farmerId: Number(farmerId), amount: amt, mode: mode || null });
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
      <h1>{t.recordPaymentTitle}</h1>

      <div className={`field ${errors.farmerId ? 'invalid' : ''}`}>
        <label htmlFor="farmer">{t.selectFarmer}</label>
        <select id="farmer" value={farmerId} onChange={e => setFarmerId(e.target.value)}>
          <option value="">{t.chooseFarmer}</option>
          {farmers.map(f => (
            <option key={f.id} value={f.id}>{f.name} ({f.village})</option>
          ))}
        </select>
        {errors.farmerId && <div className="field-error">{errors.farmerId}</div>}
        {selected && (
          <div className="field-warn">{t.currentlyOwed}: {rupees(selected.owed)}</div>
        )}
      </div>

      <div className={`field ${errors.amount ? 'invalid' : ''}`}>
        <label htmlFor="amount">{t.paymentAmount}</label>
        <input
          id="amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={amount}
          onKeyDown={blockBadKeys}
          onChange={e => setAmount(e.target.value)}
        />
        {errors.amount && <div className="field-error">{errors.amount}</div>}
        {overpay && <div className="field-warn">{t.warnOverpay}</div>}
      </div>

      <div className="field">
        <label htmlFor="mode">{t.paymentMode}</label>
        <select id="mode" value={mode} onChange={e => setMode(e.target.value)}>
          <option value="">{t.modeNone}</option>
          <option value="cash">{t.cash}</option>
          <option value="upi">{t.upi}</option>
          <option value="bank">{t.bank}</option>
          <option value="cheque">{t.cheque}</option>
        </select>
      </div>

      <div className="form-actions">
        <button type="submit">{t.save}</button>
        <Link to="/farmers">{t.cancel}</Link>
      </div>
    </form>
  );
}