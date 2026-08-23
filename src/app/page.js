'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  // Auto-Login: If the user previously logged in, resume session immediately without asking to sign in again
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mitsAttendanceData') || sessionStorage.getItem('mitsAttendanceData');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.username || parsed.student?.rollNo)) {
          router.replace('/dashboard');
          return;
        }
      }
    } catch (err) {
      console.warn('Session check error:', err);
    }
    setCheckingSession(false);
  }, [router]);

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

      const sessionPayload = {
        ...data,
        username,
        password,
        lastUpdated: new Date().toISOString(),
      };

      // Store in persistent localStorage so it never logs out on closing the browser
      localStorage.setItem('mitsAttendanceData', JSON.stringify(sessionPayload));
      sessionStorage.setItem('mitsAttendanceData', JSON.stringify(sessionPayload));

      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="login-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="login-brand-orb" style={{ margin: '0 auto 1.25rem', width: '60px', height: '60px', fontSize: '1.8rem' }}>
            ⚡
          </div>
          <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-main)' }}>
            MITS Attendance Tracker
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Connecting to your live GEMS dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-glass-card">
        <div className="login-header-block">
          <div className="login-brand-orb">
            ⚡
          </div>
          <h1 className="login-title-text">MITS Attendance Tracker</h1>
          <p className="login-sub-text">
            Madanapalle Institute of Technology &amp; Science
          </p>
          <div className="portal-tag-chip">
            <span className="pulse-indicator"></span>
            Official GEMS Integration
          </div>
        </div>

        {/* Feature Pills */}
        <div className="login-feature-strip">
          <span className="login-feature-tag">🎯 Safe Bunk Optimizer</span>
          <span className="login-feature-tag">🌴 Smart Leave Planner</span>
          <span className="login-feature-tag">⚡ Live GEMS Stream</span>
          <span className="login-feature-tag">🧪 What-If Simulator</span>
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
                placeholder="Enter GEMS Password"
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && (
            <div className="error-alert-box">
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

        <div className="security-note-text" style={{ marginTop: '1.5rem' }}>
          <span>🛡️</span>
          <span>Direct secure connection to MITS GEMS portal. Credentials are stored securely on your device for seamless access.</span>
        </div>

        <div className="login-footer-attribution">
          <div>Developed by <strong>CSE (AI &amp; ML)</strong></div>
          <div className="login-footer-dept">
            Madanapalle Institute of Technology &amp; Science
          </div>
        </div>
      </div>
    </div>
  );
}
