
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
import { t } from '../strings';

const rupees = value =>
  '₹' + Number(value || 0).toLocaleString('en-IN');

export default function Dashboard() {
  const { token } = useAuth();
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
    return <main className="page"><h1>{t.dashboard}</h1><div className="panel">Loading dashboard...</div></main>;
  }

  if (error) {
    return (
      <main className="page">
        <h1>{t.dashboard}</h1>
        <div className="panel" role="alert">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </main>
    );
  }

  if (!data) {
    return <main className="page"><h1>{t.dashboard}</h1><div className="panel">No dashboard data available.</div></main>;
  }

  // These fields may need adjusting to match the backend's exact response.
  const totalStock = data.total_stock ?? data.totalStock ?? 0;
  const totalOwed = data.total_owed ?? data.totalOwed ?? 0;
  const todayIntake = data.today_intake ?? data.todayIntake ?? 0;

  const rawIntake = data.week_intake ?? data.weekIntake ?? [];
  const chartData = Array.isArray(rawIntake)
    ? rawIntake.map((item, index) => {
        if (typeof item === 'number') {
          const date = new Date();
          date.setDate(date.getDate() - (rawIntake.length - 1 - index));
          return {
            day: date.toLocaleDateString('en-IN', { weekday: 'short' }),
            intake: item,
          };
        }

        return {
          day: item.day ?? item.date ?? `Day ${index + 1}`,
          intake: Number(item.intake ?? item.quantity ?? 0),
        };
      })
    : [];

  return (
    <main className="page">
      <h1>{t.dashboard}</h1>

      <div className="stats">
        <div className="panel">
          <div className="stat-label">{t.totalStock}</div>
          <div className="stat-value">{Number(totalStock).toLocaleString('en-IN')}</div>
        </div>

        <div className="panel">
          <div className="stat-label">{t.totalOwed}</div>
          <div className="stat-value">{rupees(totalOwed)}</div>
        </div>

        <div className="panel">
          <div className="stat-label">{t.todayIntake}</div>
          <div className="stat-value">{Number(todayIntake).toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="stat-label" style={{ marginBottom: 12 }}>
          {t.last7Days}
        </div>

        {chartData.length === 0 ? (
          <p>No weekly intake data returned by the backend.</p>
        ) : (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="day" stroke="#9bb0a3" tickLine={false} />
                <YAxis stroke="#9bb0a3" tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{
                    background: '#10201a',
                    border: '1px solid rgba(224,176,74,0.3)',
                    borderRadius: 8,
                  }}
                />
                <Bar
                  dataKey="intake"
                  fill="#e0b04a"
                  radius={[6, 6, 0, 0]}
                  animationDuration={400}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </main>
  );
}
