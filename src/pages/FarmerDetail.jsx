import { useParams, Link } from 'react-router-dom';
import { farmers, transactions } from '../mockData';
import { t } from '../strings';

const rupees = n => '₹' + n.toLocaleString('en-IN');

export default function FarmerDetail() {
  const { id } = useParams();
  const farmer = farmers.find(f => f.id === Number(id));

  if (!farmer) {
    return (
      <div className="panel">
        <h1>{t.notFound}</h1>
        <Link to="/farmers">{t.back}</Link>
      </div>
    );
  }

  const history = transactions
    .filter(tx => tx.farmerId === farmer.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  let balance = 0;
  const rows = history.map(tx => {
    balance += tx.type === 'intake' ? tx.amount : -tx.amount;
    return { ...tx, balance };
  });

  return (
    <div>
      <Link to="/farmers">← {t.back}</Link>
      <h1 style={{ marginTop: 12 }}>{farmer.name}</h1>
      <p style={{ color: 'var(--muted)', marginTop: -8 }}>{farmer.village}</p>

      <div className="stats">
        <div className="panel">
          <div className="stat-label">{t.stock}</div>
          <div className="stat-value">{farmer.stock}</div>
        </div>
        <div className="panel">
          <div className="stat-label">{t.owed}</div>
          <div className="stat-value">{rupees(farmer.owed)}</div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16, overflowX: 'auto' }}>
        {rows.length === 0 ? (
          <p>{t.noHistory}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t.date}</th>
                <th>{t.type}</th>
                <th>{t.quantity}</th>
                <th>{t.amount}</th>
                <th>{t.balance}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td style={{ color: r.type === 'intake' ? 'var(--green)' : 'var(--accent)' }}>
                    {r.type === 'intake' ? t.intake : t.payment}
                  </td>
                  <td>{r.quantity ?? '-'}</td>
                  <td>{rupees(r.amount)}</td>
                  <td>{rupees(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}