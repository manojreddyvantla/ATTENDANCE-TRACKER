'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'safe' | 'shortage'

  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem('mitsAttendanceData') || sessionStorage.getItem('attendanceData');
    if (!stored) {
      router.push('/');
    } else {
      setData(JSON.parse(stored));
    }
  }, [router]);

  const handleRefresh = async () => {
    if (!data?.username) return;
    setRefreshing(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.username,
          password: data.password || '',
        }),
      });
      if (res.ok) {
        const newData = await res.json();
        const updated = {
          ...newData,
          username: data.username,
          password: data.password,
          lastUpdated: new Date().toISOString(),
        };
        sessionStorage.setItem('mitsAttendanceData', JSON.stringify(updated));
        setData(updated);
      }
    } catch (e) {
      console.error('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('mitsAttendanceData');
    sessionStorage.removeItem('attendanceData');
    router.push('/');
  };

  // Calculations & metrics
  const studentName = data?.student?.name || data?.studentName || data?.name || data?.username || 'Student';
  const rollNo = data?.student?.rollNo || data?.student?.usn || data?.username || '';
  
  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'ST';

  const attendanceList = data?.attendance || [];
  
  const totalAttended = data?.overallAttendance?.attended ?? attendanceList.reduce((s, i) => s + (i.attended || 0), 0);
  const totalConducted = data?.overallAttendance?.conducted ?? attendanceList.reduce((s, i) => s + (i.conducted || 0), 0);
  
  const overallPct = typeof data?.overallAttendance?.percentage === 'number'
    ? data.overallAttendance.percentage.toFixed(1)
    : (totalConducted > 0 ? ((totalAttended / totalConducted) * 100).toFixed(1) : '0.0');

  const isOverallSafe = parseFloat(overallPct) >= 75;

  const totalSafeBunks = attendanceList.reduce((sum, item) => sum + (item.safe_bunks || 0), 0);

  // Filter and search subjects
  const filteredSubjects = useMemo(() => {
    return attendanceList.filter((s) => {
      const nameMatch = (s.subjectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (s.code || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const pct = parseFloat(s.percentage) || 0;
      if (!nameMatch) return false;

      if (filterType === 'safe') return pct >= 75;
      if (filterType === 'shortage') return pct < 75;
      return true;
    });
  }, [attendanceList, searchQuery, filterType]);

  const safeCount = attendanceList.filter((s) => (parseFloat(s.percentage) || 0) >= 75).length;
  const shortageCount = attendanceList.filter((s) => (parseFloat(s.percentage) || 0) < 75).length;

  if (!data) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px auto', width: '36px', height: '36px', borderTopColor: '#2563eb', borderColor: 'rgba(37, 99, 235, 0.2)' }} />
          <div style={{ fontWeight: 800, color: '#334155', fontSize: '1.05rem', fontFamily: 'Outfit' }}>
            Loading MITS GEMS Attendance...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-canvas">
      {/* 1. TOP HEADER & STUDENT PROFILE */}
      <header className="floating-glass-nav">
        <div className="brand-wrapper">
          <div className="brand-gradient-orb">⚡</div>
          <div>
            <div className="brand-logo-text">MITS<span>.TRACK</span></div>
            <div className="brand-sub-badge">Live GEMS Attendance</div>
          </div>
        </div>

        {/* Student Profile Nav Chip */}
        <div className="student-nav-chip">
          <div className="student-initials-badge">{initials}</div>
          <div>
            <div className="student-tag-micro">Student Name</div>
            <div className="student-title-name">{studentName}</div>
            {rollNo && <div className="student-roll-chip">Roll: {rollNo}</div>}
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="nav-actions-group">
          <button 
            className="nav-pill-btn btn-nav-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh live data from MITS GEMS"
          >
            {refreshing ? (
              <>
                <div className="loading-spinner" style={{ width: '14px', height: '14px', borderTopColor: '#ffffff' }} />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Refresh Live</span>
              </>
            )}
          </button>

          <button 
            className="nav-pill-btn btn-nav-logout"
            onClick={handleLogout}
            title="Sign Out"
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* 2. #1 PRIMARY ATTENDANCE HERO SHOWCASE (SHOWN 1ST) */}
      <section className="attendance-first-hero">
        <div className="hero-primary-row">
          {/* Huge Attendance Percentage Block */}
          <div className="hero-big-percentage-block">
            <div className="hero-top-label">Overall Attendance</div>
            <div className={`hero-huge-pct ${isOverallSafe ? 'safe' : 'danger'}`}>
              {overallPct}%
            </div>
            <div className={`status-badge-hero ${isOverallSafe ? 'safe' : 'danger'}`}>
              <span>{isOverallSafe ? '🛡️ Safe Zone (≥75%)' : '⚠️ Shortage Zone (<75%)'}</span>
            </div>
          </div>

          {/* Details & Stat Metrics */}
          <div className="hero-content-block">
            <div className="hero-kicker-badge">
              <span>🔥</span> Live Attendance Status
            </div>

            <h2 className="hero-status-heading">
              {isOverallSafe ? (
                <>
                  You are in the safe zone with <span className="highlight-safe-text">{totalSafeBunks} safe bunks</span> buffer remaining.
                </>
              ) : (
                <>
                  Attendance requires attention! You <span className="highlight-danger-text">must attend classes</span> to reach 75%.
                </>
              )}
            </h2>

            {/* Target Progress Bar */}
            <div>
              <div className="hero-target-track">
                <div 
                  className={`hero-target-fill ${isOverallSafe ? 'safe' : 'danger'}`}
                  style={{ width: `${Math.min(100, Math.max(0, parseFloat(overallPct)))}%` }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', marginTop: '5px' }}>
                <span>0%</span>
                <span style={{ color: '#2563eb' }}>75% Required Target</span>
                <span>100%</span>
              </div>
            </div>

            {/* 3 Metric Pills */}
            <div className="hero-metrics-pill-row">
              <div className="metric-pill-item">
                <div className="metric-pill-val safe">{totalAttended}</div>
                <div className="metric-pill-lbl">Attended</div>
              </div>

              <div className="metric-pill-item">
                <div className="metric-pill-val">{totalConducted}</div>
                <div className="metric-pill-lbl">Conducted</div>
              </div>

              <div className="metric-pill-item">
                <div className={`metric-pill-val ${isOverallSafe ? 'safe' : 'danger'}`}>
                  {totalSafeBunks}
                </div>
                <div className="metric-pill-lbl">Safe Skips</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ENROLLED SUBJECTS SECTION */}
      <section className="subjects-section-wrap">
        {/* Toolbar with Title, Search, and Filters */}
        <div className="subjects-toolbar-row">
          <div className="subjects-heading-title">
            <span>📖 Enrolled Subjects</span>
            <span className="count-badge-total">{attendanceList.length} Total</span>
          </div>

          <div className="controls-filter-group">
            {/* Search Input */}
            <div className="search-input-wrapper">
              <span className="search-icon-inside">🔍</span>
              <input 
                type="text"
                placeholder="Search subject or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Tabs */}
            <button 
              className={`filter-tab-pill ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              All ({attendanceList.length})
            </button>
            <button 
              className={`filter-tab-pill ${filterType === 'safe' ? 'active' : ''}`}
              onClick={() => setFilterType('safe')}
            >
              Safe ≥75% ({safeCount})
            </button>
            <button 
              className={`filter-tab-pill ${filterType === 'shortage' ? 'active' : ''}`}
              onClick={() => setFilterType('shortage')}
            >
              Shortage &lt;75% ({shortageCount})
            </button>
          </div>
        </div>

        {/* Subjects Grid */}
        <div className="subjects-card-grid">
          {filteredSubjects.length > 0 ? (
            filteredSubjects.map((sub) => {
              const pct = parseFloat(sub.percentage) || 0;
              const isSafe = pct >= 75;
              const isWarning = pct >= 65 && pct < 75;
              const cardStatus = isSafe ? 'safe' : (isWarning ? 'warning' : 'danger');

              return (
                <div key={sub.code} className={`subject-item-card ${cardStatus}`}>
                  <div>
                    <div className="subject-card-top-row">
                      <span className="subject-code-pill">{sub.code}</span>
                      <div className={`subject-pct-highlight ${cardStatus}`}>
                        {pct.toFixed(1)}%
                      </div>
                    </div>

                    <h3 className="subject-name-heading">
                      {sub.subjectName}
                    </h3>
                  </div>

                  <div>
                    <div className="progress-track-container" style={{ marginBottom: '10px' }}>
                      <div 
                        className={`progress-fill-bar ${cardStatus}`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>

                    <div className="subject-stats-bar-bottom">
                      <div className="attended-classes-text">
                        Attended: <strong>{sub.attended}/{sub.conducted}</strong>
                      </div>

                      <div className={`bunk-status-text ${isSafe ? 'safe' : 'danger'}`}>
                        {isSafe ? (
                          <span>🛡️ {sub.safe_bunks || 0} Safe Bunks</span>
                        ) : (
                          <span>🚨 Must Attend</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#334155' }}>No subjects found</div>
              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Try clearing the search query or filter tab.</div>
            </div>
          )}
        </div>
      </section>

      {/* 4. FOOTER ATTRIBUTION */}
      <footer className="app-footer-block">
        <div>Developed by <strong>Manoj Kumar Reddy</strong></div>
        <div className="app-footer-dept-tag">
          CSE (AI &amp; ML)
        </div>
      </footer>
    </div>
  );
}
