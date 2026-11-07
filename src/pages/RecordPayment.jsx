
import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { describeError } from '../api';
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
            border: '1px solid var(--border, #ccc)',
            borderRadius: 12,
            background: 'var(--panel, white)',
            color: 'var(--text, #222)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{ marginBottom: 5 }}>PAYMENT RECEIPT</h1>
            <p style={{ color: 'var(--muted)', margin: 0 }}>
              Rice Mill Ledger
            </p>
            <p style={{ color: 'var(--green)', fontWeight: 700 }}>
              ✓ Payment Recorded Successfully
            </p>
          </div>

          <hr />

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

          <hr />

          <h3>Farmer Details</h3>

          <div style={{ lineHeight: 2 }}>
            <div><strong>Name:</strong> {receipt.farmerName}</div>
            <div><strong>Village:</strong> {receipt.village}</div>
          </div>

          <hr />

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
                fontSize: 20,
                fontWeight: 700,
                marginTop: 12,
              }}
            >
              <span>Amount Paid</span>
              <span>{rupees(receipt.amount)}</span>
            </div>
          </div>

          <hr />

          <p style={{ textAlign: 'center', marginTop: 24 }}>
            Thank you. This is a computer-generated receipt.
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
          <button type="button" onClick={handlePrint}>
            Print Receipt
          </button>

          <Link
            to={`/farmers/${farmerId}`}
            className="button"
          >
            View Farmer Ledger
          </Link>

          <Link to="/farmers">
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
      <h1>{t.recordPaymentTitle}</h1>

      <div className={`field ${errors.farmerId ? 'invalid' : ''}`}>
        <label htmlFor="farmer">{t.selectFarmer}</label>

        <select
          id="farmer"
          value={farmerId}
          onChange={e => setFarmerId(e.target.value)}
          disabled={saving}
        >
          <option value="">{t.chooseFarmer}</option>

          {farmers
            .filter(f => f.name?.trim().toLowerCase() !== 'string')
            .map(f => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.village})
              </option>
            ))}
        </select>

        {errors.farmerId && (
          <div className="field-error">{errors.farmerId}</div>
        )}

        {selected && (
          <div className="field-warn">
            {t.currentlyOwed}: {rupees(selected.owed)}
          </div>
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
          disabled={saving}
        />

        {errors.amount && (
          <div className="field-error">{errors.amount}</div>
        )}

        {overpay && (
          <div className="field-warn">{t.warnOverpay}</div>
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

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? t.saving : t.save}
        </button>

        <Link to="/farmers">{t.cancel}</Link>
      </div>
    </form>
  );
}
