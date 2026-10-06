import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { errMsg } from '../api';

export default function AuthPage({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if (isLogin) await login(f.email, f.password); else await register(f.name, f.email, f.password);
      nav(loc.state?.next || '/', { replace: true });
    } catch (err) { setError(await errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth" onSubmit={submit}>
        <h2>🔐 SecureShare</h2>
        <p className="muted">{isLogin ? 'Log in to your account' : 'Create your account'}</p>
        {!isLogin && <input placeholder="Full name" value={f.name} onChange={set('name')} required />}
        <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
        <input type="password" placeholder="Password (min 6 chars)" value={f.password} onChange={set('password')} required />
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Log in' : 'Register'}</button>
        <p className="muted">
          {isLogin ? <>No account? <Link to="/register" state={loc.state}>Register</Link></> : <>Have an account? <Link to="/login" state={loc.state}>Log in</Link></>}
        </p>
      </form>
    </div>
  );
}
