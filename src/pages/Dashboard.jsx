import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useData } from '../context/DataContext';
import { t } from '../strings';

const rupees = n => '₹' + n.toLocaleString('en-IN');

export default function Dashboard() {
  const { farmers, weekIntake } = useData();
  const totalStock = farmers.reduce((sum, f) => sum + f.stock, 0);
  const totalOwed = farmers.reduce((sum, f) => sum + f.owed, 0);
  const todayIntake = weekIntake[weekIntake.length - 1];

  const chartData = weekIntake.map((value, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (weekIntake.length - 1 - i));
    return { day: d.toLocaleDateString('en-IN', { weekday: 'short' }), intake: value };
  });

  return (
    <div>
      <h1>{t.dashboard}</h1>

      <div className="stats">
        <div className="panel">
          <div className="stat-label">{t.totalStock}</div>
          <div className="stat-value">{totalStock}</div>
        </div>
        <div className="panel">
          <div className="stat-label">{t.totalOwed}</div>
          <div className="stat-value">{rupees(totalOwed)}</div>
        </div>
        <div className="panel">
          <div className="stat-label">{t.todayIntake}</div>
          <div className="stat-value">{todayIntake}</div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <div className="stat-label" style={{ marginBottom: 12 }}>{t.last7Days}</div>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
              <XAxis dataKey="day" stroke="#9bb0a3" tickLine={false} />
              <YAxis stroke="#9bb0a3" tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ background: '#10201a', border: '1px solid rgba(224,176,74,0.3)', borderRadius: 8 }}
              />
              <Bar dataKey="intake" fill="#e0b04a" radius={[6, 6, 0, 0]} animationDuration={400} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}