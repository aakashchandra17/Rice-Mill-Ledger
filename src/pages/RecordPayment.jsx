import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { describeError } from '../api';
import SearchableSelect from '../components/SearchableSelect';
import { t } from '../strings';

const rupees = n =>
  '₹' + Number(n || 0).toLocaleString('en-IN');

const blockBadKeys = e => {
  if (['-', '+', 'e', 'E'].includes(e.key)) {
    e.preventDefault();
  }
};

export default function RecordPayment() {
  const { farmers, addPayment } = useData();
  const [searchParams] = useSearchParams();

  const [farmerId, setFarmerId] = useState(
    searchParams.get('farmer') || ''
  );
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [receipt, setReceipt] = useState(null);

  const visibleFarmers = useMemo(() => {
    return farmers.filter(f => f.name?.trim().toLowerCase() !== 'string');
  }, [farmers]);

  const farmerOptions = useMemo(() => {
    return visibleFarmers.map(f => ({
      id: f.id,
      name: f.name,
      subtitle: `Village: ${f.village || '-'} • Currently Owed: ₹${Number(f.owed || 0).toLocaleString('en-IN')}`,
      badge: Number(f.owed) > 0 ? `Owed: ₹${Number(f.owed).toLocaleString('en-IN')}` : 'Settled',
    }));
  }, [visibleFarmers]);

  const selected = farmers.find(
    f => Number(f.id) === Number(farmerId)
  );

  const amt = Number(amount);
  const overpay = selected && amt > Number(selected.owed || 0);

  const handleSubmit = async e => {
    e.preventDefault();

    const found = {};

    if (!farmerId) found.farmerId = t.errFarmer;

    if (!Number.isFinite(amt) || amt <= 0) {
      found.amount = t.errAmount;
    }

    setErrors(found);

    if (Object.keys(found).length > 0) return;

    setSubmitError('');
    setSaving(true);

    try {
      await addPayment({
        farmer_id: Number(farmerId),
        amount: amt,
        mode: mode || null,
      });

      setReceipt({
        receiptNo: `PAY-${Date.now()}`,
        farmerName: selected?.name || 'Farmer',
        village: selected?.village || '-',
        amount: amt,
        mode: mode || 'Not specified',
        date: new Date().toLocaleDateString('en-IN'),
        time: new Date().toLocaleTimeString('en-IN'),
      });
    } catch (err) {
      setSubmitError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (receipt) {
    return (
      <div className="panel form-card">
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            .payment-receipt,
            .payment-receipt * {
              visibility: visible !important;
            }
            .payment-receipt {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0 !important;
              box-shadow: none !important;
              border: 1px solid #999 !important;
              color: #000 !important;
              background: #fff !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        <div
          className="payment-receipt"
          style={{
            maxWidth: 600,
            margin: '0 auto',
            padding: 28,
            border: '1px solid var(--border)',
            borderRadius: 16,
            background: 'var(--surface)',
            color: 'var(--ink)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{ marginBottom: 5 }}>PAYMENT RECEIPT</h1>
            <p style={{ color: 'var(--muted)', margin: 0 }}>
              Grain Ledger • Rice Mill Management
            </p>
            <p style={{ color: 'var(--green-glow)', fontWeight: 750, marginTop: 4 }}>
              ✓ Payment Recorded Successfully
            </p>
          </div>

          <hr style={{ borderColor: 'var(--border)', margin: '16px 0' }} />

          <div style={{ margin: '18px 0', lineHeight: 2 }}>
            <div>
              <strong>Receipt No:</strong> {receipt.receiptNo}
            </div>
            <div>
              <strong>Date:</strong> {receipt.date}
            </div>
            <div>
              <strong>Time:</strong> {receipt.time}
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border)', margin: '16px 0' }} />

          <h3>Farmer Details</h3>

          <div style={{ lineHeight: 2 }}>
            <div><strong>Name:</strong> {receipt.farmerName}</div>
            <div><strong>Village:</strong> {receipt.village}</div>
          </div>

          <hr style={{ borderColor: 'var(--border)', margin: '16px 0' }} />

          <h3>Payment Details</h3>

          <div style={{ lineHeight: 2 }}>
            <div>
              <strong>Payment Mode:</strong> {receipt.mode.toUpperCase()}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                fontSize: 22,
                fontWeight: 800,
                marginTop: 14,
                color: 'var(--gold)',
              }}
            >
              <span>Amount Paid</span>
              <span>{rupees(receipt.amount)}</span>
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border)', margin: '16px 0' }} />

          <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--muted)', fontSize: '0.85rem' }}>
            Thank you. This is an authenticated computer-generated receipt.
          </p>
        </div>

        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginTop: 20,
          }}
        >
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            🖨️ Print Receipt
          </button>

          <Link
            to={`/farmers/${farmerId}`}
            className="btn btn-ghost"
          >
            View Farmer Ledger
          </Link>

          <Link to="/farmers" className="btn btn-ghost">
            Back to Farmers
          </Link>
        </div>
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
        <p className="dashboard-eyebrow">MILLER / PAYMENTS</p>
        <h1 style={{ margin: '4px 0 6px' }}>{t.recordPaymentTitle}</h1>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.9rem' }}>
          Record farmer payments, reconcile owed balances, and print official receipts.
        </p>
      </div>

      {/* Name-based Farmer Selection */}
      <div className="field">
        <SearchableSelect
          id="paymentFarmer"
          label={t.selectFarmer}
          placeholder="Search and select farmer by name..."
          options={farmerOptions}
          value={farmerId}
          onChange={id => {
            setFarmerId(id);
            setErrors(prev => ({ ...prev, farmerId: undefined }));
          }}
          disabled={saving}
          required
          error={errors.farmerId}
        />

        {selected && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              color: 'var(--gold)',
              fontSize: '0.88rem',
              fontWeight: 650,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{t.currentlyOwed}:</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 800 }}>{rupees(selected.owed)}</span>
          </div>
        )}
      </div>

      <div className={`field ${errors.amount ? 'invalid' : ''}`}>
        <label htmlFor="amount">{t.paymentAmount} (₹) *</label>

        <input
          id="amount"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          placeholder="e.g. 25000"
          value={amount}
          onKeyDown={blockBadKeys}
          onChange={e => {
            setAmount(e.target.value);
            setErrors(prev => ({ ...prev, amount: undefined }));
          }}
          disabled={saving}
        />

        {errors.amount && (
          <div className="field-error">{errors.amount}</div>
        )}

        {overpay && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(248, 113, 113, 0.1)',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              color: '#fca5a5',
              fontSize: '0.84rem',
            }}
          >
            ⚠️ {t.warnOverpay} (Payment exceeds owed amount of {rupees(selected.owed)})
          </div>
        )}
      </div>

      <div className="field">
        <label htmlFor="mode">{t.paymentMode}</label>

        <select
          id="mode"
          value={mode}
          onChange={e => setMode(e.target.value)}
          disabled={saving}
        >
          <option value="">{t.modeNone}</option>
          <option value="cash">{t.cash}</option>
          <option value="upi">{t.upi}</option>
          <option value="bank">{t.bank}</option>
          <option value="cheque">{t.cheque}</option>
        </select>
      </div>

      {submitError && (
        <div className="form-error" role="alert">
          {submitError}
        </div>
      )}

      <div className="form-actions" style={{ marginTop: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? t.saving : t.save}
        </button>

        <Link to="/farmers" className="btn btn-ghost">
          {t.cancel}
        </Link>
      </div>
    </form>
  );
}
