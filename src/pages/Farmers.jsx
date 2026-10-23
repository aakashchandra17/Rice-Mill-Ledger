import { Link } from 'react-router-dom';
import { farmers } from '../mockData';
import { t } from '../strings';

export default function Farmers() {
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
                    <button disabled>{t.recordIntake}</button>
                    <button disabled>{t.recordPayment}</button>
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