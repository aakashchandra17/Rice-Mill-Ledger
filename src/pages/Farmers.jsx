import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { t } from '../strings';

export default function Farmers() {
  const { farmers } = useData();

  return (
    <div className="panel">
      <h1>{t.farmers}</h1>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>{t.name}</th>
              <th>{t.village}</th>
              <th>{t.stock}</th>
              <th>{t.owed}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {farmers.map(f => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td>{f.village}</td>
                <td>{f.stock}</td>
                <td>₹{f.owed.toLocaleString('en-IN')}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Link to={`/farmers/${f.id}`}>{t.view}</Link>
                    <Link className="btn" to={`/intake?farmer=${f.id}`}>{t.recordIntake}</Link>
                    <Link className="btn btn-ghost" to={`/payment?farmer=${f.id}`}>{t.recordPayment}</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}