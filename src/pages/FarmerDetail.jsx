
import { useParams, Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useData } from '../context/DataContext';
import { t } from '../strings';

const rupees = (value) =>
  '₹' + Number(value || 0).toLocaleString('en-IN');

export default function FarmerDetail({ farmerId }) {
  const { farmers, transactions } = useData();
  const params = useParams();
  const location = useLocation();
  const reduce = useReducedMotion();

  const flashLast = Boolean(location.state?.flash) && !reduce;
  const id = farmerId ?? params.id;
  const farmer = farmers.find((f) => f.id === Number(id));
  const ownPage = farmerId !== undefined;

  if (!farmer) {
    return (
      <div className="panel">
        <h1>{t.notFound}</h1>
        {!ownPage && <Link to="/farmers">{t.back}</Link>}
      </div>
    );
  }

  const history = transactions
    .filter((tx) => Number(tx.farmerId) === Number(farmer.id))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalIntake = history
    .filter((tx) => tx.type === 'intake')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const totalPayments = history
    .filter((tx) => tx.type === 'payment')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  let balance = 0;

  const rows = history.map((tx) => {
    balance += tx.type === 'intake'
      ? Number(tx.amount || 0)
      : -Number(tx.amount || 0);

    return { ...tx, balance };
  });

  const StatCard = ({ label, value, description }) => (
    <div className="panel">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {description && (
        <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 0 }}>
          {description}
        </p>
      )}
    </div>
  );

  return (
    <div>
      {!ownPage && (
        <Link to="/farmers" style={{ textDecoration: 'none' }}>
          ← {t.back}
        </Link>
      )}

      <div
        className="panel"
        style={{
          marginTop: ownPage ? 0 : 16,
          marginBottom: 16,
          padding: 22,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>{farmer.name}</h1>
            <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
              <span>📍</span> {farmer.village || 'Village not available'}
            </p>
          </div>

          <span
            style={{
              background: 'rgba(63, 174, 122, 0.12)',
              color: 'var(--green)',
              padding: '7px 13px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Farmer Account
          </span>
        </div>
      </div>

      <div className="stats">
        <StatCard
          label={t.stock}
          value={Number(farmer.stock || 0).toLocaleString('en-IN')}
          description="Current stock"
        />

        <StatCard
          label={t.owed}
          value={rupees(farmer.owed)}
          description="Current outstanding"
        />

        <StatCard
          label="Total Intake"
          value={rupees(totalIntake)}
          description="Recorded this session"
        />

        <StatCard
          label="Total Payments"
          value={rupees(totalPayments)}
          description="Recorded this session"
        />
      </div>

      <div
        className="panel"
        style={{ marginTop: 16, overflowX: 'auto' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Transaction History</h2>
            <p style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 0 }}>
              {history.length} transactions recorded in this session
            </p>
          </div>

          <span
            style={{
              color: 'var(--muted)',
              fontSize: 12,
            }}
          >
            Session balance: {rupees(balance)}
          </span>
        </div>

        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📋</div>
            <p style={{ margin: 0 }}>{t.noHistory}</p>
            <p style={{ color: 'var(--muted)', fontSize: 12 }}>
              Transactions will appear here after they are successfully recorded.
            </p>
          </div>
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
              {rows.map((r, i) => {
                const isNew = flashLast && i === rows.length - 1;

                return (
                  <motion.tr
                    key={r.id}
                    layout={!reduce}
                    {...(isNew && {
                      initial: {
                        backgroundColor: 'rgba(63, 174, 122, 0.4)',
                      },
                      animate: {
                        backgroundColor: 'rgba(63, 174, 122, 0)',
                      },
                      transition: {
                        duration: 0.4,
                        delay: 0.5,
                      },
                    })}
                  >
                    <td>{r.date}</td>

                    <td
                      style={{
                        color:
                          r.type === 'intake'
                            ? 'var(--green)'
                            : 'var(--accent)',
                        fontWeight: 600,
                      }}
                    >
                      {r.type === 'intake' ? t.intake : t.payment}
                    </td>

                    <td>{r.quantity ?? '-'}</td>
                    <td>{rupees(r.amount)}</td>
                    <td>{rupees(r.balance)}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
