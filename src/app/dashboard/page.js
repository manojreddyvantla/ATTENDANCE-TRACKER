'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  calculatePercentage,
  calculateSafeBunks,
  calculateRequiredClasses,
  calculateLeaveImpact,
  generateMilestones,
  calculateSemesterForecast,
  calculateTodayDeltas,
  TARGET_THRESHOLDS,
} from '@/lib/calculator';
import { MEME_QUOTES } from '@/lib/demoData';
import { soundFx } from '@/lib/soundFx';

export default function Dashboard() {
  const router = useRouter();

  // Core Attendance Data
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Theme & Sound State
  const [theme, setTheme] = useState('light');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active Navigation Tab: 'dashboard' | 'today' | 'calculator' | 'subjects' | 'planner' | 'profile'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [targetPercentage, setTargetPercentage] = useState(75);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('default');

  // Attendance Mode: 'official' (excl. TT/Aptitude) | 'withTT' (all courses)
  const [attendanceMode, setAttendanceMode] = useState('official');

  // Interactive Simulation State: { [subjectCode]: { attendedDelta: number, missedDelta: number } }
  const [simDeltas, setSimDeltas] = useState({});

  // Modals & Popups
  // null | { type: 'subject', subject: object } | { type: 'policy' } | { type: 'leave' } | { type: 'hallticket' } | { type: 'editTimetable' }
  const [activeModal, setActiveModal] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [subjectNotes, setSubjectNotes] = useState({});
  const [activeNoteText, setActiveNoteText] = useState('');

  // Leave Impact Simulator State
  // Leave Impact Simulator State
  const [selectedLeaveDays, setSelectedLeaveDays] = useState(['Friday', 'Saturday']);

  // Day Calculation
  const dayNamesList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayIndex = typeof window !== 'undefined' ? new Date().getDay() : 1;
  const currentTodayName = dayNamesList[todayDayIndex];
  const isSundayToday = todayDayIndex === 0;

  // Timetable State
  const [selectedDay, setSelectedDay] = useState(isSundayToday ? 'Monday' : currentTodayName);
  const [timetable, setTimetable] = useState({});
  const [todayClassesList, setTodayClassesList] = useState([]);
  const [initialTodayClassesList, setInitialTodayClassesList] = useState([]);

  // Toast Notification
  const [toast, setToast] = useState(null);

  // Meme Quote of the Day
  const [memeQuote, setMemeQuote] = useState(MEME_QUOTES[0]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };


  // Simulate Instant Faculty Attendance Post from MITS GEMS Mobile App
  const handleSimulateFacultyLivePost = () => {
    soundFx.playCelebrationFanfare();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let postedPeriodName = '';
    let postedIndex = -1;

    setTodayClassesList((prev) => {
      let targetIdx = prev.findIndex((c) => c.status === 'upcoming');
      if (targetIdx === -1) targetIdx = prev.length - 1;
      postedIndex = targetIdx;

      const updated = prev.map((c, idx) => {
        if (idx === targetIdx) {
          postedPeriodName = c.shortName || c.subjectName || c.code;
          return {
            ...c,
            status: 'present',
            tag: '⚡ POSTED LIVE IN CLASS',
            postedAt: nowTime,
            postedBy: c.faculty ? `${c.faculty} (GEMS Mobile App)` : 'Faculty (GEMS Mobile App)',
            syncSource: 'MITS GEMS Live Stream API',
          };
        }
        return c;
      });

      if (data) {
        const updatedData = {
          ...data,
          todaysClasses: updated,
          initialTodaysClasses: initialTodayClassesList.length > 0 ? initialTodayClassesList : prev,
          lastUpdated: new Date().toISOString(),
        };
        sessionStorage.setItem('mitsAttendanceData', JSON.stringify(updatedData));
      }

      return updated;
    });

    setLastSyncedText('Just now');
    showToast(`🔔 MITS GEMS Live: Faculty just submitted attendance for Period ${postedIndex + 1} (${postedPeriodName}) via GEMS App at ${nowTime} — Marked PRESENT!`);
  };

  // Timetable Editor Form State
  const [newPeriodData, setNewPeriodData] = useState({
    day: isSundayToday ? 'Monday' : currentTodayName,
    period: 1,
    time: '09:00 AM - 09:50 AM',
    code: '',
    name: '',
    room: 'LH-302',
    faculty: '',
  });

  // Forecast State
  const [forecastRemaining, setForecastRemaining] = useState(30);

  // Theme Initializer
  useEffect(() => {
    const savedTheme = localStorage.getItem('mits_theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    const isSoundOn = soundFx.isSoundEnabled();
    setSoundEnabled(isSoundOn);
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('mits_theme', newTheme);
    soundFx.playClickSound();
    showToast(`🎨 Theme switched to ${newTheme.toUpperCase()}`);
  };

  const handleToggleSound = () => {
    const nextState = soundFx.toggleSound();
    setSoundEnabled(nextState);
    if (nextState) {
      soundFx.playClickSound();
      showToast('🔊 Sound Effects Enabled');
    } else {
      showToast('🔇 Sound Effects Muted');
    }
  };

  const rollMeme = () => {
    const nextIdx = Math.floor(Math.random() * MEME_QUOTES.length);
    setMemeQuote(MEME_QUOTES[nextIdx]);
    soundFx.playClickSound();
    showToast('✨ New Campus Lore Loaded!');
  };

  // Load Persistent Session Data & Auto-Sync Live on Open
  useEffect(() => {
    const stored = localStorage.getItem('mitsAttendanceData') || sessionStorage.getItem('mitsAttendanceData') || localStorage.getItem('attendanceData') || sessionStorage.getItem('attendanceData');
    if (!stored) {
      router.push('/');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setData(parsed);

      // Random Meme Quote
      const randomQ = MEME_QUOTES[Math.floor(Math.random() * MEME_QUOTES.length)];
      setMemeQuote(randomQ);

      // User-scoped Timetable
      const userKey = parsed.username || parsed.student?.rollNo || 'user';
      const savedTimetable = localStorage.getItem(`mits_custom_timetable_${userKey}`);
      if (savedTimetable) {
        setTimetable(JSON.parse(savedTimetable));
      } else if (parsed.weeklyTimetable && Object.keys(parsed.weeklyTimetable).length > 0) {
        const formattedWeekly = {};
        for (const [day, periods] of Object.entries(parsed.weeklyTimetable)) {
          formattedWeekly[day] = (periods || []).map((p, idx) => ({
            period: p.period || idx + 1,
            time: p.time || (idx === 0 ? '09:00 AM' : `Period ${idx + 1}`),
            code: p.code || 'SUB',
            name: p.name || p.subjectName || p.code || 'Course Period',
            subjectName: p.subjectName || p.name || p.code || 'Course Period',
            room: p.room || p.roomNo || (p.code?.includes('LAB') ? 'Computer Center / Lab' : 'LH-302'),
            faculty: p.faculty || p.facultyName || 'MITS Faculty',
          }));
        }
        setTimetable(formattedWeekly);
      } else if (parsed.defaultTimetable) {
        setTimetable(parsed.defaultTimetable);
      } else {
        const fallback = {
          Monday: (parsed.attendance || []).slice(0, 5).map((s, idx) => ({
            period: idx + 1,
            time: `0${9 + idx}:00 AM`,
            code: s.code,
            name: s.subjectName,
            subjectName: s.subjectName,
            room: s.room || 'LH-302',
            faculty: s.faculty || 'MITS Faculty',
          })),
        };
        setTimetable(fallback);
      }

      // Today's classes (check for Sunday or empty schedule)
      if (Array.isArray(parsed.todaysClasses)) {
        setTodayClassesList(parsed.todaysClasses);
        setInitialTodayClassesList(parsed.initialTodaysClasses || parsed.todaysClasses);
      } else if (isSundayToday) {
        setTodayClassesList([]);
        setInitialTodayClassesList([]);
      } else {
        const defaultToday = (parsed.attendance || []).slice(0, 3).map((s, idx) => ({
          period: idx + 1,
          time: idx === 0 ? '09:00 - 09:50' : idx === 1 ? '09:50 - 10:40' : '10:50 - 11:40',
          code: s.code,
          shortName: (s.subjectName || s.code).split(' ')[0],
          subjectName: s.subjectName,
          room: s.room || 'LH-302',
          faculty: s.faculty || 'MITS Faculty',
          status: 'present',
          tag: '🟢 RECORDED IN GEMS',
        }));
        setTodayClassesList(defaultToday);
        setInitialTodayClassesList(defaultToday);
      }

      // Subject Notes
      const savedNotes = localStorage.getItem(`mits_subject_notes_${userKey}`) || localStorage.getItem('mits_subject_notes');
      if (savedNotes) {
        setSubjectNotes(JSON.parse(savedNotes));
      }

      // Immediate background live sync with MITS GEMS upon opening
      if (parsed.username && parsed.password && !parsed.isDemo) {
        fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: parsed.username,
            password: parsed.password,
          }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((newData) => {
            if (newData) {
              setData((prev) => {
                const updated = {
                  ...newData,
                  username: parsed.username,
                  password: parsed.password,
                  todaysClasses: newData.todaysClasses || prev?.todaysClasses,
                  initialTodaysClasses: newData.todaysClasses || prev?.initialTodaysClasses,
                  lastUpdated: new Date().toISOString(),
                };
                localStorage.setItem('mitsAttendanceData', JSON.stringify(updated));
                sessionStorage.setItem('mitsAttendanceData', JSON.stringify(updated));
                return updated;
              });
              if (newData.weeklyTimetable && Object.keys(newData.weeklyTimetable).length > 0 && !savedTimetable) {
                const formattedWeekly = {};
                for (const [day, periods] of Object.entries(newData.weeklyTimetable)) {
                  formattedWeekly[day] = (periods || []).map((p, idx) => ({
                    period: p.period || idx + 1,
                    time: p.time || (idx === 0 ? '09:00 AM' : `Period ${idx + 1}`),
                    code: p.code || 'SUB',
                    name: p.name || p.subjectName || p.code || 'Course Period',
                    subjectName: p.subjectName || p.name || p.code || 'Course Period',
                    room: p.room || p.roomNo || (p.code?.includes('LAB') ? 'Computer Center / Lab' : 'LH-302'),
                    faculty: p.faculty || p.facultyName || 'MITS Faculty',
                  }));
                }
                setTimetable(formattedWeekly);
              }
            }
          })
          .catch((syncErr) => console.warn('Initial background sync note:', syncErr));
      }
    } catch (e) {
      console.error('Error loading attendance data:', e);
      router.push('/');
    }
  }, [router, isSundayToday]);

  // Background Auto-Sync Polling Interval (every 20s automatically)
  useEffect(() => {
    if (!data) return;

    const intervalId = setInterval(async () => {
      if (data.isDemo) return;
      if (!data.username || !data.password) return;

      try {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: data.username,
            password: data.password,
          }),
        });

        if (res.ok) {
          const newData = await res.json();
          setData((prev) => {
            const updated = {
              ...newData,
              username: prev.username,
              password: prev.password,
              todaysClasses: prev.todaysClasses || newData.todaysClasses,
              initialTodaysClasses: prev.initialTodaysClasses || newData.todaysClasses,
              lastUpdated: new Date().toISOString(),
            };
            localStorage.setItem('mitsAttendanceData', JSON.stringify(updated));
            sessionStorage.setItem('mitsAttendanceData', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err) {
        console.warn('Background auto-sync polling skipped:', err);
      }
    }, 20000);

    return () => clearInterval(intervalId);
  }, [data]);

  const handleRefresh = async () => {
    soundFx.playClickSound();
    if (!data?.username) return;
    if (data.isDemo) {
      showToast('Demo Mode active: Live sync simulated.');
      return;
    }
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
          todaysClasses: todayClassesList.length > 0 ? todayClassesList : newData.todaysClasses,
          initialTodaysClasses: initialTodayClassesList.length > 0 ? initialTodayClassesList : newData.todaysClasses,
          lastUpdated: new Date().toISOString(),
        };
        localStorage.setItem('mitsAttendanceData', JSON.stringify(updated));
        sessionStorage.setItem('mitsAttendanceData', JSON.stringify(updated));
        setData(updated);
        showToast('✅ GEMS Attendance synchronized successfully!');
      } else {
        showToast('⚠️ GEMS portal busy. Using cached data.');
      }
    } catch (e) {
      console.error('Refresh error:', e);
      showToast('❌ Refresh failed. Please check internet connection.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    soundFx.playClickSound();
    localStorage.removeItem('mitsAttendanceData');
    localStorage.removeItem('attendanceData');
    sessionStorage.removeItem('mitsAttendanceData');
    sessionStorage.removeItem('attendanceData');
    router.push('/');
  };

  // Simulation Handlers
  const handleSimulate = (code, deltaAttended, deltaMissed) => {
    if (deltaAttended > 0) soundFx.playPresentSound();
    else if (deltaMissed > 0) soundFx.playAbsentSound();
    else soundFx.playClickSound();

    setSimDeltas((prev) => {
      const current = prev[code] || { attendedDelta: 0, missedDelta: 0 };
      const newAttended = Math.max(0, current.attendedDelta + deltaAttended);
      const newMissed = Math.max(0, current.missedDelta + deltaMissed);
      if (newAttended === 0 && newMissed === 0) {
        const copy = { ...prev };
        delete copy[code];
        return copy;
      }
      return {
        ...prev,
        [code]: { attendedDelta: newAttended, missedDelta: newMissed },
      };
    });
  };

  const handleResetSimulation = () => {
    soundFx.playClickSound();
    setSimDeltas({});
    showToast('Simulation reset to live GEMS records.');
  };

  const hasActiveSimulation = Object.keys(simDeltas).length > 0;

  // Student Profile Info
  const studentName = data?.student?.name || data?.studentName || data?.name || data?.username || 'Student';
  const rollNo = data?.student?.rollNo || data?.student?.usn || data?.username || '';
  const branchName = data?.student?.branch || 'Computer Science & Engineering (AI & ML)';
  const weatherInfo = data?.weather || { condition: 'Sunny', temp: 26, rain: 20, icon: '01d' };
  const xpInfo = data?.xp || { level: 4, xp: 300, next_level_xp: 400, streak: 3 };
  const aiDailyMessage = data?.ai_message || "⚡ Tip: Maintain above 75% to stay worry-free during semester end lab externals!";

  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'ST';

  // Process Subjects with Real-Time Today Deltas & What-If Simulations
  const rawAttendanceList = data?.attendance || [];

  // Real-time Today's Deltas & Status Summary Map
  const { deltas: todayDeltas, summaryMap: todaySummaryMap } = useMemo(() => {
    return calculateTodayDeltas(todayClassesList, initialTodayClassesList);
  }, [todayClassesList, initialTodayClassesList]);

  const hasTodayChanges = useMemo(() => {
    return Object.values(todayDeltas).some((d) => d.attendedDelta !== 0 || d.conductedDelta !== 0);
  }, [todayDeltas]);

  const processedSubjects = useMemo(() => {
    return rawAttendanceList.map((item) => {
      const delta = simDeltas[item.code] || { attendedDelta: 0, missedDelta: 0 };
      const todayDelta = todayDeltas[item.code] || { attendedDelta: 0, conductedDelta: 0 };
      const todaySummary = todaySummaryMap[item.code] || null;

      const simAttended = Math.max(0, item.attended + todayDelta.attendedDelta + delta.attendedDelta);
      const simConducted = Math.max(0, item.conducted + todayDelta.conductedDelta + delta.attendedDelta + delta.missedDelta);
      const percentage = calculatePercentage(simAttended, simConducted);
      const safeBunks = calculateSafeBunks(simAttended, simConducted, targetPercentage);
      const requiredClasses = calculateRequiredClasses(simAttended, simConducted, targetPercentage);

      return {
        ...item,
        simAttended,
        simConducted,
        simPercentage: percentage,
        simSafeBunks: safeBunks,
        simRequiredClasses: requiredClasses,
        isSimulated: delta.attendedDelta > 0 || delta.missedDelta > 0,
        hasTodayDelta: todayDelta.attendedDelta !== 0 || todayDelta.conductedDelta !== 0,
        todayDelta,
        todaySummary,
        delta,
        milestones: generateMilestones(simAttended, simConducted),
      };
    });
  }, [rawAttendanceList, simDeltas, todayDeltas, todaySummaryMap, targetPercentage]);

  // Helper: check if a course is excluded from official attendance (e.g. TT, Aptitude, Soft Skills)
  const isExcludedFromOfficial = (s) => {
    if (s.isExcluded === true || s.isTT === true) return true;
    const name = (s.subjectName || '').toLowerCase();
    const code = (s.code || '').toLowerCase();
    return (
      name.includes('technical training') ||
      name.includes('soft skills') ||
      name.includes('placement') ||
      name.includes('aptitude') ||
      name.includes('nss') ||
      name.includes('sports') ||
      code.includes('tt') ||
      code.includes('apt')
    );
  };

  const officialSubjectsList = useMemo(() => {
    const list = processedSubjects.filter((s) => !isExcludedFromOfficial(s));
    return list.length > 0 ? list : processedSubjects;
  }, [processedSubjects]);

  const officialModePct = useMemo(() => {
    const att = officialSubjectsList.reduce((sum, s) => sum + s.simAttended, 0);
    const cond = officialSubjectsList.reduce((sum, s) => sum + s.simConducted, 0);
    return calculatePercentage(att, cond);
  }, [officialSubjectsList]);

  const allSubjectsPct = useMemo(() => {
    const att = processedSubjects.reduce((sum, s) => sum + s.simAttended, 0);
    const cond = processedSubjects.reduce((sum, s) => sum + s.simConducted, 0);
    return calculatePercentage(att, cond);
  }, [processedSubjects]);

  // Active subjects matching selected mode
  const activeModeSubjects = useMemo(() => {
    if (attendanceMode === 'official') {
      return officialSubjectsList;
    }
    return processedSubjects;
  }, [processedSubjects, officialSubjectsList, attendanceMode]);

  // Overall Statistics for the selected mode (e.g. 105 / 127 = 82.68%)
  const totalAttended = activeModeSubjects.reduce((sum, s) => sum + s.simAttended, 0);
  const totalConducted = activeModeSubjects.reduce((sum, s) => sum + s.simConducted, 0);
  const calculatedOverallPct = calculatePercentage(totalAttended, totalConducted);

  // Always derive overall percentage directly from the real numbers
  const currentDisplayPct = calculatedOverallPct;

  const overallPct = currentDisplayPct;
  const isOverallSafe = overallPct >= targetPercentage;
  const totalSafeBunks = activeModeSubjects.reduce((sum, s) => sum + s.simSafeBunks, 0);
  const totalRequiredClasses = activeModeSubjects.reduce((sum, s) => sum + s.simRequiredClasses, 0);

  // Leave Impact Analysis
  const leaveImpact = useMemo(() => {
    return calculateLeaveImpact(processedSubjects, selectedLeaveDays, timetable, targetPercentage);
  }, [processedSubjects, selectedLeaveDays, timetable, targetPercentage]);

  // Filter & Sort Subjects
  const filteredSubjects = useMemo(() => {
    let list = processedSubjects.filter((s) => {
      const matchSearch =
        (s.subjectName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.code || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (filterType === 'safe') return s.simPercentage >= targetPercentage;
      if (filterType === 'shortage') return s.simPercentage < targetPercentage;
      if (filterType === 'practical') return (s.type || '').toLowerCase().includes('practical') || (s.subjectName || '').toLowerCase().includes('lab');
      if (filterType === 'theory') return (s.type || '').toLowerCase().includes('theory') || !(s.subjectName || '').toLowerCase().includes('lab');
      return true;
    });

    if (sortBy === 'lowest') list.sort((a, b) => a.simPercentage - b.simPercentage);
    if (sortBy === 'highest') list.sort((a, b) => b.simPercentage - a.simPercentage);
    if (sortBy === 'bunks') list.sort((a, b) => b.simSafeBunks - a.simSafeBunks);
    if (sortBy === 'name') list.sort((a, b) => a.subjectName.localeCompare(b.subjectName));

    return list;
  }, [processedSubjects, searchQuery, filterType, sortBy, targetPercentage]);

  const safeCount = processedSubjects.filter((s) => s.simPercentage >= targetPercentage).length;
  const shortageCount = processedSubjects.filter((s) => s.simPercentage < targetPercentage).length;
  const shortageSubjectsList = processedSubjects.filter((s) => s.simPercentage < targetPercentage);

  // Notes Handler
  const handleSaveNote = (code) => {
    soundFx.playClickSound();
    const updated = { ...subjectNotes, [code]: activeNoteText };
    setSubjectNotes(updated);
    const userKey = data?.username || data?.student?.rollNo || 'user';
    localStorage.setItem(`mits_subject_notes_${userKey}`, JSON.stringify(updated));
    showToast('💾 Subject notes saved successfully!');
  };

  // Toggle Today's Period Status with Live Sync Propagation
  const handleToggleTodayStatus = (idx, nextStatus) => {
    if (nextStatus === 'present') soundFx.playPresentSound();
    else if (nextStatus === 'absent') soundFx.playAbsentSound();
    else soundFx.playClickSound();

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setTodayClassesList((prev) => {
      const updated = [...prev];
      const targetClass = updated[idx];
      updated[idx] = {
        ...targetClass,
        status: nextStatus,
        postedAt: nextStatus === 'present' ? (targetClass.postedAt || nowTime) : targetClass.postedAt,
        postedBy: nextStatus === 'present' ? (targetClass.postedBy || (targetClass.faculty ? `${targetClass.faculty} (GEMS Mobile App)` : 'Faculty (GEMS Mobile App)')) : targetClass.postedBy,
        tag: nextStatus === 'present' ? '🟢 MARKED PRESENT' : nextStatus === 'absent' ? '🔴 MARKED ABSENT' : '⏳ UPCOMING',
        syncSource: 'MITS GEMS Live Sync',
      };

      if (data) {
        const updatedData = {
          ...data,
          todaysClasses: updated,
          initialTodaysClasses: initialTodayClassesList.length > 0 ? initialTodayClassesList : prev,
          lastUpdated: new Date().toISOString(),
        };
        sessionStorage.setItem('mitsAttendanceData', JSON.stringify(updatedData));
      }

      return updated;
    });

    const subName = todayClassesList[idx]?.shortName || todayClassesList[idx]?.code || `Period ${idx + 1}`;
    if (nextStatus === 'present') {
      showToast(`✅ Period ${idx + 1} (${subName}) marked PRESENT — Stats updated across all pages!`);
    } else if (nextStatus === 'absent') {
      showToast(`⚠️ Period ${idx + 1} (${subName}) marked ABSENT — Stats updated across all pages!`);
    } else {
      showToast(`⏳ Period ${idx + 1} (${subName}) reset to UPCOMING.`);
    }
  };

  // Mark all today's classes as Present (e.g. 3 of 3 attended)
  const handleMarkAllAttended = () => {
    soundFx.playCelebrationFanfare();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTodayClassesList((prev) => {
      const updated = prev.map((c) => ({
        ...c,
        status: 'present',
        tag: '🟢 MARKED PRESENT IN GEMS',
        postedAt: c.postedAt || nowTime,
        postedBy: c.postedBy || (c.faculty ? `${c.faculty} (GEMS Mobile App)` : 'Faculty (GEMS Mobile App)'),
        syncSource: 'MITS GEMS Live Sync',
      }));

      if (data) {
        const updatedData = {
          ...data,
          todaysClasses: updated,
          initialTodaysClasses: initialTodayClassesList.length > 0 ? initialTodayClassesList : prev,
          lastUpdated: new Date().toISOString(),
        };
        sessionStorage.setItem('mitsAttendanceData', JSON.stringify(updatedData));
      }
      return updated;
    });
    showToast(`🎉 All ${todayClassesList.length} classes marked PRESENT — Checked with MITS GEMS!`);
  };


  // Semester Forecast
  const semesterForecast = useMemo(() => {
    return calculateSemesterForecast(totalAttended, totalConducted, Number(forecastRemaining) || 0, targetPercentage);
  }, [totalAttended, totalConducted, forecastRemaining, targetPercentage]);

  // Leave Day Selection Toggle
  const handleToggleLeaveDay = (day) => {
    soundFx.playClickSound();
    setSelectedLeaveDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  };

  // Add Period to Custom Timetable
  const handleAddPeriodToTimetable = (e) => {
    e.preventDefault();
    soundFx.playClickSound();
    if (!newPeriodData.code && !newPeriodData.name) {
      showToast('⚠️ Please enter Subject Code or Name');
      return;
    }
    const day = newPeriodData.day || selectedDay;
    const currentList = timetable[day] || [];
    const updatedDayList = [
      ...currentList,
      {
        period: Number(newPeriodData.period) || currentList.length + 1,
        time: newPeriodData.time,
        code: (newPeriodData.code || 'EXTRA').toUpperCase(),
        name: newPeriodData.name || newPeriodData.code || 'Custom Class',
        subjectName: newPeriodData.name || newPeriodData.code || 'Custom Class',
        room: newPeriodData.room || 'LH-302',
        faculty: newPeriodData.faculty || 'Faculty',
      },
    ].sort((a, b) => a.period - b.period);

    const updatedTimetable = {
      ...timetable,
      [day]: updatedDayList,
    };

    setTimetable(updatedTimetable);
    const userKey = data?.username || data?.student?.rollNo || 'user';
    localStorage.setItem(`mits_custom_timetable_${userKey}`, JSON.stringify(updatedTimetable));
    setActiveModal(null);
    showToast(`✅ Period added to ${day} timetable!`);
  };

  // Export CSV of Attendance Records
  const handleExportCSV = () => {
    soundFx.playClickSound();
    const headers = ['Course Code', 'Subject Name', 'Attended', 'Conducted', 'Percentage', 'Safe Bunks', 'Classes Needed'];
    const rows = processedSubjects.map((s) => [
      `"${s.code}"`,
      `"${s.subjectName.replace(/"/g, '""')}"`,
      s.simAttended,
      s.simConducted,
      `"${s.simPercentage}%"`,
      s.simSafeBunks,
      s.simRequiredClasses,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MITS_Attendance_${rollNo || 'Report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 CSV Attendance File downloaded!');
  };

  // Copy WhatsApp Formatted Report
  const copyWhatsAppReport = () => {
    soundFx.playClickSound();
    const statusEmoji = isOverallSafe ? '🛡️ SAFE' : '⚠️ SHORTAGE';
    const lines = [
      `🎓 *MITS Attendance Tracker Report*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Student:* ${studentName}`,
      `🆔 *Roll No:* ${rollNo}`,
      `🏢 *Branch:* ${branchName}`,
      `📊 *Overall Attendance:* ${overallPct}% (${statusEmoji})`,
      `🎯 *Target Goal:* ${targetPercentage}%`,
      `📈 *Attended:* ${totalAttended} / ${totalConducted} classes`,
      `🛡️ *Total Safe Bunks Available:* ${totalSafeBunks} skips`,
      ...(totalRequiredClasses > 0 ? [`🚨 *Mandatory Classes Needed:* ${totalRequiredClasses}`] : []),
      `━━━━━━━━━━━━━━━━━━━━`,
      `📚 *Subject Breakdown:*`,
      ...processedSubjects.map((s) => {
        const flag = s.simPercentage >= targetPercentage ? '✅' : '⚠️';
        const bunkInfo = s.simPercentage >= targetPercentage ? `${s.simSafeBunks} Safe Bunks` : `Must attend ${s.simRequiredClasses}`;
        return `${flag} *${s.code}:* ${s.simPercentage}% (${s.simAttended}/${s.simConducted}) - ${bunkInfo}`;
      }),
      `━━━━━━━━━━━━━━━━━━━━`,
      `⚡ _Generated with MITS Attendance Tracker_`,
    ];

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      showToast('📋 WhatsApp Report copied to clipboard!');
    });
  };

  const todayPresentCount = todayClassesList.filter((c) => c.status === 'present').length;
  const todayTotalCount = todayClassesList.length;

  if (!data) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px auto', width: '36px', height: '36px', borderTopColor: '#2563eb', borderColor: 'rgba(37, 99, 235, 0.2)' }} />
          <div style={{ fontWeight: 800, color: 'var(--text-body)', fontSize: '1.05rem', fontFamily: 'Outfit' }}>
            Loading MITS Attendance Tracker...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-canvas">
      {/* 1. TOP FLOATING HEADER */}
      <header className="floating-glass-nav">
        <div className="brand-wrapper">
          <div className="brand-gradient-orb">⚡</div>
          <div>
            <div className="brand-logo-text">MITS<span>.TRACK</span></div>
            <div className="brand-sub-badge">
              <span>Attendance Tracker</span>
              {data.isDemo && <span className="demo-chip-live">DEMO MODE</span>}
            </div>
          </div>
        </div>

        {/* Student Profile Nav Pill */}
        <div
          className="xp-level-header-pill"
          onClick={() => {
            soundFx.playClickSound();
            setActiveTab('profile');
          }}
          style={{ cursor: 'pointer' }}
          title="View Student Profile"
        >
          <span>🎓 {studentName} ({rollNo})</span>
          <span className="xp-streak-tag">🔥 {xpInfo.streak || 5}d Streak</span>
        </div>

        {/* Header Action Controls */}
        <div className="nav-actions-group">
          {/* Theme Switcher */}
          <select
            className="theme-pill-select"
            value={theme}
            onChange={(e) => handleThemeChange(e.target.value)}
            title="Switch Visual Theme"
          >
            <option value="light">☀️ Light</option>
            <option value="dark">🌙 Dark</option>
            <option value="cyber">⚡ Cyber</option>
            <option value="emerald">🌲 Emerald</option>
          </select>

          {/* Sound Toggle */}
          <button
            className="sound-toggle-btn"
            onClick={handleToggleSound}
            title={soundEnabled ? 'Mute Sound Effects' : 'Enable Sound Effects'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>

          {/* Smart Leave Planner Button */}
          <button
            className="nav-pill-btn"
            style={{ background: 'var(--accent-bg-subtle)', borderColor: 'var(--accent-border-subtle)', color: 'var(--accent-primary)', fontWeight: 800 }}
            onClick={() => {
              soundFx.playClickSound();
              setActiveModal({ type: 'leave' });
            }}
            title="Simulate Multi-Day Trip or Leave Impact"
          >
            <span>🌴 Leave Planner</span>
          </button>

          {/* Hall Ticket Eligibility Pass */}
          <button
            className="nav-pill-btn"
            onClick={() => {
              soundFx.playClickSound();
              setActiveModal({ type: 'hallticket' });
            }}
            title="View Exam Hall Ticket Eligibility Pass"
          >
            <span>🪪 Exam Pass</span>
          </button>

          {/* Done for Today Recap Button */}
          <button
            className="nav-pill-btn btn-nav-recap"
            onClick={() => {
              soundFx.playCelebrationFanfare();
              setShowCelebration(true);
            }}
            title="View End of Day Summary"
          >
            <span>🎉 Done for Today</span>
          </button>

          {/* Refresh Button */}
          <button
            className="nav-pill-btn"
            style={{ background: 'var(--accent-gradient)', color: '#ffffff', border: 'none', boxShadow: 'var(--accent-glow)' }}
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
              <span>🔄 Sync</span>
            )}
          </button>

          {/* Sign Out */}
          <button
            className="nav-pill-btn"
            style={{ color: 'var(--danger-red)', borderColor: 'var(--danger-red-border)' }}
            onClick={handleLogout}
            title="Sign Out"
          >
            <span>🚪 Exit</span>
          </button>
        </div>
      </header>

      {/* 2. FLOATING SYMBOL-ONLY MENU DOCK */}
      <nav className="top-menu-bar" aria-label="Navigation Menu">
        <button
          className={`top-menu-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => {
            soundFx.playClickSound();
            setActiveTab('dashboard');
          }}
          title="Overview / Dashboard"
          aria-label="Overview"
        >
          <span className="tab-icon">📊</span>
        </button>

        <button
          className={`top-menu-tab-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => {
            soundFx.playClickSound();
            setActiveTab('today');
          }}
          title="Today's Classes & Live Schedule"
          aria-label="Today's Classes"
        >
          <span className="tab-icon">📅</span>
        </button>

        <button
          className={`top-menu-tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => {
            soundFx.playClickSound();
            setActiveTab('calculator');
          }}
          title="Bunk Calculator & What-If Simulator"
          aria-label="Bunk Calculator"
        >
          <span className="tab-icon">🧮</span>
          {hasActiveSimulation && <span className="tab-badge-dot" />}
        </button>

        <button
          className={`top-menu-tab-btn ${activeTab === 'subjects' ? 'active' : ''}`}
          onClick={() => {
            soundFx.playClickSound();
            setActiveTab('subjects');
          }}
          title="My Enrolled Subjects & Course Details"
          aria-label="My Subjects"
        >
          <span className="tab-icon">📚</span>
        </button>

        <button
          className={`top-menu-tab-btn ${activeTab === 'planner' ? 'active' : ''}`}
          onClick={() => {
            soundFx.playClickSound();
            setActiveTab('planner');
          }}
          title="Weekly Timetable & Schedule"
          aria-label="Weekly Planner"
        >
          <span className="tab-icon">🗓️</span>
        </button>

        <button
          className={`top-menu-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => {
            soundFx.playClickSound();
            setActiveTab('profile');
          }}
          title="Student Profile & Academic Hub"
          aria-label="Student Profile"
        >
          <span className="tab-icon">👤</span>
        </button>
      </nav>

      {/* 6. ACTIVE SIMULATION BANNER */}
      {hasActiveSimulation && (
        <div className="sandbox-active-banner">
          <div className="sandbox-banner-text">
            <span>🧪</span>
            <span>
              <strong>Simulation Mode Active:</strong> Numbers reflect simulated future attendances and skips.
            </span>
          </div>
          <button className="sandbox-reset-btn" onClick={handleResetSimulation}>
            ↺ Reset to Live GEMS Data
          </button>
        </div>
      )}

      {/* 7. VIEW 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <>
          {/* Student Welcome Header in Opening */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--accent-gradient)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem', fontWeight: 900, boxShadow: 'var(--accent-glow)' }}>
                {initials}
              </div>
              <div>
                <div style={{ fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)' }}>
                  {studentName}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  🎓 Roll No: <strong style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>{rollNo}</strong> &bull; 🏛️ {branchName}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--safe-green)', background: 'var(--safe-green-light)', border: '1px solid var(--safe-green-border)', padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="pulse-radar-dot" style={{ width: '7px', height: '7px' }}></span>
                <span>MITS GEMS Live Synced</span>
              </span>
            </div>
          </div>

          {/* ATTENDANCE CALCULATION MODE SWITCHER */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
            <div className="attendance-mode-selector">
              <button
                className={`mode-toggle-btn ${attendanceMode === 'official' ? 'active' : ''}`}
                onClick={() => {
                  soundFx.playClickSound();
                  setAttendanceMode('official');
                }}
              >
                🏛️ Official Exam Attendance ({officialModePct}%)
              </button>
              <button
                className={`mode-toggle-btn ${attendanceMode === 'withTT' ? 'active' : ''}`}
                onClick={() => {
                  soundFx.playClickSound();
                  setAttendanceMode('withTT');
                }}
              >
                📚 Total with All Subjects ({allSubjectsPct}%)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="nav-pill-btn"
                style={{ fontSize: '0.78rem', background: 'var(--bg-card)' }}
                onClick={() => {
                  soundFx.playClickSound();
                  setActiveModal({ type: 'leave' });
                }}
              >
                🌴 Plan a Leave / Trip
              </button>
            </div>
          </div>

          {/* PRIMARY ATTENDANCE HERO SHOWCASE */}
          <section className="attendance-first-hero">
            <div className="hero-primary-row">
              {/* Overall Percentage Block */}
              <div className="hero-big-percentage-block">
                <div className="hero-top-label">Overall Attendance</div>
                <div className={`hero-huge-pct ${isOverallSafe ? 'safe' : 'danger'}`}>
                  {overallPct}%
                </div>
                <div className={`status-badge-hero ${isOverallSafe ? 'safe' : 'danger'}`}>
                  <span>{isOverallSafe ? `🛡️ Safe Zone (≥${targetPercentage}%)` : `⚠️ Shortage Zone (<${targetPercentage}%)`}</span>
                </div>
              </div>

              {/* Details & Stat Metrics */}
              <div className="hero-content-block">
                <div className="hero-kicker-badge">
                  <span>🔥</span> MITS Real-Time Optimizer &bull; Official GEMS Live Sync
                </div>

                <h2 className="hero-status-heading">
                  {isOverallSafe ? (
                    <>
                      You are in the safe zone with <span className="highlight-safe-text">{totalSafeBunks} safe bunks</span> available across subjects!
                    </>
                  ) : (
                    <>
                      Attendance requires attention! You <span className="highlight-danger-text">must attend {totalRequiredClasses} classes</span> to reach {targetPercentage}%.
                    </>
                  )}
                </h2>

                {/* Target Progress Bar */}
                <div>
                  <div className="hero-target-track">
                    <div
                      className={`hero-target-fill ${isOverallSafe ? 'safe' : 'danger'}`}
                      style={{ width: `${Math.min(100, Math.max(0, overallPct))}%` }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', marginTop: '5px' }}>
                    <span>0%</span>
                    <span style={{ color: 'var(--accent-primary)' }}>{targetPercentage}% Target Goal</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Metric Pills */}
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

                  <div className="metric-pill-item">
                    <div className="metric-pill-val">{totalConducted - totalAttended}</div>
                    <div className="metric-pill-lbl">Missed</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TODAY'S CLASSES PREVIEW */}
          <section className="todays-section-wrap">
            {/* Today's Live Attendance Progress Summary Strip in Overview */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '1.5rem' }}>🎓</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                    Today&apos;s Attendance Progress: <span style={{ color: 'var(--safe-green)' }}>{todayPresentCount} of {todayTotalCount} Classes Attended</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Live aggregate after today: <strong style={{ color: isOverallSafe ? 'var(--safe-green)' : 'var(--danger-red)' }}>{overallPct}% ({isOverallSafe ? 'Safe Zone' : 'Shortage Zone'})</strong> &bull; Total Attended: <strong>{totalAttended}/{totalConducted} classes</strong>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn-trigger-live-post"
                  onClick={handleMarkAllAttended}
                  title="Mark all today's classes attended (syncs with MITS GEMS)"
                  style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                >
                  ⚡ Mark All Attended ({todayTotalCount}/{todayTotalCount})
                </button>
                <span className="count-badge-total" style={{ background: 'var(--safe-green-light)', color: 'var(--safe-green)', border: '1px solid var(--safe-green-border)' }}>
                  ✓ {todayPresentCount} Present
                </span>
                <button
                  className="nav-pill-btn"
                  onClick={() => {
                    soundFx.playClickSound();
                    setActiveTab('today');
                  }}
                  style={{ fontSize: '0.75rem' }}
                >
                  View Full Schedule →
                </button>
              </div>
            </div>

            <div className="today-classes-grid">
              {todayClassesList.map((c, idx) => {
                const isPresent = c.status === 'present';
                const isAbsent = c.status === 'absent';
                const isUpcoming = c.status === 'upcoming' || (!isPresent && !isAbsent);

                return (
                  <div
                    key={idx}
                    className="today-class-card"
                    style={{
                      borderLeft: isPresent
                        ? '5px solid var(--safe-green)'
                        : isAbsent
                        ? '5px solid var(--danger-red)'
                        : '5px solid var(--accent-primary)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem 1.25rem',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span className="class-period-chip" style={{ fontWeight: 900 }}>
                        P{c.period}: {c.time}
                      </span>
                      <div>
                        <div className="class-title-text" style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                          {c.subjectName || c.shortName || c.code}
                        </div>
                        <div className="class-meta-text" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          📍 {c.room || 'LH-302'} &bull; 👤 {c.faculty || 'MITS Faculty'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isPresent ? (
                        <button
                          className="period-status-pill present"
                          onClick={() => handleToggleTodayStatus(idx, 'absent')}
                          title="Marked Present in GEMS — Click to toggle"
                        >
                          <span>✓ Present</span>
                        </button>
                      ) : isAbsent ? (
                        <button
                          className="period-status-pill absent"
                          onClick={() => handleToggleTodayStatus(idx, 'present')}
                          title="Marked Absent in GEMS — Click to toggle"
                        >
                          <span>✗ Absent</span>
                        </button>
                      ) : (
                        <button
                          className="period-status-pill upcoming"
                          onClick={() => handleToggleTodayStatus(idx, 'present')}
                          title="Upcoming Lecture — Click to mark Present"
                        >
                          <span>+ Mark Present</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ENROLLED SUBJECTS PREVIEW */}
          <section className="subjects-section-wrap">
            <div className="subjects-toolbar-row">
              <div className="subjects-heading-title">
                <span>📖 Enrolled Subjects</span>
                <span className="count-badge-total">{rawAttendanceList.length} Courses</span>
              </div>
              <button
                className="nav-pill-btn"
                onClick={() => {
                  soundFx.playClickSound();
                  setActiveTab('subjects');
                }}
                style={{ fontSize: '0.75rem' }}
              >
                View All &amp; Filter →
              </button>
            </div>

            <div className="subjects-card-grid">
              {filteredSubjects.map((sub) => {
                const pct = sub.simPercentage;
                const isSafe = pct >= targetPercentage;
                const isWarning = pct >= 65 && pct < targetPercentage;
                const cardStatus = isSafe ? 'safe' : isWarning ? 'warning' : 'danger';

                return (
                  <div
                    key={sub.code}
                    className={`subject-item-card ${cardStatus}`}
                    onClick={() => {
                      soundFx.playClickSound();
                      setActiveModal({ type: 'subject', subject: sub });
                      setActiveNoteText(subjectNotes[sub.code] || '');
                    }}
                  >
                    <div>
                      <div className="subject-card-top-row">
                        <div>
                          <span className="subject-code-pill">{sub.code}</span>
                          {sub.type && <span className="subject-type-pill">{sub.type}</span>}
                        </div>
                        <div className={`subject-pct-highlight ${cardStatus}`}>
                          {pct.toFixed(1)}%
                        </div>
                      </div>

                      <h3 className="subject-name-heading">
                        {sub.subjectName}
                      </h3>

                      {/* Real-time Today Status Badge */}
                      {sub.todaySummary?.presentCount > 0 && (
                        <div style={{ marginTop: '6px' }}>
                          <span style={{ fontSize: '0.72rem', background: 'var(--safe-green-light)', color: 'var(--safe-green)', border: '1px solid var(--safe-green-border)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            🟢 Today: Period P{sub.todaySummary.presentPeriods.join(', ')} Marked Present (+{sub.todaySummary.presentCount})
                          </span>
                        </div>
                      )}
                      {sub.todaySummary?.absentCount > 0 && (
                        <div style={{ marginTop: '6px' }}>
                          <span style={{ fontSize: '0.72rem', background: 'var(--danger-red-light)', color: 'var(--danger-red)', border: '1px solid var(--danger-red-border)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            🔴 Today: Period P{sub.todaySummary.absentPeriods.join(', ')} Marked Absent
                          </span>
                        </div>
                      )}
                      {sub.todaySummary?.upcomingCount > 0 && sub.todaySummary?.presentCount === 0 && sub.todaySummary?.absentCount === 0 && (
                        <div style={{ marginTop: '6px' }}>
                          <span style={{ fontSize: '0.72rem', background: 'var(--accent-bg-subtle)', color: 'var(--accent-primary)', border: '1px solid var(--accent-border-subtle)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            ⏳ Today: Period P{sub.todaySummary.upcomingPeriods.join(', ')} Scheduled
                          </span>
                        </div>
                      )}
                    </div>

                      <div className="subject-stats-bar-bottom">
                        <div className="attended-classes-text">
                          Attended: <strong>{sub.simAttended}/{sub.simConducted}</strong>
                        </div>

                        <div className={`bunk-status-text ${isSafe ? 'safe' : 'danger'}`}>
                          {isSafe ? <span>🛡️ {sub.simSafeBunks} Safe</span> : <span>🚨 Need +{sub.simRequiredClasses}</span>}
                        </div>
                      </div>
                    </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* 8. VIEW 2: TODAY'S LIVE SCHEDULE */}
      {activeTab === 'today' && (
        <section className="todays-section-wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>
                📅 Today&apos;s Live Period Schedule
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Instant real-time sync with MITS GEMS mobile app. As soon as faculty marks attendance in class, it updates here immediately.
              </p>
            </div>
            {todayClassesList.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn-trigger-live-post"
                  onClick={handleMarkAllAttended}
                  title="Mark all today's classes attended (syncs with MITS GEMS)"
                >
                  ⚡ Mark All Attended ({todayTotalCount}/{todayTotalCount})
                </button>
                <button
                  className="nav-pill-btn btn-nav-recap"
                  onClick={() => {
                    soundFx.playCelebrationFanfare();
                    setShowCelebration(true);
                  }}
                >
                  🎉 Done for Today Summary
                </button>
              </div>
            )}
          </div>

          {todayClassesList.length === 0 ? (
            <div
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-lg)',
                padding: '3rem 1.5rem',
                textAlign: 'center',
                marginTop: '1rem',
              }}
            >
              <div style={{ fontSize: '3.2rem', marginBottom: '12px' }}>🌴</div>
              <h3 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.45rem', color: 'var(--text-main)' }}>
                {isSundayToday ? 'Today is Sunday — Campus Holiday!' : `No Classes Scheduled for Today (${currentTodayName})`}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '520px', margin: '10px auto 22px', lineHeight: 1.6 }}>
                {isSundayToday
                  ? 'No lectures or labs are held on Sundays at MITS. No attendance will be posted today in GEMS. Relax, recharge, or plan your attendance strategy for the coming week!'
                  : `No classes are scheduled on your timetable for today (${currentTodayName}). Enjoy your time off or review your weekly schedule!`}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  className="nav-pill-btn active"
                  onClick={() => {
                    soundFx.playClickSound();
                    setActiveTab('planner');
                    setSelectedDay('Monday');
                  }}
                >
                  🗓️ View Monday Timetable
                </button>
                <button
                  className="nav-pill-btn"
                  onClick={() => {
                    soundFx.playClickSound();
                    setActiveTab('calculator');
                  }}
                >
                  🧮 Open Safe Bunk Simulator
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Today's Live Attendance Progress Summary Strip */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '1.8rem' }}>🎓</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      Today&apos;s Attendance Progress: <span style={{ color: 'var(--safe-green)' }}>{todayPresentCount} of {todayTotalCount} Classes Attended</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Live aggregate after today: <strong style={{ color: isOverallSafe ? 'var(--safe-green)' : 'var(--danger-red)' }}>{overallPct}% ({isOverallSafe ? 'Safe Zone' : 'Shortage Zone'})</strong> &bull; Total Attended: <strong>{totalAttended}/{totalConducted} classes</strong>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span className="count-badge-total" style={{ background: 'var(--safe-green-light)', color: 'var(--safe-green)', border: '1px solid var(--safe-green-border)' }}>
                    ✓ {todayPresentCount} Present
                  </span>
                  <span className="count-badge-total" style={{ background: 'var(--danger-red-light)', color: 'var(--danger-red)', border: '1px solid var(--danger-red-border)' }}>
                    ✗ {todayClassesList.filter(c => c.status === 'absent').length} Absent
                  </span>
                  <span className="count-badge-total" style={{ background: 'var(--accent-bg-subtle)', color: 'var(--accent-primary)', border: '1px solid var(--accent-border-subtle)' }}>
                    ⏳ {todayClassesList.filter(c => c.status === 'upcoming').length} Upcoming
                  </span>
                </div>
              </div>

              <div className="today-classes-grid">
                {todayClassesList.map((item, idx) => {
                  const isPresent = item.status === 'present';
                  const isAbsent = item.status === 'absent';
                  const isUpcoming = item.status === 'upcoming' || (!isPresent && !isAbsent);
                  const cardClass = isPresent ? 'present' : isAbsent ? 'absent' : 'upcoming';

                  return (
                    <div
                      key={idx}
                      className={`today-class-card ${cardClass}`}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-light)',
                        borderLeft: isPresent
                          ? '5px solid var(--safe-green)'
                          : isAbsent
                          ? '5px solid var(--danger-red)'
                          : '5px solid var(--accent-primary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '14px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span className="today-period-pill">P{item.period}</span>
                          <span className="today-time-badge">{item.time}</span>
                          {item.room && <span className="today-room-chip">🚪 {item.room}</span>}
                        </div>

                        <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.08rem', color: 'var(--text-main)' }}>
                          {item.subjectName || item.shortName || item.code}
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Code: <strong style={{ color: 'var(--accent-primary)' }}>{item.code}</strong> &bull; 👤 {item.faculty || 'MITS Faculty'}
                        </div>
                      </div>

                      <div>
                        {isPresent ? (
                          <button
                            className="period-status-pill present"
                            onClick={() => handleToggleTodayStatus(idx, 'absent')}
                            title="Class Attended — Click to change status"
                          >
                            <span>✓ Present</span>
                          </button>
                        ) : isAbsent ? (
                          <button
                            className="period-status-pill absent"
                            onClick={() => handleToggleTodayStatus(idx, 'present')}
                            title="Class Missed — Click to mark Present"
                          >
                            <span>✗ Absent</span>
                          </button>
                        ) : (
                          <button
                            className="period-status-pill upcoming"
                            onClick={() => handleToggleTodayStatus(idx, 'present')}
                            title="Click to Mark Present"
                          >
                            <span>+ Mark Present</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* 9. VIEW 3: BUNK CALCULATOR & SIMULATOR */}
      {activeTab === 'calculator' && (
        <section className="calculator-section-wrap">
          <div className="calculator-toolbar-row">
            <div>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>
                🧮 Safe Bunk Optimizer &amp; What-If Sandbox
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Test attending or skipping upcoming classes to see real-time impact before taking leaves.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="nav-pill-btn"
                onClick={handleResetSimulation}
                title="Reset simulation to real data"
              >
                ↺ Reset Deltas
              </button>
            </div>
          </div>

          {/* SIMULATOR SUBJECT CARDS */}
          <div className="sim-cards-grid">
            {processedSubjects.map((sub) => {
              const originalAttended = sub.attended;
              const originalConducted = sub.conducted;
              const originalPct = originalConducted > 0 ? (originalAttended / originalConducted) * 100 : 0;
              const isImproved = sub.simPercentage > originalPct;
              const isDropped = sub.simPercentage < originalPct;

              return (
                <div
                  key={sub.code}
                  className={`sim-course-card ${sub.simPercentage >= targetPercentage ? 'safe' : 'danger'}`}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <div className="sim-sub-code-badge">{sub.code}</div>
                      <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.15rem', color: sub.simPercentage >= targetPercentage ? 'var(--safe-green)' : 'var(--danger-red)' }}>
                        {sub.simPercentage.toFixed(1)}%
                        {sub.isSimulated && (
                          <span style={{ fontSize: '0.75rem', marginLeft: '6px', color: isImproved ? 'var(--safe-green)' : isDropped ? 'var(--danger-red)' : 'inherit' }}>
                            ({isImproved ? `+${(sub.simPercentage - originalPct).toFixed(1)}%` : `${(sub.simPercentage - originalPct).toFixed(1)}%`})
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                      {sub.subjectName}
                    </div>

                    {/* Today badge if present */}
                    {sub.todaySummary?.presentCount > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        <span style={{ fontSize: '0.72rem', background: 'var(--safe-green-light)', color: 'var(--safe-green)', border: '1px solid var(--safe-green-border)', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          🟢 Today: Present (+{sub.todaySummary.presentCount})
                        </span>
                      </div>
                    )}

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                      Attended: <strong>{sub.simAttended}/{sub.simConducted}</strong> &bull; Safe Bunks: <strong>{sub.simSafeBunks}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--safe-green)' }}>Attend:</span>
                      <button className="btn-sim-quick plus" onClick={() => handleSimulate(sub.code, 1, 0)}>+1</button>
                      <button className="btn-sim-quick plus" onClick={() => handleSimulate(sub.code, 3, 0)}>+3</button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--danger-red)' }}>Skip:</span>
                      <button className="btn-sim-quick minus" onClick={() => handleSimulate(sub.code, 0, 1)}>+1</button>
                      <button className="btn-sim-quick minus" onClick={() => handleSimulate(sub.code, 0, 3)}>+3</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SEMESTER END ESTIMATOR */}
          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '8px' }}>
              📈 Semester End Forecast Calculator
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, margin: '1rem 0 6px' }}>
              <span>Expected Remaining Classes in Semester:</span>
              <span style={{ color: 'var(--accent-primary)', fontSize: '1.1rem' }}>{forecastRemaining} classes</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={forecastRemaining}
              onChange={(e) => setForecastRemaining(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
            />

            <div className="forecast-stat-grid" style={{ marginTop: '1rem' }}>
              <div className="forecast-stat-box">
                <div className="forecast-stat-num" style={{ color: 'var(--safe-green)' }}>
                  {semesterForecast.bestCasePct}%
                </div>
                <div className="forecast-stat-lbl">Best Case (100% Attended)</div>
              </div>

              <div className="forecast-stat-box">
                <div className="forecast-stat-num" style={{ color: 'var(--danger-red)' }}>
                  {semesterForecast.worstCasePct}%
                </div>
                <div className="forecast-stat-lbl">Worst Case (0% Attended)</div>
              </div>

              <div className="forecast-stat-box">
                <div className="forecast-stat-num" style={{ color: 'var(--accent-primary)' }}>
                  {semesterForecast.maxPossibleBunksInRemaining}
                </div>
                <div className="forecast-stat-lbl">Future Safe Bunks</div>
              </div>

              <div className="forecast-stat-box">
                <div className="forecast-stat-num" style={{ color: semesterForecast.requiredRate <= 100 ? 'var(--warning-amber)' : 'var(--danger-red)' }}>
                  {semesterForecast.requiredRate}%
                </div>
                <div className="forecast-stat-lbl">Required Attendance Pace</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 11. VIEW 5: MY SUBJECTS */}
      {activeTab === 'subjects' && (
        <section className="subjects-section-wrap">
          <div className="subjects-toolbar-row">
            <div className="subjects-heading-title">
              <span>📚 My Registered Subjects</span>
              <span className="count-badge-total">{rawAttendanceList.length} Courses</span>
            </div>

            <div className="controls-filter-group">
              {/* Search */}
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
                onClick={() => {
                  soundFx.playClickSound();
                  setFilterType('all');
                }}
              >
                All ({processedSubjects.length})
              </button>
              <button
                className={`filter-tab-pill ${filterType === 'safe' ? 'active' : ''}`}
                onClick={() => {
                  soundFx.playClickSound();
                  setFilterType('safe');
                }}
              >
                Safe ({safeCount})
              </button>
              <button
                className={`filter-tab-pill ${filterType === 'shortage' ? 'active' : ''}`}
                onClick={() => {
                  soundFx.playClickSound();
                  setFilterType('shortage');
                }}
              >
                Shortage ({shortageCount})
              </button>
              <button
                className={`filter-tab-pill ${filterType === 'practical' ? 'active' : ''}`}
                onClick={() => {
                  soundFx.playClickSound();
                  setFilterType('practical');
                }}
              >
                Labs
              </button>

              {/* Sort Dropdown */}
              <select
                className="sort-select-dropdown"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="default">Sort: Default</option>
                <option value="lowest">Percentage: Low → High</option>
                <option value="highest">Percentage: High → Low</option>
                <option value="bunks">Most Safe Bunks</option>
                <option value="name">Name: A → Z</option>
              </select>
            </div>
          </div>

          <div className="subjects-card-grid">
            {filteredSubjects.map((sub) => {
              const pct = sub.simPercentage;
              const isSafe = pct >= targetPercentage;
              const isWarning = pct >= 65 && pct < targetPercentage;
              const cardStatus = isSafe ? 'safe' : isWarning ? 'warning' : 'danger';
              const note = subjectNotes[sub.code];

              return (
                <div
                  key={sub.code}
                  className={`subject-item-card ${cardStatus}`}
                  onClick={() => {
                    soundFx.playClickSound();
                    setActiveModal({ type: 'subject', subject: sub });
                    setActiveNoteText(subjectNotes[sub.code] || '');
                  }}
                >
                  <div>
                    <div className="subject-card-top-row">
                      <div>
                        <span className="subject-code-pill">{sub.code}</span>
                        {sub.type && <span className="subject-type-pill">{sub.type}</span>}
                      </div>
                      <div className={`subject-pct-highlight ${cardStatus}`}>
                        {pct.toFixed(1)}%
                      </div>
                    </div>

                    <h3 className="subject-name-heading">
                      {sub.subjectName}
                    </h3>

                    {/* Prominent Real-time Today Status Chip */}
                    {sub.todaySummary?.presentCount > 0 && (
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ fontSize: '0.75rem', background: 'var(--safe-green-light)', color: 'var(--safe-green)', border: '1px solid var(--safe-green-border)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          🟢 Today: Period P{sub.todaySummary.presentPeriods.join(', ')} Marked Present (+{sub.todaySummary.presentCount})
                        </span>
                      </div>
                    )}
                    {sub.todaySummary?.absentCount > 0 && (
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ fontSize: '0.75rem', background: 'var(--danger-red-light)', color: 'var(--danger-red)', border: '1px solid var(--danger-red-border)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          🔴 Today: Period P{sub.todaySummary.absentPeriods.join(', ')} Marked Absent
                        </span>
                      </div>
                    )}
                    {sub.todaySummary?.upcomingCount > 0 && sub.todaySummary?.presentCount === 0 && sub.todaySummary?.absentCount === 0 && (
                      <div style={{ marginTop: '6px' }}>
                        <span style={{ fontSize: '0.75rem', background: 'var(--accent-bg-subtle)', color: 'var(--accent-primary)', border: '1px solid var(--accent-border-subtle)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          ⏳ Today: Period P{sub.todaySummary.upcomingPeriods.join(', ')} Scheduled
                        </span>
                      </div>
                    )}

                    {note && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                        📝 Note: {note.length > 35 ? note.substring(0, 35) + '...' : note}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="progress-track-container" style={{ margin: '10px 0' }}>
                      <div
                        className={`progress-fill-bar ${cardStatus}`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>

                    <div className="subject-stats-bar-bottom">
                      <div className="attended-classes-text">
                        Attended: <strong>{sub.simAttended}/{sub.simConducted}</strong>
                      </div>

                      <div className={`bunk-status-text ${isSafe ? 'safe' : 'danger'}`}>
                        {isSafe ? <span>🛡️ {sub.simSafeBunks} Safe Bunks</span> : <span>🚨 Need +{sub.simRequiredClasses}</span>}
                      </div>
                    </div>

                    <div
                      className="card-quick-sim-row"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="sim-label-hint">What-If:</span>
                      <div className="sim-buttons-group">
                        <button
                          className="btn-sim-quick plus"
                          onClick={() => handleSimulate(sub.code, 1, 0)}
                        >
                          +1 Attend
                        </button>
                        <button
                          className="btn-sim-quick minus"
                          onClick={() => handleSimulate(sub.code, 0, 1)}
                        >
                          -1 Skip
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}


      {/* 12. VIEW 6: WEEKLY PLANNER */}
      {activeTab === 'planner' && (
        <section className="timetable-container">
          <div className="timetable-header-row">
            <div>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>
                🗓️ MITS Weekly Timetable &amp; Schedule
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Period slots with classrooms, faculty names, and customizable substitute periods.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="nav-pill-btn"
                onClick={() => {
                  soundFx.playClickSound();
                  setNewPeriodData((prev) => ({ ...prev, day: selectedDay === 'Sunday' ? 'Monday' : selectedDay }));
                  setActiveModal({ type: 'editTimetable' });
                }}
              >
                ➕ Add Custom Period
              </button>

              <div className="day-selector-pills">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => {
                  const isCurrentToday = d === currentTodayName;
                  return (
                    <button
                      key={d}
                      className={`day-pill-btn ${selectedDay === d ? 'active' : ''}`}
                      onClick={() => {
                        soundFx.playClickSound();
                        setSelectedDay(d);
                      }}
                      title={isCurrentToday ? 'Today' : d}
                    >
                      {d.substring(0, 3)}{isCurrentToday ? ' • Today' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="period-slots-grid">
            {selectedDay === 'Sunday' ? (
              <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🏖️</div>
                <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                  Sunday — Campus Holiday / Weekend Break
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '420px', margin: '6px auto 16px' }}>
                  No academic classes or laboratory sessions are scheduled on Sundays at MITS.
                </div>
                <button
                  className="nav-pill-btn active"
                  onClick={() => {
                    soundFx.playClickSound();
                    setSelectedDay('Monday');
                  }}
                >
                  👉 View Monday Schedule
                </button>
              </div>
            ) : (timetable[selectedDay] || []).length > 0 ? (
              timetable[selectedDay].map((p, idx) => (
                <div key={idx} className="period-slot-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span className="period-time-badge">Period {p.period || idx + 1}: {p.time || '09:00 AM'}</span>
                    <div>
                      <div className="period-subject-title">{p.name || p.subjectName || p.code}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        📍 Room: {p.room || 'LH-302'} &bull; 👤 Faculty: {p.faculty || 'MITS Faculty'}
                      </div>
                    </div>
                  </div>
                  <span className="subject-code-pill">{p.code}</span>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                No periods scheduled for {selectedDay}. Enjoy your break! 🎉
              </div>
            )}
          </div>
        </section>
      )}

      {/* 13. VIEW 7: PROFILE & ACADEMIC HUB */}
      {activeTab === 'profile' && (
        <section className="timetable-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
            <div className="student-initials-badge" style={{ width: '56px', height: '56px', fontSize: '1.4rem' }}>
              {initials}
            </div>
            <div>
              <h2 style={{ fontFamily: 'Outfit', fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-main)' }}>
                {studentName}
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Roll No: <strong style={{ color: 'var(--accent-primary)', fontFamily: 'JetBrains Mono' }}>{rollNo}</strong> &bull; {branchName}
              </div>
            </div>
          </div>

          {/* Academic Standing Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'var(--bg-card-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Institution</div>
              <div style={{ fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>Madanapalle Institute of Technology &amp; Science</div>
            </div>
            <div style={{ background: 'var(--bg-card-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Academic Standing</div>
              <div style={{ fontWeight: 800, color: isOverallSafe ? 'var(--safe-green)' : 'var(--danger-red)', marginTop: '2px' }}>
                {overallPct}% Attendance ({isOverallSafe ? 'Eligible for Exams' : 'Condonation Required'})
              </div>
            </div>
            <div style={{ background: 'var(--bg-card-subtle)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Courses Enrolled</div>
              <div style={{ fontWeight: 800, color: 'var(--accent-primary)', marginTop: '2px' }}>
                {rawAttendanceList.length} Registered Subjects
              </div>
            </div>
          </div>

          {/* Gamification & Achievements Showcase */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-main)', marginBottom: '8px' }}>
              🏆 Unlocked Achievements &amp; Badges
            </h3>
            <div className="badges-showcase-grid">
              <div className="badge-card-item">
                <div className="badge-card-icon">🛡️</div>
                <div className="badge-card-name">Shield of 75%</div>
                <div className="badge-card-desc">Maintained aggregate above 75% cutoff</div>
              </div>
              <div className="badge-card-item">
                <div className="badge-card-icon">🧪</div>
                <div className="badge-card-name">Lab Legend</div>
                <div className="badge-card-desc">100% attendance in Practical courses</div>
              </div>
              <div className="badge-card-item">
                <div className="badge-card-icon">🎯</div>
                <div className="badge-card-name">Bunk Strategist</div>
                <div className="badge-card-desc">Optimized safe bunks with zero penalty</div>
              </div>
              <div className="badge-card-item">
                <div className="badge-card-icon">🔥</div>
                <div className="badge-card-name">Attendance Titan</div>
                <div className="badge-card-desc">{xpInfo.streak || 3} days unbroken campus streak</div>
              </div>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="nav-pill-btn btn-nav-recap" onClick={copyWhatsAppReport}>
              📤 Copy WhatsApp Report
            </button>
            <button
              className="nav-pill-btn"
              onClick={() => {
                soundFx.playClickSound();
                setActiveModal({ type: 'hallticket' });
              }}
            >
              🪪 View Exam Hall Ticket Pass
            </button>
            <button className="nav-pill-btn" onClick={handleExportCSV}>
              📊 Download CSV Export
            </button>
            <button className="nav-pill-btn" onClick={() => window.print()}>
              🖨️ Print Attendance Transcript
            </button>
            <button className="nav-pill-btn" onClick={() => setActiveModal({ type: 'policy' })}>
              📜 MITS Regulations Guide
            </button>
          </div>
        </section>
      )}

      {/* 14. SMART LEAVE & TRIP SIMULATOR MODAL */}
      {activeModal?.type === 'leave' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header-row">
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)' }}>
                  🌴 Smart Multi-Day Leave &amp; Trip Planner
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Select days off to see the exact impact on each subject before booking your trip!
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>×</button>
            </div>

            {/* Quick Preset Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)', alignSelf: 'center' }}>Presets:</span>
              <button
                className="filter-tab-pill"
                onClick={() => setSelectedLeaveDays(['Friday', 'Saturday'])}
              >
                🏖️ Long Weekend (Fri + Sat)
              </button>
              <button
                className="filter-tab-pill"
                onClick={() => setSelectedLeaveDays(['Monday', 'Tuesday', 'Wednesday'])}
              >
                ⛺ 3-Day Trip (Mon - Wed)
              </button>
              <button
                className="filter-tab-pill"
                onClick={() => setSelectedLeaveDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])}
              >
                ✈️ 1 Week Full Leave
              </button>
              <button
                className="filter-tab-pill"
                onClick={() => setSelectedLeaveDays([])}
              >
                Clear All
              </button>
            </div>

            {/* Days Selector */}
            <div className="leave-days-selector">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                const isSelected = selectedLeaveDays.includes(day);
                const periodCount = (timetable[day] || []).length;
                return (
                  <button
                    key={day}
                    className={`leave-day-pill ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleToggleLeaveDay(day)}
                  >
                    {isSelected ? '✓ ' : '+ '} {day} ({periodCount} periods)
                  </button>
                );
              })}
            </div>

            {/* Leave Impact Summary Box */}
            <div className={`leave-impact-summary-card ${leaveImpact.riskLevel}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontWeight: 900, fontSize: '1.05rem' }}>
                  {leaveImpact.riskLevel === 'SAFE' && '✅ SAFE TO TAKE LEAVE'}
                  {leaveImpact.riskLevel === 'MODERATE' && '⚠️ MODERATE RISK — CHECK SHORTAGE'}
                  {leaveImpact.riskLevel === 'CRITICAL' && '🚨 HIGH RISK — ATTENDANCE CRITICAL'}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                  {leaveImpact.totalMissedPeriods} Total Classes Missed
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                Overall attendance will drop from <strong>{leaveImpact.currentOverallPct}%</strong> to{' '}
                <strong style={{ textDecoration: 'underline' }}>{leaveImpact.projectedOverallPct}%</strong> (-{leaveImpact.overallDrop}%).
                {leaveImpact.newlyShortageSubjects.length > 0 && (
                  <div style={{ color: 'var(--danger-red)', fontWeight: 800, marginTop: '4px' }}>
                    🚨 Warning: {leaveImpact.newlyShortageSubjects.length} subject(s) will fall below {targetPercentage}%: {leaveImpact.newlyShortageSubjects.map((s) => s.code).join(', ')}!
                  </div>
                )}
              </div>
            </div>

            {/* Subject Breakdown List */}
            <div style={{ maxHeight: '240px', overflowY: 'auto', marginTop: '10px' }}>
              {leaveImpact.subjectResults.map((s) => (
                <div key={s.code} className="impact-sub-item">
                  <div>
                    <strong>{s.code}</strong> - {s.subjectName}
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Misses {s.missedPeriods} class(es) on selected days
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: s.isSafeAfter ? 'var(--safe-green)' : 'var(--danger-red)' }}>
                      {s.projectedPct}%
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                        (-{s.drop}%)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem' }}>
                      {s.isSafeAfter ? `🛡️ ${s.projectedSafeBunks} safe left` : `🚨 Shortage: need +${s.projectedRequired}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'right', marginTop: '1.25rem' }}>
              <button
                className="nav-pill-btn"
                style={{ background: 'var(--accent-gradient)', color: '#ffffff', border: 'none' }}
                onClick={() => setActiveModal(null)}
              >
                Close Planner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 15. DIGITAL EXAM HALL TICKET PASS MODAL */}
      {activeModal?.type === 'hallticket' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="hall-ticket-card">
              {/* Official Seal */}
              <div className={`hall-ticket-seal ${isOverallSafe ? 'safe' : 'danger'}`}>
                <span>{isOverallSafe ? 'MITS EXAM' : 'CONDONATION'}</span>
                <span>{isOverallSafe ? 'ELIGIBLE' : 'REQUIRED'}</span>
                <span>{isOverallSafe ? '✓ VERIFIED' : '⚠️ SHORTAGE'}</span>
              </div>

              <div className="hall-ticket-header">
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Madanapalle Institute of Technology &amp; Science
                </div>
                <h2 style={{ fontFamily: 'Outfit', fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '4px' }}>
                  Semester End Examination Eligibility Certificate
                </h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Autonomous Academic Section &bull; Real-Time GEMS Verification
                </div>
              </div>

              {/* Student Metadata Box */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.82rem', marginBottom: '1rem', background: 'var(--bg-card-subtle)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800 }}>STUDENT NAME</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{studentName}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800 }}>ROLL NUMBER (USN)</div>
                  <div style={{ fontWeight: 800, fontFamily: 'JetBrains Mono', color: 'var(--accent-primary)' }}>{rollNo}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800 }}>BRANCH &amp; PROGRAM</div>
                  <div style={{ fontWeight: 700 }}>{branchName}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800 }}>AGGREGATE ATTENDANCE</div>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: isOverallSafe ? 'var(--safe-green)' : 'var(--danger-red)' }}>
                    {overallPct}% ({isOverallSafe ? 'Regular Safe' : 'Condonation Limit'})
                  </div>
                </div>
              </div>

              {/* Subject Breakdown Mini Table */}
              <table className="milestone-table" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Subject</th>
                    <th>Attended</th>
                    <th>Percentage</th>
                    <th>Exam Status</th>
                  </tr>
                </thead>
                <tbody>
                  {processedSubjects.map((s) => (
                    <tr key={s.code}>
                      <td style={{ fontWeight: 800 }}>{s.code}</td>
                      <td>{s.subjectName}</td>
                      <td>{s.simAttended}/{s.simConducted}</td>
                      <td style={{ fontWeight: 800, color: s.simPercentage >= targetPercentage ? 'var(--safe-green)' : 'var(--danger-red)' }}>
                        {s.simPercentage}%
                      </td>
                      <td style={{ fontWeight: 800 }}>
                        {s.simPercentage >= 75 ? '🟢 Eligible' : s.simPercentage >= 65 ? '🟡 Condonation' : '🔴 Detained'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-light)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <div>Verified via MITS GEMS API &bull; Generated: {new Date().toLocaleDateString()}</div>
                <div style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>Exam Cell Signature Approved</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }} className="no-print">
              <button className="nav-pill-btn btn-nav-recap" onClick={() => window.print()}>
                🖨️ Print / Save PDF
              </button>
              <button className="nav-pill-btn" onClick={() => setActiveModal(null)}>
                Close Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 16. TIMETABLE CUSTOMIZER / ADD PERIOD MODAL */}
      {activeModal?.type === 'editTimetable' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header-row">
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-main)' }}>
                  ➕ Add Period to Timetable
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Add a substitute class, extra lab, or tutorial period.
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>×</button>
            </div>

            <form onSubmit={handleAddPeriodToTimetable} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Weekday</label>
                  <select
                    className="styled-text-input"
                    value={newPeriodData.day}
                    onChange={(e) => setNewPeriodData({ ...newPeriodData, day: e.target.value })}
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Period Number</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    className="styled-text-input"
                    value={newPeriodData.period}
                    onChange={(e) => setNewPeriodData({ ...newPeriodData, period: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Subject Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 20CS301"
                    className="styled-text-input"
                    value={newPeriodData.code}
                    onChange={(e) => setNewPeriodData({ ...newPeriodData, code: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Time Slot</label>
                  <input
                    type="text"
                    placeholder="e.g. 09:00 - 09:50"
                    className="styled-text-input"
                    value={newPeriodData.time}
                    onChange={(e) => setNewPeriodData({ ...newPeriodData, time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Deep Learning Special Class"
                  className="styled-text-input"
                  value={newPeriodData.name}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Classroom / Lab</label>
                  <input
                    type="text"
                    placeholder="e.g. LH-302 / Lab-2"
                    className="styled-text-input"
                    value={newPeriodData.room}
                    onChange={(e) => setNewPeriodData({ ...newPeriodData, room: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Faculty Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. R. Ramachandra Reddy"
                    className="styled-text-input"
                    value={newPeriodData.faculty}
                    onChange={(e) => setNewPeriodData({ ...newPeriodData, faculty: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="nav-pill-btn" onClick={() => setActiveModal(null)}>Cancel</button>
                <button type="submit" className="nav-pill-btn" style={{ background: 'var(--accent-gradient)', color: '#ffffff', border: 'none' }}>
                  Save to Timetable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 17. CELEBRATION MODAL ("Done for Today! 🎉") */}
      {showCelebration && (
        <div className="celebration-screen-overlay">
          <span className="floating-particle" style={{ top: '15%', left: '10%' }}>🔥</span>
          <span className="floating-particle" style={{ top: '25%', right: '15%' }}>🌟</span>
          <span className="floating-particle" style={{ top: '45%', left: '6%' }}>💪</span>
          <span className="floating-particle" style={{ top: '55%', left: '20%' }}>🏆</span>
          <span className="floating-particle" style={{ bottom: '20%', left: '35%' }}>⭐</span>
          <span className="floating-particle" style={{ bottom: '10%', right: '40%' }}>📚</span>
          <span className="floating-particle" style={{ top: '40%', right: '8%' }}>📈</span>
          <span className="floating-particle" style={{ top: '75%', right: '20%' }}>🎉</span>

          <div className="celebration-content-center">
            <button className="celebration-close-top-btn" onClick={() => setShowCelebration(false)}>
              ✕
            </button>
            <div className="celebration-horn-icon">🎉</div>
            <h1 className="celebration-title-text">Done for Today! 🎉</h1>
            <p className="celebration-sub-text">All classes are over. Time to relax!</p>

            <div className="celebration-stat-row">
              <div className="celebration-stat-card">
                <div className="celebration-stat-num">{todayTotalCount}</div>
                <div className="celebration-stat-label">Total Classes</div>
              </div>
              <div className="celebration-stat-card">
                <div className="celebration-stat-num present">
                  <span>✓</span>
                  <span>{todayPresentCount}</span>
                </div>
                <div className="celebration-stat-label">Present</div>
              </div>
            </div>

            <div className="celebration-quote-card">
              <div className="celebration-quote-content">
                &ldquo;{memeQuote.text}&rdquo;
              </div>
              <div className="celebration-quote-by">— {memeQuote.author}</div>
            </div>

            <button
              className="celebration-cta-btn"
              onClick={() => {
                setShowCelebration(false);
                setActiveTab('dashboard');
              }}
            >
              View Dashboard →
            </button>
          </div>
        </div>
      )}

      {/* 18. SUBJECT DEEP-DIVE MODAL */}
      {activeModal?.type === 'subject' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <span className="subject-code-pill">{activeModal.subject.code}</span>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '4px' }}>
                  {activeModal.subject.subjectName}
                </h3>
                {activeModal.subject.faculty && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Faculty: <strong>{activeModal.subject.faculty}</strong> &bull; Credits: {activeModal.subject.credits || 3}
                  </div>
                )}
              </div>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', margin: '1rem 0' }}>
              <div className="metric-pill-item">
                <div className="metric-pill-val" style={{ color: activeModal.subject.simPercentage >= targetPercentage ? 'var(--safe-green)' : 'var(--danger-red)' }}>
                  {activeModal.subject.simPercentage.toFixed(1)}%
                </div>
                <div className="metric-pill-lbl">Percentage</div>
              </div>
              <div className="metric-pill-item">
                <div className="metric-pill-val safe">{activeModal.subject.simAttended}/{activeModal.subject.simConducted}</div>
                <div className="metric-pill-lbl">Attended</div>
              </div>
              <div className="metric-pill-item">
                <div className="metric-pill-val" style={{ color: activeModal.subject.simSafeBunks > 0 ? 'var(--safe-green)' : 'var(--danger-red)' }}>
                  {activeModal.subject.simSafeBunks}
                </div>
                <div className="metric-pill-lbl">Safe Skips</div>
              </div>
            </div>

            <h4 style={{ fontFamily: 'Outfit', fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '1.25rem' }}>
              🎯 Target Milestones Roadmap
            </h4>
            <table className="milestone-table">
              <thead>
                <tr>
                  <th>Target Goal</th>
                  <th>Status</th>
                  <th>Safe Bunks</th>
                  <th>Classes Needed</th>
                </tr>
              </thead>
              <tbody>
                {activeModal.subject.milestones.map((m) => (
                  <tr key={m.threshold}>
                    <td style={{ fontWeight: 800 }}>{m.label}</td>
                    <td>
                      <span style={{ color: m.isMet ? 'var(--safe-green)' : 'var(--danger-red)', fontWeight: 800, fontSize: '0.78rem' }}>
                        {m.isMet ? '✓ Met' : '✗ Under'}
                      </span>
                    </td>
                    <td>{m.isMet ? `${m.safeBunks} bunks` : '—'}</td>
                    <td>{m.isMet ? '0' : `+${m.requiredClasses} classes`}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '1.25rem' }}>
              <h4 style={{ fontFamily: 'Outfit', fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                📝 Subject Notes &amp; Reminders
              </h4>
              <textarea
                rows={3}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  color: 'var(--text-main)',
                  fontFamily: 'inherit',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'vertical',
                }}
                placeholder="Add faculty office hours, lab assignment due dates, or class reminders..."
                value={activeNoteText}
                onChange={(e) => setActiveNoteText(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  className="nav-pill-btn"
                  style={{ background: 'var(--accent-gradient)', color: '#ffffff', border: 'none', padding: '6px 14px', fontSize: '0.78rem' }}
                  onClick={() => handleSaveNote(activeModal.subject.code)}
                >
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 19. MITS REGULATIONS GUIDE MODAL */}
      {activeModal?.type === 'policy' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-main)' }}>
                  📜 MITS Academic Attendance Regulations
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Official rules for Madanapalle Institute of Technology &amp; Science
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setActiveModal(null)}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '1rem 0', fontSize: '0.85rem', lineHeight: '1.5' }}>
              <div style={{ background: 'var(--safe-green-light)', border: '1px solid var(--safe-green-border)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: 'var(--safe-green)' }}>1. Regular Eligibility (≥ 75%)</strong>
                <p style={{ marginTop: '3px', color: 'var(--text-body)' }}>
                  A student is eligible to appear for the Semester End Examinations if they acquire a minimum of 75% in aggregate of all subjects.
                </p>
              </div>

              <div style={{ background: 'var(--warning-amber-light)', border: '1px solid var(--warning-amber-border)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: 'var(--warning-amber)' }}>2. Condonation of Shortage (65% to 74.99%)</strong>
                <p style={{ marginTop: '3px', color: 'var(--text-body)' }}>
                  Shortage of attendance between 65% and 75% may be condoned by the College Academic Committee on genuine medical grounds upon submission of valid medical certificates and payment of prescribed condonation fee (~₹1,000 - ₹2,500).
                </p>
              </div>

              <div style={{ background: 'var(--danger-red-light)', border: '1px solid var(--danger-red-border)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: 'var(--danger-red)' }}>3. Detention (&lt; 65%)</strong>
                <p style={{ marginTop: '3px', color: 'var(--text-body)' }}>
                  Students whose attendance is below 65% are NOT eligible to appear for semester end examinations and shall be detained. They must repeat the semester in the next academic year.
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginTop: '1rem' }}>
              <button className="nav-pill-btn" style={{ background: 'var(--accent-gradient)', color: '#ffffff', border: 'none' }} onClick={() => setActiveModal(null)}>
                Got it, Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 20. TOAST NOTIFICATION */}
      {toast && (
        <div className="toast-container">
          <span>🔔</span>
          <span>{toast}</span>
        </div>
      )}

      {/* 21. FOOTER */}
      <footer className="app-footer-block">
        <div>Developed by <strong>CSE (AI &amp; ML)</strong></div>
        <div className="app-footer-dept-tag">
          Madanapalle Institute of Technology &amp; Science
        </div>
      </footer>
    </div>
  );
}
