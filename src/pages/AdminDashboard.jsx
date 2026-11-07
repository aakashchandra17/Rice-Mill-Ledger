
import { useCallback, useEffect, useState } from 'react';
import {
  getAdminDashboardSummary,
  getPendingRegistrations,
  approveRegistration,
  rejectRegistration,
  describeError,
} from '../api';
import { useAuth } from '../context/AuthContext';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'users', label: 'User Management', icon: '♙' },
  { id: 'approvals', label: 'Account Approvals', icon: '✓' },
  { id: 'millers', label: 'Miller Accounts', icon: '▤' },
  { id: 'commissiondars', label: 'Commissiondar Accounts', icon: '◈' },
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
  });
}

function getRegistrationId(item) {
  return item?.user_id ?? item?.id;
}

function getRegistrationName(item) {
  return item?.name ?? item?.full_name ?? item?.username ?? 'Unnamed user';
}

function getRegistrationPhone(item) {
  return item?.phone ?? item?.phone_number ?? '—';
}

function getRegistrationRole(item) {
  const role = String(
    item?.role ?? item?.account_type ?? item?.type ?? ''
  ).toLowerCase();

  if (role.includes('commission')) return 'Commissiondar';
  if (role.includes('owner') || role.includes('miller')) return 'Miller';

  return item?.role ?? item?.account_type ?? '—';
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

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [search, setSearch] = useState('');
  const [confirmation, setConfirmation] = useState(null);

  // Load summary and pending registrations independently.
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const summaryResult = await getAdminDashboardSummary(token);
      setSummary(summaryResult);
    } catch (err) {
      setError(`Dashboard summary: ${describeError(err)}`);
      console.error('Admin summary error:', err);
    }

    try {
      const pendingResult = await getPendingRegistrations(token);

      const list = Array.isArray(pendingResult)
        ? pendingResult
        : pendingResult?.registrations ??
          pendingResult?.items ??
          [];

      setRegistrations(Array.isArray(list) ? list : []);
    } catch (err) {
      setRegistrations([]);
      console.error('Pending registrations error:', err);
    }

    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token, loadDashboard]);

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

  const totalKnownAccounts =
    Number(millers) + Number(commissiondars);

  const filteredRegistrations = registrations.filter(item => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      String(getRegistrationName(item)).toLowerCase().includes(query) ||
      String(getRegistrationPhone(item)).toLowerCase().includes(query) ||
      String(getRegistrationId(item) ?? '').toLowerCase().includes(query)
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
          onClick={() => setCollapsed(value => !value)}
          title="Toggle sidebar"
        >
          {collapsed ? '☰' : '‹'}
        </button>

        {!collapsed && (
          <p className="admin-menu-heading">WORKSPACE</p>
        )}

        <nav className="admin-menu">
          {menuItems.map(item => (
            <button
              key={item.id}
              type="button"
              title={collapsed ? item.label : ''}
              className={`admin-menu-item ${
                section === item.id ? 'active' : ''
              }`}
              onClick={() => openSection(item.id)}
            >
              <span className="admin-menu-icon">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
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

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="dashboard-eyebrow">GRAIN LEDGER / ADMIN</p>
            <h2>
              {menuItems.find(item => item.id === section)?.label ||
                'Dashboard'}
            </h2>
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
            <button
              type="button"
              onClick={() => setActionMessage('')}
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <section className="panel dashboard-message admin-loading">
            <div className="loading-indicator" />
            <p>Loading administrator data...</p>
          </section>
        ) : (
          <>
            {section === 'dashboard' && (
              <section className="dashboard-page admin-content">
                <header className="dashboard-header">
                  <div>
                    <p className="dashboard-eyebrow">SYSTEM OVERVIEW</p>
                    <h1>
                      Welcome, {user?.name || 'Administrator'}
                    </h1>
                    <p className="dashboard-subtitle">
                      Monitor registrations and manage Grain Ledger accounts.
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
                    note="Awaiting approval"
                    icon="◷"
                    tone="owed-icon"
                  />

                  <StatCard
                    label="Approved Registrations"
                    value={number(registrationStats.approved)}
                    note="Approved accounts"
                    icon="✓"
                    tone="stock-icon"
                  />

                  <StatCard
                    label="Rejected Registrations"
                    value={number(registrationStats.rejected)}
                    note="Rejected accounts"
                    icon="×"
                    tone="intake-icon"
                  />
                </section>

                <section className="panel dashboard-chart-panel admin-quick-panel">
                  <div className="dashboard-section-heading">
                    <div>
                      <p className="dashboard-eyebrow">
                        ACCOUNT MANAGEMENT
                      </p>
                      <h2>Registration Approvals</h2>
                      <p className="dashboard-section-description">
                        Review new Miller and Commissiondar registrations.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openSection('approvals')}
                    >
                      View Requests →
                    </button>
                  </div>

                  <div className="admin-quick-stats">
                    <div>
                      <span>Pending requests</span>
                      <strong>{number(registrationStats.pending)}</strong>
                    </div>
                    <div>
                      <span>Approved accounts</span>
                      <strong>{number(registrationStats.approved)}</strong>
                    </div>
                    <div>
                      <span>Rejected accounts</span>
                      <strong>{number(registrationStats.rejected)}</strong>
                    </div>
                  </div>
                </section>

                <footer className="dashboard-footer">
                  <span className="footer-status-dot" />
                  Dashboard data is provided by the connected Render backend.
                </footer>
              </section>
            )}

            {section === 'approvals' && (
              <section className="admin-content">
                <div className="admin-page-heading">
                  <div>
                    <p className="dashboard-eyebrow">
                      ACCOUNT MANAGEMENT
                    </p>
                    <h1>Registration Approvals</h1>
                    <p className="dashboard-subtitle">
                      Review and process new account requests.
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
                        <span>
                          {number(registrationStats.pending)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {approvalTab === 'pending' ? (
                  <section className="panel admin-table-panel">
                    <div className="admin-table-heading">
                      <div>
                        <h2>Pending Requests</h2>
                        <p>
                          Registrations awaiting administrator review.
                        </p>
                      </div>

                      <input
                        type="search"
                        placeholder="Search name, phone or ID..."
                        value={search}
                        onChange={event => setSearch(event.target.value)}
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
                            ? 'New registration requests will appear here.'
                            : 'Try another search term.'}
                        </span>
                      </div>
                    ) : (
                      <div className="admin-table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>User ID</th>
                              <th>Name</th>
                              <th>Phone</th>
                              <th>Account Type</th>
                              <th>Registration Date</th>
                              <th>Actions</th>
                            </tr>
                          </thead>

                          <tbody>
                            {filteredRegistrations.map((item, index) => {
                              const id = getRegistrationId(item);

                              return (
                                <tr key={id ?? index}>
                                  <td>#{id ?? '—'}</td>
                                  <td>{getRegistrationName(item)}</td>
                                  <td>{getRegistrationPhone(item)}</td>
                                  <td>
                                    <span className="admin-role-badge">
                                      {getRegistrationRole(item)}
                                    </span>
                                  </td>
                                  <td>{getRegistrationDate(item)}</td>
                                  <td>
                                    <div className="admin-row-actions">
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
                      {approvalTab === 'approved'
                        ? 'Approved Users'
                        : 'Rejected Users'}
                    </h2>
                    <p>
                      The current backend does not provide this registration
                      list yet.
                    </p>
                    <span>
                      The dashboard summary shows the actual count. A list API
                      is required to display individual accounts here.
                    </span>
                  </section>
                )}
              </section>
            )}

            {['users', 'millers', 'commissiondars'].includes(section) && (
              <section className="admin-content">
                <div className="admin-page-heading">
                  <div>
                    <p className="dashboard-eyebrow">ACCOUNT DIRECTORY</p>
                    <h1>
                      {menuItems.find(item => item.id === section)?.label}
                    </h1>
                    <p className="dashboard-subtitle">
                      View account information and approval status.
                    </p>
                  </div>
                </div>

                <section className="panel dashboard-empty admin-unavailable">
                  <span className="empty-chart-icon">♙</span>
                  <h2>Account list API required</h2>
                  <p>
                    The current backend does not provide an endpoint to list
                    these accounts.
                  </p>
                  <span>
                    No sample or hardcoded users are displayed. This section
                    will become functional when the backend provides the
                    required account-list endpoint.
                  </span>
                  <button
                    type="button"
                    onClick={() => openSection('approvals')}
                  >
                    Go to Registration Approvals
                  </button>
                </section>
              </section>
            )}
          </>
        )}
      </main>

      {confirmation && (
        <div
          className="delete-modal-overlay"
          role="presentation"
          onMouseDown={event => {
            if (
              event.target === event.currentTarget &&
              !actionLoading
            ) {
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
              Are you sure you want to {confirmation.action} the registration
              for <strong>{confirmation.name}</strong>?
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
