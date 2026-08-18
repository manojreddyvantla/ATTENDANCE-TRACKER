'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to login to MITS GEMS. Check your Roll Number and Password.');
      }

      sessionStorage.setItem('mitsAttendanceData', JSON.stringify({
        ...data,
        username,
        password,
        lastUpdated: new Date().toISOString(),
      }));

      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-glass-card">
        <div className="login-header-block">
          <div className="login-brand-orb">
            ⚡
          </div>
          <h1 className="login-title-text">MITS Attendance</h1>
          <p className="login-sub-text">
            Madanapalle Institute of Technology &amp; Science
          </p>
          <div className="portal-tag-chip">
            <span className="pulse-indicator"></span>
            Official GEMS Integration
          </div>
        </div>

        <form onSubmit={handleLogin} autoComplete="off">
          <div className="input-field-group">
            <label htmlFor="username">Roll Number</label>
            <div className="input-with-icon">
              <span className="input-left-icon">🎓</span>
              <input
                id="username"
                type="text"
                className="styled-text-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Roll Number"
                required
                disabled={loading}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="input-field-group">
            <label htmlFor="password">GEMS Password</label>
            <div className="input-with-icon">
              <span className="input-left-icon">🔒</span>
              <input
                id="password"
                type="password"
                className="styled-text-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && (
            <div style={{ 
              background: '#fff1f2', 
              color: '#e11d48', 
              border: '1px solid #fecdd3', 
              padding: '12px 14px', 
              borderRadius: '12px', 
              fontSize: '0.85rem', 
              marginBottom: '1rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-action-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="loading-spinner" />
                <span>Connecting to MITS GEMS...</span>
              </>
            ) : (
              <span>Sign In with GEMS →</span>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#64748b' }}>
          <div>Developed by <strong style={{ color: '#0f172a', fontWeight: 800 }}>Manoj Kumar Reddy</strong></div>
          <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: 800, marginTop: '3px' }}>
            CSE (AI &amp; ML)
          </div>
        </div>
      </div>
    </div>
  );
}
