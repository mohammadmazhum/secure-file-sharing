import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Receive() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const submit = (event) => {
    event.preventDefault();
    const shareCode = code.trim();
    if (shareCode) navigate(`/s/${encodeURIComponent(shareCode)}`);
  };

  return (
    <div className="card narrow">
      <h2>Receive a file</h2>
      <form onSubmit={submit}>
        <label htmlFor="share-code">Share code</label>
        <input
          id="share-code"
          type="text"
          autoComplete="off"
          placeholder="Enter the code you received"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          required
        />
        <button className="btn" type="submit">Continue to file</button>
      </form>
    </div>
  );
}