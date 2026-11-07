
import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { getDashboard, describeError } from '../api';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { t } from '../strings';

const rupees = value =>
  '₹' + Number(value || 0).toLocaleString('en-IN');

function AnimatedNumber({ value, currency = false }) {
  const target = Number(value) || 0;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frameId;
    let startTime;
    const duration = 1000;

    function animate(timestamp) {
      if (startTime === undefined) startTime = timestamp;

      const progress = Math.min(
        (timestamp - startTime) / duration,
        1
      );

      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(target * easedProgress);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    }

    setDisplayValue(0);
    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [target]);

  return (
    <>
      {currency ? '₹' : ''}
      {Math.round(displayValue).toLocaleString('en-IN')}
    </>
  );
}

export default function Dashboard() {
  const { token } = useAuth();
  const { farmers, transactions } = useData();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const result = await getDashboard(token);
        if (active) setData(result);
      } catch (err) {
        if (active) setError(describeError(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    if (token) loadDashboard();
    else setLoading(false);

    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <main className="page dashboard-page">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">
              GRAINLEDGER / OVERVIEW
            </p>
            <h1>{t.dashboard}</h1>
            <p className="dashboard-subtitle">
              Your rice mill operations at a glance.
            </p>
          </div>
        </header>

        <section className="panel dashboard-message">
          <div className="loading-indicator" />
          <p>Loading dashboard...</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page dashboard-page">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">
              GRAINLEDGER / OVERVIEW
            </p>
            <h1>{t.dashboard}</h1>
            <p className="dashboard-subtitle">
              Your rice mill operations at a glance.
            </p>
          </div>
        </header>

        <section className="panel dashboard-message" role="alert">
          <div className="message-icon message-icon-error">!</div>
          <h2>Unable to load dashboard</h2>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="page dashboard-page">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-eyebrow">
              GRAINLEDGER / OVERVIEW
            </p>
            <h1>{t.dashboard}</h1>
          </div>
        </header>

        <section className="panel dashboard-message">
          <h2>No dashboard data available</h2>
          <p>
            There is no dashboard information to display right now.
          </p>
        </section>
      </main>
    );
  }

  const totalStock = data.total_stock ?? data.totalStock ?? 0;
  const totalOwed = data.total_owed ?? data.totalOwed ?? 0;
  const todayIntake = data.today_intake ?? data.todayIntake ?? 0;

  const rawIntake = data.week_intake ?? data.weekIntake ?? [];

  const chartData = Array.isArray(rawIntake)
    ? rawIntake.map((item, index) => {
        if (typeof item === 'number') {
          const date = new Date();
          date.setDate(
            date.getDate() - (rawIntake.length - 1 - index)
          );

          return {
            day: date.toLocaleDateString('en-IN', {
              weekday: 'short',
            }),
            intake: item,
          };
        }

        return {
          day: item.day ?? item.date ?? `Day ${index + 1}`,
          intake: Number(item.intake ?? item.quantity ?? 0),
        };
      })
    : [];

  const recentTransactions = [...transactions]
    .slice(-5)
    .reverse();

  const recentIntakes = recentTransactions.filter(
    item => item.type === 'intake'
  );

  const recentPayments = recentTransactions.filter(
    item => item.type === 'payment'
  );

  const getFarmerName = farmerId =>
    farmers.find(f => Number(f.id) === Number(farmerId))?.name
    || 'Farmer';

  return (
    <main className="page dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-eyebrow">
            GRAINLEDGER / OVERVIEW
          </p>
          <h1>{t.dashboard}</h1>
          <p className="dashboard-subtitle">
            Monitor paddy intake, stock, and outstanding farmer balances.
          </p>
        </div>

        <div className="dashboard-date">
          <span className="date-dot" />
          <span>
            {new Date().toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </header>

      {/* Summary cards */}
      <section className="dashboard-stats" aria-label="Mill summary">

        <article className="panel dashboard-stat-card">
          <div className="dashboard-stat-top">
            <span className="dashboard-stat-icon stock-icon">▤</span>
            <span className="dashboard-stat-caption">Inventory</span>
          </div>
          <p className="stat-label">{t.totalStock}</p>
          <p className="dashboard-stat-value">
            <AnimatedNumber value={totalStock} />
          </p>
          <p className="dashboard-stat-note">Total recorded stock</p>
        </article>

        <article className="panel dashboard-stat-card">
          <div className="dashboard-stat-top">
            <span className="dashboard-stat-icon owed-icon">₹</span>
            <span className="dashboard-stat-caption">Accounts</span>
          </div>
          <p className="stat-label">{t.totalOwed}</p>
          <p className="dashboard-stat-value">
            <AnimatedNumber value={totalOwed} currency />
          </p>
          <p className="dashboard-stat-note">
            Outstanding farmer balance
          </p>
        </article>

        <article className="panel dashboard-stat-card">
          <div className="dashboard-stat-top">
            <span className="dashboard-stat-icon intake-icon">↗</span>
            <span className="dashboard-stat-caption">Today</span>
          </div>
          <p className="stat-label">{t.todayIntake}</p>
          <p className="dashboard-stat-value">
            <AnimatedNumber value={todayIntake} />
          </p>
          <p className="dashboard-stat-note">
            Recorded intake today
          </p>
        </article>

        <article className="panel dashboard-stat-card">
          <div className="dashboard-stat-top">
            <span className="dashboard-stat-icon stock-icon">♙</span>
            <span className="dashboard-stat-caption">Farmers</span>
          </div>
          <p className="stat-label">Total Farmers</p>
          <p className="dashboard-stat-value">
            <AnimatedNumber value={farmers.length} />
          </p>
          <p className="dashboard-stat-note">
            Registered farmers
          </p>
        </article>
      </section>

      {/* Weekly intake chart */}
      <section className="panel dashboard-chart-panel">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-eyebrow">MILL ACTIVITY</p>
            <h2>{t.last7Days}</h2>
            <p className="dashboard-section-description">
              Paddy intake recorded over the last seven days.
            </p>
          </div>

          <span className="chart-legend">
            <span className="chart-legend-dot" />
            Intake
          </span>
        </div>

        {chartData.length === 0 ? (
          <div className="dashboard-empty">
            <span className="empty-chart-icon">▥</span>
            <p>No weekly intake data available.</p>
            <span>
              The chart will appear when the backend returns intake data.
            </span>
          </div>
        ) : (
          <div className="dashboard-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 12,
                  right: 8,
                  left: 0,
                  bottom: 4,
                }}
              >
                <CartesianGrid
                  stroke="#e8eee9"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#718078', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fill: '#718078', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  cursor={{ fill: '#edf4ef' }}
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #dce8df',
                    borderRadius: 12,
                    color: '#183c2b',
                    boxShadow:
                      '0 8px 24px rgba(25, 55, 38, 0.08)',
                  }}
                  formatter={value => [
                    Number(value).toLocaleString('en-IN'),
                    'Intake',
                  ]}
                />
                <Bar
                  dataKey="intake"
                  name="Intake"
                  fill="#23734d"
                  maxBarSize={48}
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section className="dashboard-activity-grid">

        <article className="panel dashboard-chart-panel">
          <div className="dashboard-section-heading">
            <div>
              <p className="dashboard-eyebrow">RECENT ACTIVITY</p>
              <h2>Recent Intake</h2>
            </div>
          </div>

          {recentIntakes.length === 0 ? (
            <div className="dashboard-empty">
              <p>No intake activity in this session.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Quantity</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentIntakes.map(item => (
                    <tr key={item.id}>
                      <td>{getFarmerName(item.farmerId)}</td>
                      <td>{item.quantity}</td>
                      <td>{rupees(item.rate)}</td>
                      <td>{rupees(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel dashboard-chart-panel">
          <div className="dashboard-section-heading">
            <div>
              <p className="dashboard-eyebrow">RECENT ACTIVITY</p>
              <h2>Recent Payments</h2>
            </div>
          </div>

          {recentPayments.length === 0 ? (
            <div className="dashboard-empty">
              <p>No payment activity in this session.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Date</th>
                    <th>Mode</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map(item => (
                    <tr key={item.id}>
                      <td>{getFarmerName(item.farmerId)}</td>
                      <td>{item.date}</td>
                      <td>{item.mode || '—'}</td>
                      <td>{rupees(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

      </section>

      <footer className="dashboard-footer">
        <span className="footer-status-dot" />
        Dashboard information is provided by your connected backend.
      </footer>
    </main>
  );
}
