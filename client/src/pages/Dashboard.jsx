import { useEffect, useState } from 'react';
import api, { fmtSize, fmtDate } from '../api';

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => {
    let mounted = true;
    const load = () => api.get('/dashboard').then((r) => {
      if (mounted) setD(r.data);
    }).catch(() => {});
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') load();
    };

    load();
    const interval = window.setInterval(load, 15000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);
  if (!d) return <p className="center">Loading…</p>;
  const pct = Math.min(100, (d.storage.used / d.storage.quota) * 100);
  const max = Math.max(1, ...d.days.map((x) => x.count));

  return (
    <>
      <h2>Dashboard</h2>
      <div className="grid">
        <div className="card stat"><span>{d.fileCount}</span>Files stored</div>
        <div className="card stat"><span>{d.shareCount}</span>Total shares</div>
        <div className="card stat"><span>{d.shareStatus.active}</span>Active shares</div>
        <div className="card stat"><span>{d.totalDownloads}</span>Total downloads</div>
      </div>

      <div className="card">
        <h3>Storage usage</h3>
        <div className="bar"><div style={{ width: `${pct}%` }} className={pct > 85 ? 'warn' : ''} /></div>
        <p className="muted">{fmtSize(d.storage.used)} of {fmtSize(d.storage.quota)} used ({pct.toFixed(1)}%)</p>
      </div>

      <div className="two">
        <div className="card">
          <h3>Downloads — last 7 days</h3>
          <div className="chart">
            {d.days.map((x) => (
              <div key={x.date} className="col" title={`${x.date}: ${x.count}`}>
                <em>{x.count}</em>
                <div style={{ height: `${(x.count / max) * 100}%` }} />
                <small>{x.date.slice(5)}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Share status</h3>
          {['active', 'expired', 'revoked'].map((s) => (
            <p key={s}><span className={`pill ${s}`}>{s}</span> {d.shareStatus[s]}</p>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Recent file activity</h3>
        {d.recent.length === 0 ? <p className="muted">No downloads yet.</p> : (
          <table><thead><tr><th>File</th><th>Downloaded by</th><th>When</th></tr></thead>
            <tbody>{d.recent.map((r) => (
              <tr key={r._id}><td>{r.fileName}</td><td>{r.userName} ({r.userEmail})</td><td>{fmtDate(r.createdAt)}</td></tr>
            ))}</tbody></table>
        )}
      </div>
    </>
  );
}
