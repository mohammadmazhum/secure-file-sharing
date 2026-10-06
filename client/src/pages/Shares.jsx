import { Fragment, useCallback, useEffect, useState } from 'react';
import api, { fmtDate, fmtSize } from '../api';

export default function Shares() {
  const [shares, setShares] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState({}); // shareId -> downloads[] (open)

  const load = useCallback(() => {
    api.get('/shares', { params: { q, status } }).then((r) => setShares(r.data.shares));
  }, [q, status]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const revoke = async (s) => {
    if (!confirm('Revoke access? The link will stop working immediately.')) return;
    await api.post(`/shares/${s._id}/revoke`); load();
  };
  const toggleLog = async (s) => {
    if (logs[s._id]) return setLogs(({ [s._id]: _, ...rest }) => rest);
    const r = await api.get(`/shares/${s._id}/downloads`);
    setLogs((l) => ({ ...l, [s._id]: r.data.downloads }));
  };
  const copy = async (s) => {
    try {
      await navigator.clipboard.writeText(s.code);
      alert('✓ Share code copied!');
    } catch {
      alert('Unable to copy share code');
    }
  };

  return (
    <>
      <h2>Shared History</h2>
      <div className="row filters">
        <input placeholder="Search by file, code or recipient email…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option><option value="active">Active</option>
          <option value="expired">Expired</option><option value="revoked">Revoked</option>
        </select>
      </div>
      <div className="card">
        {shares.length === 0 ? <p className="muted">No shares found.</p> : (
          <table>
            <thead><tr><th>File</th><th>Status</th><th>Restricted users</th><th>Expires</th><th>Downloads</th><th></th></tr></thead>
            <tbody>{shares.map((s) => (
              <Fragment key={s._id}>
                <tr>
                  <td>{s.fileName}<small className="block">{fmtSize(s.fileSize)} · created {fmtDate(s.createdAt)}</small></td>
                  <td><span className={`pill ${s.status}`}>{s.status}</span></td>
                  <td>
                    {s.allowedEmails.length ? s.allowedEmails.join(', ') : <span className="muted">Any signed-in user</span>}
                    {s.hasPassword && <small className="block">🔑 password protected</small>}
                  </td>
                  <td>{fmtDate(s.expiresAt)}</td>
                  <td>{s.downloadCount}{s.maxDownloads ? ` / ${s.maxDownloads}` : ''}</td>
                  <td className="actions">
                    <button className="btn sm ghost" onClick={() => copy(s)}>Copy code</button>
                    <button className="btn sm ghost" onClick={() => toggleLog(s)}>{logs[s._id] ? 'Hide log' : 'Log'}</button>
                    {s.status === 'active' && <button className="btn sm danger" onClick={() => revoke(s)}>Revoke</button>}
                  </td>
                </tr>
                {logs[s._id] && (
                  <tr><td colSpan="6" className="log">
                    {logs[s._id].length === 0 ? 'No downloads yet.' : logs[s._id].map((d) => (
                      <div key={d._id}>⬇ {d.userName} ({d.userEmail}) — {fmtDate(d.createdAt)} — IP {d.ip}</div>
                    ))}
                  </td></tr>
                )}
              </Fragment>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
