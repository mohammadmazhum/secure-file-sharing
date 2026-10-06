import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import api, { fmtDate } from './api';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Files from './pages/Files.jsx';
import Shares from './pages/Shares.jsx';
import Receive from './pages/Receive.jsx';
import SharedFile from './pages/SharedFile.jsx';

function Protected() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <p className="center">Loading…</p>;
  if (!user) return <Navigate to="/login" state={{ next: loc.pathname }} replace />;
  return <Layout />;
}

function Bell() {
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const load = () => api.get('/notifications').then((r) => setData(r.data)).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);
  const toggle = async () => {
    setOpen(!open);
    if (!open && data.unread) { await api.post('/notifications/read'); setTimeout(load, 300); }
  };
  return (
    <div className="bell">
      <button className="btn ghost" onClick={toggle}>🔔{data.unread > 0 && <span className="badge-n">{data.unread}</span>}</button>
      {open && (
        <div className="dropdown">
          {data.notifications.length === 0 && <p className="muted">No notifications yet</p>}
          {data.notifications.map((n) => (
            <div key={n._id} className={`note ${n.read ? '' : 'unread'}`}>
              {n.message}<small>{fmtDate(n.createdAt)}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Layout() {
  const { user, logout } = useAuth();
  return (
    <>
      <header className="nav">
        <strong className="brand">🔐 SecureShare</strong>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/files">My Files</NavLink>
          <NavLink to="/shares">Shared History</NavLink>
          <NavLink to="/receive">Receive</NavLink>
        </nav>
        <div className="right">
          <Bell />
          <span className="muted">{user.name}</span>
          <button className="btn ghost" onClick={logout}>Logout</button>
        </div>
      </header>
      <main className="container"><Outlet /></main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route element={<Protected />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/files" element={<Files />} />
        <Route path="/shares" element={<Shares />} />
        <Route path="/receive" element={<Receive />} />
        <Route path="/s/:code" element={<SharedFile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
