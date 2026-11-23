import { useCallback, useEffect, useState } from 'react';
import {
  getAdminDashboardSummary,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  getAdminLoginLogs,
  getAdminIssues,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'approvals', label: 'Registration Approvals', icon: '✓' },
  { id: 'users', label: 'User Management', icon: '♙' },
  { id: 'logs', label: 'Login Logs', icon: '▤' },
  { id: 'issues', label: 'Issue Reports', icon: '⚠' },
  { id: 'profile', label: 'Admin Profile', icon: '👤' },
];

const number = value => Number(value || 0).toLocaleString('en-IN');

function StatCard({ label, value, note, icon, tone }) {
  return (
    <article className="panel dashboard-stat-card admin-stat-card">
      <div className="dashboard-stat-top">
        <span className={`dashboard-stat-icon ${tone}`}>{icon}</span>
        <span className="dashboard-stat-caption">OVERVIEW</span>
      </div>
      <p className="stat-label">{label}</p>
      <p className="dashboard-stat-value">{value}</p>
      <p className="dashboard-stat-note">{note}</p>
    </article>
  );
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRegistrationId(item) {
  return item?.user_id ?? item?.id;
}

function getRegistrationName(item) {
  return item?.name ?? item?.full_name ?? item?.username ?? 'Unnamed applicant';
}

function getRegistrationPhone(item) {
  return item?.phone ?? item?.phone_number ?? '—';
}

function getRegistrationBusiness(item) {
  return item?.business_name ?? item?.mill_name ?? item?.businessName ?? '—';
}

function getRegistrationRole(item) {
  const role = String(
    item?.role ?? item?.account_type ?? item?.type ?? ''
  ).toLowerCase();

  if (role.includes('commission') || role.includes('party')) return 'Commissiondar';
  if (role.includes('owner') || role.includes('miller')) return 'Miller';

  return item?.role ?? item?.account_type ?? 'User';
}

function getRegistrationDate(item) {
  return formatDate(
    item?.created_at ??
    item?.registration_date ??
    item?.registered_at ??
    item?.createdAt
  );
}

export default function AdminDashboard() {
  const { token, user, logout } = useAuth();

  const [section, setSection] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [approvalTab, setApprovalTab] = useState('pending');

  const [summary, setSummary] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [issues, setIssues] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [confirmation, setConfirmation] = useState(null); // { id, action, name }
  const [selectedApplicant, setSelectedApplicant] = useState(null); // Full applicant object for Details Modal

  // Load all admin resources
  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const summaryResult = await getAdminDashboardSummary(token);
      setSummary(summaryResult);
    } catch (err) {
      console.error('Admin summary error:', err);
    }

    try {
      const pendingResult = await getPendingRegistrations(token);
      const list = Array.isArray(pendingResult)
        ? pendingResult
        : pendingResult?.registrations ?? pendingResult?.items ?? [];
      setRegistrations(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Pending registrations error:', err);
      setRegistrations([]);
    }

    try {
      const logsResult = await getAdminLoginLogs(token);
      const list = Array.isArray(logsResult)
        ? logsResult
        : logsResult?.logs ?? logsResult?.items ?? [];
      setLoginLogs(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Login logs error:', err);
      setLoginLogs([]);
    }

    try {
      const issuesResult = await getAdminIssues(token);
      const list = Array.isArray(issuesResult)
        ? issuesResult
        : issuesResult?.issues ?? issuesResult?.items ?? [];
      setIssues(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Issues error:', err);
      setIssues([]);
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleDecision = async () => {
    if (!confirmation) return;

    const { id, action } = confirmation;

    if (id === undefined || id === null) {
      setError('Registration ID is missing.');
      setConfirmation(null);
      return;
    }

    setActionLoading(true);
    setError('');
    setActionMessage('');

    try {
      if (action === 'approve') {
        await approveRegistration(id, token);
        setActionMessage('Registration approved successfully.');
      } else {
        await rejectRegistration(id, token);
        setActionMessage('Registration rejected successfully.');
      }

      setConfirmation(null);
      setSelectedApplicant(null);
      await loadDashboard();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const users = summary?.users ?? {};
  const registrationStats = summary?.registrations ?? {};
  const millers = users.total_millers ?? 0;
  const commissiondars = users.total_commissiondars ?? 0;
  const totalKnownAccounts = Number(millers) + Number(commissiondars);

  const filteredRegistrations = registrations.filter(item => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      String(getRegistrationName(item)).toLowerCase().includes(query) ||
      String(getRegistrationPhone(item)).toLowerCase().includes(query) ||
      String(getRegistrationBusiness(item)).toLowerCase().includes(query) ||
      String(getRegistrationId(item) ?? '').toLowerCase().includes(query)
    );
  });

  const filteredLogs = loginLogs.filter(log => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      String(log.phone || log.user || log.user_id || '').toLowerCase().includes(query) ||
      String(log.ip_address || log.ip || '').toLowerCase().includes(query) ||
      String(log.status || '').toLowerCase().includes(query)
    );
  });

  const filteredIssues = issues.filter(issue => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      String(issue.description || issue.message || '').toLowerCase().includes(query) ||
      String(issue.user_id || issue.phone || '').toLowerCase().includes(query) ||
      String(issue.status || '').toLowerCase().includes(query)
    );
  });

  const openSection = id => {
    setSection(id);
    setSearch('');
    setActionMessage('');
    setError('');
  };

  return (
    <div className={`admin-layout ${collapsed ? 'admin-collapsed' : ''}`}>
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="admin-brand-icon">G</span>
          {!collapsed && (
            <div>
              <strong>GRAIN LEDGER</strong>
              <small>ADMINISTRATION</small>
            </div>
          )}
        </div>

        <button
          className="admin-collapse-button"
          type="button"
          onClick={() => setCollapsed(v => !v)}
          title="Toggle sidebar"
        >
          {collapsed ? '☰' : '‹'}
        </button>

        {!collapsed && <p className="admin-menu-heading">WORKSPACE</p>}

        <nav className="admin-menu">
          {menuItems.map(item => (
            <button
              key={item.id}
              type="button"
              title={collapsed ? item.label : ''}
              className={`admin-menu-item ${section === item.id ? 'active' : ''}`}
              onClick={() => openSection(item.id)}
            >
              <span className="admin-menu-icon">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.id === 'approvals' && registrationStats.pending > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '2px 7px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  {registrationStats.pending}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-bottom">
          {!collapsed && (
            <div className="admin-sidebar-profile">
              <span className="admin-avatar">A</span>
              <div>
                <strong>{user?.name || 'Administrator'}</strong>
                <small>System Admin</small>
              </div>
            </div>
          )}

          <button
            type="button"
            className="admin-logout"
            onClick={logout}
          >
            <span>↪</span>
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="dashboard-eyebrow">GRAIN LEDGER / ADMIN</p>
            <h2>{menuItems.find(item => item.id === section)?.label || 'Dashboard'}</h2>
          </div>

          <div className="admin-topbar-actions">
            <span className="admin-online">
              <span className="date-dot" />
              Connected
            </span>

            <button
              type="button"
              className="admin-refresh"
              onClick={loadDashboard}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="admin-alert admin-alert-error" role="alert">
            {error}
            <button type="button" onClick={() => setError('')}>
              ×
            </button>
          </div>
        )}

        {actionMessage && (
          <div className="admin-alert admin-alert-success" role="status">
            {actionMessage}
            <button type="button" onClick={() => setActionMessage('')}>
              ×
            </button>
          </div>
        )}

        {loading ? (
          <section className="panel dashboard-message admin-loading">
            <div className="loading-indicator" />
            <p>Loading administrator workspace...</p>
          </section>
        ) : (
          <>
            {/* 1. DASHBOARD OVERVIEW */}
            {section === 'dashboard' && (
              <section className="dashboard-page admin-content">
                <header className="dashboard-header">
                  <div>
                    <p className="dashboard-eyebrow">SYSTEM OVERVIEW</p>
                    <h1>Welcome, {user?.name || 'Administrator'}</h1>
                    <p className="dashboard-subtitle">
                      Monitor live registrations, login security audits, and Grain Ledger activity.
                    </p>
                  </div>

                  <div className="dashboard-date">
                    <span className="date-dot" />
                    {new Date().toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </header>

                <section className="admin-stats-grid">
                  <StatCard
                    label="Total Registered Users"
                    value={number(totalKnownAccounts)}
                    note="Miller + Commissiondar accounts"
                    icon="♙"
                    tone="stock-icon"
                  />

                  <StatCard
                    label="Total Millers"
                    value={number(millers)}
                    note="Registered Miller accounts"
                    icon="▤"
                    tone="owed-icon"
                  />

                  <StatCard
                    label="Total Commissiondars"
                    value={number(commissiondars)}
                    note="Independent Commissiondar accounts"
                    icon="◈"
                    tone="intake-icon"
                  />

                  <StatCard
                    label="Pending Registrations"
                    value={number(registrationStats.pending)}
                    note="Awaiting administrator review"
                    icon="◷"
                    tone="owed-icon"
                  />

                  <StatCard
                    label="Approved Accounts"
                    value={number(registrationStats.approved)}
                    note="Active operating accounts"
                    icon="✓"
                    tone="stock-icon"
                  />

                  <StatCard
                    label="Rejected Accounts"
                    value={number(registrationStats.rejected)}
                    note="Denied registrations"
                    icon="×"
                    tone="intake-icon"
                  />
                </section>

                <section className="panel dashboard-chart-panel admin-quick-panel">
                  <div className="dashboard-section-heading">
                    <div>
                      <p className="dashboard-eyebrow">ACTION REQUIRED</p>
                      <h2>Pending Account Approvals</h2>
                      <p className="dashboard-section-description">
                        Review newly registered millers and commissiondars before granting access.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => openSection('approvals')}
                    >
                      Review Requests ({number(registrationStats.pending)}) →
                    </button>
                  </div>

                  <div className="admin-quick-stats">
                    <div>
                      <span>Pending requests</span>
                      <strong>{number(registrationStats.pending)}</strong>
                    </div>
                    <div>
                      <span>Recorded Login Logs</span>
                      <strong>{number(loginLogs.length)}</strong>
                    </div>
                    <div>
                      <span>Reported Issues</span>
                      <strong>{number(issues.length)}</strong>
                    </div>
                  </div>
                </section>

                <footer className="dashboard-footer">
                  <span className="footer-status-dot" />
                  Grain Ledger Admin connected to production Render backend.
                </footer>
              </section>
            )}

            {/* 2. REGISTRATION APPROVALS */}
            {section === 'approvals' && (
              <section className="admin-content">
                <div className="admin-page-heading">
                  <div>
                    <p className="dashboard-eyebrow">SECURITY & ONBOARDING</p>
                    <h1>Registration Approvals</h1>
                    <p className="dashboard-subtitle">
                      Verify applicant credentials and grant or reject system access.
                    </p>
                  </div>
                </div>

                <div className="admin-tabs">
                  {[
                    { id: 'pending', label: 'Pending Requests' },
                    { id: 'approved', label: 'Approved Users' },
                    { id: 'rejected', label: 'Rejected Users' },
                  ].map(tab => (
                    <button
                      type="button"
                      key={tab.id}
                      className={approvalTab === tab.id ? 'selected' : ''}
                      onClick={() => setApprovalTab(tab.id)}
                    >
                      {tab.label}
                      {tab.id === 'pending' && (
                        <span>{number(registrationStats.pending)}</span>
                      )}
                    </button>
                  ))}
                </div>

                {approvalTab === 'pending' ? (
                  <section className="panel admin-table-panel">
                    <div className="admin-table-heading">
                      <div>
                        <h2>Pending Applications ({filteredRegistrations.length})</h2>
                        <p>Applicants who completed dual-password setup awaiting verification.</p>
                      </div>

                      <input
                        type="search"
                        placeholder="Search name, phone, business..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                      />
                    </div>

                    {filteredRegistrations.length === 0 ? (
                      <div className="dashboard-empty">
                        <span className="empty-chart-icon">✓</span>
                        <p>
                          {registrations.length === 0
                            ? 'No pending registrations'
                            : 'No matching registrations'}
                        </p>
                        <span>
                          {registrations.length === 0
                            ? 'All new registrations have been processed.'
                            : 'Try adjusting your search filter.'}
                        </span>
                      </div>
                    ) : (
                      <div className="admin-table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Applicant Name</th>
                              <th>Phone</th>
                              <th>Account Type</th>
                              <th>Business / Mill</th>
                              <th>Submitted On</th>
                              <th>Actions</th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredRegistrations.map((item, index) => {
                              const id = getRegistrationId(item);

                              return (
                                <tr key={id ?? index}>
                                  <td style={{ fontWeight: 600 }}>
                                    {getRegistrationName(item)}
                                  </td>
                                  <td>{getRegistrationPhone(item)}</td>
                                  <td>
                                    <span className="admin-role-badge">
                                      {getRegistrationRole(item)}
                                    </span>
                                  </td>
                                  <td>{getRegistrationBusiness(item)}</td>
                                  <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                                    {getRegistrationDate(item)}
                                  </td>
                                  <td>
                                    <div className="admin-row-actions">
                                      <button
                                        type="button"
                                        className="btn btn-ghost"
                                        style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                                        onClick={() => setSelectedApplicant(item)}
                                      >
                                        View Details
                                      </button>

                                      <button
                                        type="button"
                                        className="admin-approve"
                                        disabled={actionLoading || id == null}
                                        onClick={() =>
                                          setConfirmation({
                                            id,
                                            action: 'approve',
                                            name: getRegistrationName(item),
                                          })
                                        }
                                      >
                                        Approve
                                      </button>

                                      <button
                                        type="button"
                                        className="admin-reject"
                                        disabled={actionLoading || id == null}
                                        onClick={() =>
                                          setConfirmation({
                                            id,
                                            action: 'reject',
                                            name: getRegistrationName(item),
                                          })
                                        }
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                ) : (
                  <section className="panel dashboard-empty admin-unavailable">
                    <span className="empty-chart-icon">◷</span>
                    <h2>
                      {approvalTab === 'approved' ? 'Approved Accounts' : 'Rejected Accounts'}
                    </h2>
                    <p>
                      Total {approvalTab === 'approved' ? 'Approved' : 'Rejected'}:{' '}
                      <strong>{number(registrationStats[approvalTab])} accounts</strong>
                    </p>
                    <span style={{ maxWidth: 500 }}>
                      The backend summary API confirms this count. Detailed historic list endpoints for approved and rejected users are not provided by the current backend schema.
                    </span>
                  </section>
                )}
              </section>
            )}

            {/* 3. USER MANAGEMENT */}
            {section === 'users' && (
              <section className="admin-content">
                <div className="admin-page-heading">
                  <div>
                    <p className="dashboard-eyebrow">DIRECTORY</p>
                    <h1>User Management</h1>
                    <p className="dashboard-subtitle">
                      Overview of registered Miller and Commissiondar accounts across the platform.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 16,
                    marginBottom: 20,
                  }}
                >
                  <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>TOTAL MILLERS</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--gold)', margin: '4px 0' }}>
                      {number(millers)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                      Operating registered rice mills
                    </div>
                  </div>

                  <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>TOTAL COMMISSIONDARS</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--green-light)', margin: '4px 0' }}>
                      {number(commissiondars)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                      Independent commission agents
                    </div>
                  </div>

                  <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>ACTIVE SESSIONS</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', margin: '4px 0' }}>
                      {number(totalKnownAccounts)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                      Verified authenticated accounts
                    </div>
                  </div>
                </div>

                <section className="panel admin-table-panel">
                  <div className="admin-table-heading">
                    <div>
                      <h2>Account Directory Overview</h2>
                      <p>
                        Role distribution and platform membership.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openSection('approvals')}
                    >
                      View Pending Approvals ({number(registrationStats.pending)})
                    </button>
                  </div>

                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>
                      Platform accounts are authenticated via MSG91 OTP and dual password credentials.
                      Individual member deletion or detail queries will link automatically when the backend provides user-level query APIs.
                    </p>
                  </div>
                </section>
              </section>
            )}

            {/* 4. LOGIN LOGS */}
            {section === 'logs' && (
              <section className="admin-content">
                <div className="admin-page-heading">
                  <div>
                    <p className="dashboard-eyebrow">SECURITY AUDIT</p>
                    <h1>Authentication & Login Logs</h1>
                    <p className="dashboard-subtitle">
                      Audit trail of login attempts, phone verifications, and access timestamps.
                    </p>
                  </div>
                </div>

                <section className="panel admin-table-panel">
                  <div className="admin-table-heading">
                    <div>
                      <h2>Recorded Authentication Events ({filteredLogs.length})</h2>
                      <p>Real-time security logs returned by the backend.</p>
                    </div>

                    <input
                      type="search"
                      placeholder="Search phone, IP, status..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>

                  {filteredLogs.length === 0 ? (
                    <div className="dashboard-empty">
                      <span className="empty-chart-icon">📋</span>
                      <p>{loginLogs.length === 0 ? 'No login logs recorded yet' : 'No matching logs'}</p>
                      <span>
                        {loginLogs.length === 0
                          ? 'Authentication attempts will be logged here.'
                          : 'Try another search term.'}
                      </span>
                    </div>
                  ) : (
                    <div className="admin-table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>User / Phone</th>
                            <th>IP Address</th>
                            <th>Timestamp</th>
                            <th>Status</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLogs.map((log, idx) => {
                            const isSuccess =
                              log.status === 'success' ||
                              log.success === true ||
                              String(log.status).toLowerCase().includes('success');

                            return (
                              <tr key={log.id || idx}>
                                <td style={{ fontWeight: 600 }}>
                                  {log.phone || log.user || log.username || `User #${log.user_id || '—'}`}
                                </td>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                  {log.ip_address || log.ip || '—'}
                                </td>
                                <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                                  {formatDate(log.created_at || log.timestamp || log.time)}
                                </td>
                                <td>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      padding: '3px 8px',
                                      borderRadius: 6,
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      background: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                      color: isSuccess ? 'var(--green-light)' : '#ef4444',
                                    }}
                                  >
                                    {log.status || (isSuccess ? 'SUCCESS' : 'FAILED')}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                                  {log.details || log.message || log.user_agent || 'Standard login'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </section>
            )}

            {/* 5. ISSUE MANAGEMENT */}
            {section === 'issues' && (
              <section className="admin-content">
                <div className="admin-page-heading">
                  <div>
                    <p className="dashboard-eyebrow">SUPPORT & AUDIT</p>
                    <h1>Issue Reports</h1>
                    <p className="dashboard-subtitle">
                      Technical feedback and problem tickets submitted by platform users.
                    </p>
                  </div>
                </div>

                <section className="panel admin-table-panel">
                  <div className="admin-table-heading">
                    <div>
                      <h2>Reported Issues ({filteredIssues.length})</h2>
                      <p>User feedback fetched from /api/admin/issues.</p>
                    </div>

                    <input
                      type="search"
                      placeholder="Search issue text, phone..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>

                  {filteredIssues.length === 0 ? (
                    <div className="dashboard-empty">
                      <span className="empty-chart-icon">✓</span>
                      <p>{issues.length === 0 ? 'No reported issues' : 'No matching issues'}</p>
                      <span>
                        {issues.length === 0
                          ? 'Zero reported problems currently in the queue.'
                          : 'Try another search keyword.'}
                      </span>
                    </div>
                  ) : (
                    <div className="admin-table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Reported By</th>
                            <th>Description</th>
                            <th>Date Reported</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredIssues.map((issue, idx) => (
                            <tr key={issue.id || idx}>
                              <td style={{ fontWeight: 600 }}>
                                {issue.phone || issue.user_name || `User #${issue.user_id || '—'}`}
                              </td>
                              <td style={{ maxWidth: 400 }}>
                                {issue.description || issue.message || '—'}
                              </td>
                              <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                                {formatDate(issue.created_at || issue.timestamp)}
                              </td>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    color: '#f59e0b',
                                  }}
                                >
                                  {issue.status || 'OPEN'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </section>
            )}

            {/* 6. ADMIN PROFILE & LOGOUT */}
            {section === 'profile' && (
              <section className="admin-content" style={{ maxWidth: 720, margin: '0 auto' }}>
                <div className="admin-page-heading" style={{ marginBottom: 24 }}>
                  <div>
                    <p className="dashboard-eyebrow">ADMINISTRATION / SECURITY</p>
                    <h1>Administrator Profile & Access</h1>
                    <p className="dashboard-subtitle">
                      Super Administrator system configuration and active security session.
                    </p>
                  </div>
                </div>

                <div
                  className="panel"
                  style={{
                    padding: 28,
                    borderRadius: 20,
                    border: '1px solid var(--border)',
                    marginBottom: 24,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 20,
                        background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
                        color: '#05140b',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 28,
                        fontWeight: 900,
                        boxShadow: '0 0 24px rgba(56, 189, 248, 0.4)',
                      }}
                    >
                      A
                    </div>

                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{user?.name || 'Super Administrator'}</h2>
                      <p style={{ color: '#38bdf8', margin: '4px 0 0', fontWeight: 650, fontSize: '0.9rem' }}>
                        ✓ Level 1 Root Security Clearance • Super Admin
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 16,
                    }}
                  >
                    <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>
                        Admin Identity
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>
                        {user?.name || 'Administrator'}
                      </strong>
                    </div>

                    <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>
                        Registered Phone
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>
                        {user?.phone || 'Secure Terminal'}
                      </strong>
                    </div>

                    <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>
                        Platform Role
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: '#38bdf8' }}>
                        Full System Administrator
                      </strong>
                    </div>

                    <div style={{ padding: 14, borderRadius: 12, background: 'var(--surface-soft)' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase' }}>
                        Backend Engine
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--green-light)' }}>
                        Render FastAPI Gateway
                      </strong>
                    </div>
                  </div>
                </div>

                <div
                  className="panel"
                  style={{
                    padding: 24,
                    borderRadius: 18,
                    border: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 16,
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0 }}>System Sign Out</h3>
                    <p style={{ color: 'var(--muted)', margin: '4px 0 0', fontSize: '0.85rem' }}>
                      End administrator session and invalidate tokens on this workstation.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="top-logout-button"
                    onClick={logout}
                    style={{ padding: '10px 22px' }}
                  >
                    Logout of Administrator
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* REGISTRATION DETAILS MODAL */}
      {selectedApplicant && (
        <div
          className="delete-modal-overlay"
          role="presentation"
          onMouseDown={e => {
            if (e.target === e.currentTarget && !actionLoading) {
              setSelectedApplicant(null);
            }
          }}
        >
          <section
            className="delete-modal"
            style={{ maxWidth: 520, width: '100%', textAlign: 'left', padding: 26 }}
            role="dialog"
            aria-modal="true"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Registration Application Details</h2>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedApplicant(null)}
                style={{ fontSize: '1.2rem', padding: '2px 8px' }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gap: 12,
                background: 'var(--surface-soft)',
                padding: 18,
                borderRadius: 14,
                marginBottom: 20,
              }}
            >
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block' }}>APPLICANT NAME</span>
                <strong style={{ fontSize: '1.1rem' }}>{getRegistrationName(selectedApplicant)}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block' }}>PHONE NUMBER</span>
                <strong>{getRegistrationPhone(selectedApplicant)}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block' }}>ACCOUNT TYPE</span>
                <span className="admin-role-badge" style={{ display: 'inline-block', marginTop: 4 }}>
                  {getRegistrationRole(selectedApplicant)}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block' }}>BUSINESS / RICE MILL NAME</span>
                <strong>{getRegistrationBusiness(selectedApplicant)}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block' }}>APPLICATION DATE</span>
                <span style={{ color: 'var(--muted)' }}>{getRegistrationDate(selectedApplicant)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="admin-cancel"
                disabled={actionLoading}
                onClick={() => setSelectedApplicant(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="admin-reject"
                disabled={actionLoading}
                onClick={() => {
                  const id = getRegistrationId(selectedApplicant);
                  setConfirmation({
                    id,
                    action: 'reject',
                    name: getRegistrationName(selectedApplicant),
                  });
                }}
              >
                Reject Request
              </button>

              <button
                type="button"
                className="admin-approve"
                disabled={actionLoading}
                onClick={() => {
                  const id = getRegistrationId(selectedApplicant);
                  setConfirmation({
                    id,
                    action: 'approve',
                    name: getRegistrationName(selectedApplicant),
                  });
                }}
              >
                Approve Request
              </button>
            </div>
          </section>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmation && (
        <div
          className="delete-modal-overlay"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget && !actionLoading) {
              setConfirmation(null);
            }
          }}
        >
          <section
            className="delete-modal admin-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-confirm-title"
          >
            <h2 id="admin-confirm-title">
              {confirmation.action === 'approve'
                ? 'Approve Registration?'
                : 'Reject Registration?'}
            </h2>

            <p>
              Are you sure you want to {confirmation.action} the registration for{' '}
              <strong>{confirmation.name}</strong>?
            </p>

            <p className="delete-warning">
              This action will be sent to the backend.
            </p>

            <div className="delete-modal-actions">
              <button
                type="button"
                className="admin-cancel"
                disabled={actionLoading}
                onClick={() => setConfirmation(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  confirmation.action === 'approve'
                    ? 'admin-approve'
                    : 'delete-warning-button'
                }
                disabled={actionLoading}
                onClick={handleDecision}
              >
                {actionLoading
                  ? 'Processing...'
                  : confirmation.action === 'approve'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
