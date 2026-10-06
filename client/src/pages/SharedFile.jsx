import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { errMsg, fmtDate, fmtSize, saveBlob } from '../api';

export default function SharedFile() {
  const { code } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get(`/s/${code}`).then((r) => setInfo(r.data)).catch(async (e) => setError(await errMsg(e)));
  }, [code]);

  const download = async () => {
    setBusy(true); setError('');
    try {
      const r = await api.post(`/s/${code}/download`, { password }, { responseType: 'blob' });
      saveBlob(r.data, info.fileName); setDone(true);
    } catch (e) { setError(await errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="card narrow">
      <h2>Shared file</h2>
      {!info && !error && <p className="muted">Loading…</p>}
      {!info && error && <div className="error">{error}</div>}
      {info && (
        <>
          <p><strong>{info.fileName}</strong> ({fmtSize(info.fileSize)})</p>
          <p className="muted">Shared by {info.sender} · expires {fmtDate(info.expiresAt)}
            {info.remainingDownloads !== null && ` · ${info.remainingDownloads} download(s) left`}</p>
          {info.requiresPassword && <input type="password" placeholder="Enter link password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          {error && <div className="error">{error}</div>}
          {done && <div className="ok">Download started ✔</div>}
          <button className="btn" onClick={download} disabled={busy || (info.requiresPassword && !password)}>
            {busy ? 'Preparing…' : '⬇ Download'}
          </button>
        </>
      )}
    </div>
  );
}
