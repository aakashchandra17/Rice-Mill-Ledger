import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { listUsers, createUser, updateUser, describeError } from '../api';
import { t } from '../strings';

const ROLE_LABEL = { admin: t.roleAdmin, agent: t.roleAgent, farmer: t.roleFarmer };
const EMPTY = { role: 'agent', name: '', phone: '', village: '', password: '' };

const randomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
};

export default function Users() {
  const { token } = useAuth();
  const { addFarmerRecord } = useData();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    listUsers(token)
      .then(data => { if (!cancelled) setUsers(data); })
      .catch(err => { if (!cancelled) setLoadError(describeError(err) || t.errGeneric); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const submit = async e => {
    e.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = t.errName;
    if (form.phone.length !== 10) found.phone = t.phoneError;
    if (form.role === 'farmer' && !form.village.trim()) found.village = t.errVillage;
    if (form.password.length < 8) found.password = t.errPasswordLength;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setFormError('');
    setSaving(true);
    try {
      const created = await createUser(
        {
          role: form.role,
          name: form.name.trim(),
          phone: form.phone,
          password: form.password,
          ...(form.role === 'farmer' && { village: form.village.trim() }),
        },
        token
      );
      setUsers(prev => [...prev, created]);
      if (created.role === 'farmer') {
        addFarmerRecord({ id: created.farmerId, name: created.name, village: form.village.trim() });
      }
      setNotice(`${t.accountCreated}: ${created.name} (${created.phone}). ${t.tempPassword}: ${form.password}. ${t.shareOnce}`);
      setForm(EMPTY);
      setErrors({});
      setShowForm(false);
    } catch (err) {
      setFormError(err.status === 409 ? t.errPhoneExists : describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async u => {
    try {
      const updated = await updateUser(u.id, { active: !u.active }, token);
      setUsers(prev => prev.map(x => (x.id === u.id ? updated : x)));
    } catch (err) {
      setNotice(describeError(err));
    }
  };

  const resetPassword = async u => {
    const pw = randomPassword();
    try {
      await updateUser(u.id, { password: pw }, token);
      setNotice(`${t.newPasswordFor} ${u.name}: ${pw}. ${t.shareOnce}`);
    } catch (err) {
      setNotice(describeError(err));
    }
  };

  return (
    <div>
      <div className="page-head">
        <h1>{t.accountsTitle}</h1>
        {!showForm && (
          <button onClick={() => { setShowForm(true); setNotice(''); }}>{t.addAccount}</button>
        )}
      </div>
      <p className="muted">{t.adminsNote}</p>

      {notice && <div className="lnotice" role="status" style={{ marginBottom: 16 }}>{notice}</div>}

      {showForm && (
        <form className="panel form-card" style={{ margin: '0 0 16px' }} onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="acc-role">{t.accountType}</label>
            <select id="acc-role" value={form.role} onChange={e => setField('role', e.target.value)}>
              <option value="agent">{t.roleAgent}</option>
              <option value="farmer">{t.roleFarmer}</option>
            </select>
          </div>

          <div className={`field ${errors.name ? 'invalid' : ''}`}>
            <label htmlFor="acc-name">{t.fullName}</label>
            <input id="acc-name" value={form.name} onChange={e => setField('name', e.target.value)} />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>

          <div className={`field ${errors.phone ? 'invalid' : ''}`}>
            <label htmlFor="acc-phone">{t.phoneLabel}</label>
            <input
              id="acc-phone"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={form.phone}
              onChange={e => setField('phone', e.target.value.replace(/\D/g, ''))}
            />
            {errors.phone && <div className="field-error">{errors.phone}</div>}
          </div>

          {form.role === 'farmer' && (
            <div className={`field ${errors.village ? 'invalid' : ''}`}>
              <label htmlFor="acc-village">{t.village}</label>
              <input id="acc-village" value={form.village} onChange={e => setField('village', e.target.value)} />
              {errors.village && <div className="field-error">{errors.village}</div>}
            </div>
          )}

          <div className={`field ${errors.password ? 'invalid' : ''}`}>
            <label htmlFor="acc-pw">{t.tempPassword}</label>
            <div className="inline-row">
              <input
                id="acc-pw"
                autoComplete="off"
                value={form.password}
                onChange={e => setField('password', e.target.value)}
              />
              <button type="button" className="btn-ghost" onClick={() => setField('password', randomPassword())}>
                {t.generate}
              </button>
            </div>
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          {formError && <div className="form-error" role="alert">{formError}</div>}

          <div className="form-actions">
            <button type="submit" disabled={saving}>{saving ? t.saving : t.save}</button>
            <button type="button" className="btn-ghost" onClick={() => { setShowForm(false); setForm(EMPTY); setErrors({}); setFormError(''); }}>
              {t.cancel}
            </button>
          </div>
        </form>
      )}

      <div className="panel" style={{ overflowX: 'auto' }}>
        {loading ? (
          <p>{t.loading}</p>
        ) : loadError ? (
          <div className="form-error" role="alert">{loadError}</div>
        ) : users.length === 0 ? (
          <p>{t.noAccounts}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t.name}</th>
                <th>{t.phoneLabel}</th>
                <th>{t.role}</th>
                <th>{t.status}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.phone}</td>
                  <td><span className={`badge badge-${u.role}`}>{ROLE_LABEL[u.role]}</span></td>
                  <td>
                    <span className={`badge ${u.active ? 'badge-on' : 'badge-off'}`}>
                      {u.active ? t.statusActive : t.statusDisabled}
                    </span>
                  </td>
                  <td>
                    {u.role !== 'admin' && (
                      <div className="row-actions">
                        <button className="btn-small btn-ghost" onClick={() => resetPassword(u)}>
                          {t.resetPassword}
                        </button>
                        <button className="btn-small btn-ghost" onClick={() => toggleActive(u)}>
                          {u.active ? t.disable : t.enable}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}