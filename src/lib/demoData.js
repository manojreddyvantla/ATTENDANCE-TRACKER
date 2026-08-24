/**
 * Realistic Demo & MITS GEMS Student Dataset
 * Tailored for Madanapalle Institute of Technology & Science (MITS)
 */

export const MEME_QUOTES = [
  { text: "Today's classes: ✅ Done. Tomorrow's excuse: Loading...", author: "Meme energy" },
  { text: "Attendance is like phone battery: Keep it above 75% or enter low power panic mode!", author: "Hostel Wisdom" },
  { text: "Faculty said: 'Attendance is mandatory.' Heart said: 'Canteen samosa is calling.'", author: "MITS Lore" },
  { text: "One does not simply bunk an 8:30 AM class without 5 alarm snoozes.", author: "CSE Legends" },
  { text: "Proxy failed, detention averted, chai at main gate secured.", author: "Campus Diaries" },
  { text: "75% is not just a percentage, it's an emotion and exam hall ticket entry pass.", author: "Exam Cell" },
  { text: "Attending 1st hour for attendance, staying till 4th hour for lunch gossip.", author: "Backbencher Chronicle" },
  { text: "Calculated: If I bunk 2 classes today, I will have exactly 75.01%. Playing with fire!", author: "Bunk Optimizer Math" },
  { text: "Lab external examiner arrives: Everyone suddenly becomes the most obedient researcher in Asia.", author: "Admin Block Tales" },
  { text: "Condonation fee is ₹2000... Or I could just attend 3 classes and eat 50 biryanis.", author: "Campus Economics" },
  { text: "When you walk into class at 9:02 AM and faculty makes eye contact with the register.", author: "Heart Rate 180 BPM" },
];

const DEFAULT_TIMETABLE = {
  Monday: [
    { period: 1, time: '09:00 - 09:50', code: '20CS301', name: 'Deep Learning', room: 'LH-302', faculty: 'Dr. R. Ramachandra Reddy' },
    { period: 2, time: '09:50 - 10:40', code: '20CS302', name: 'Cloud Computing', room: 'LH-302', faculty: 'Dr. M. Sravan Kumar' },
    { period: 3, time: '10:50 - 11:40', code: '20CS303', name: 'Compiler Design', room: 'LH-304', faculty: 'Prof. K. Venkatesh' },
    { period: 4, time: '11:40 - 12:30', code: '20CS304', name: 'AI Ethics', room: 'LH-302', faculty: 'Dr. B. Lakshmi Prasanna' },
    { period: 5, time: '01:30 - 04:10', code: '20CS306', name: 'Deep Learning Lab', room: 'AI Lab-2', faculty: 'Dr. R. Ramachandra Reddy' },
  ],
  Tuesday: [
    { period: 1, time: '09:00 - 09:50', code: '20CS305', name: 'Full Stack Web', room: 'LH-302', faculty: 'Prof. S. Suresh Babu' },
    { period: 2, time: '09:50 - 10:40', code: '20CS301', name: 'Deep Learning', room: 'LH-302', faculty: 'Dr. R. Ramachandra Reddy' },
    { period: 3, time: '10:50 - 11:40', code: '20CS302', name: 'Cloud Computing', room: 'LH-302', faculty: 'Dr. M. Sravan Kumar' },
    { period: 4, time: '11:40 - 12:30', code: '20CS303', name: 'Compiler Design', room: 'LH-304', faculty: 'Prof. K. Venkatesh' },
    { period: 5, time: '01:30 - 02:20', code: '20CS304', name: 'AI Ethics', room: 'LH-302', faculty: 'Dr. B. Lakshmi Prasanna' },
    { period: 6, time: '02:20 - 03:10', code: '20CS305', name: 'Full Stack Web', room: 'LH-302', faculty: 'Prof. S. Suresh Babu' },
  ],
  Wednesday: [
    { period: 1, time: '09:00 - 09:50', code: '20CS303', name: 'Compiler Design', room: 'LH-304', faculty: 'Prof. K. Venkatesh' },
    { period: 2, time: '09:50 - 10:40', code: '20CS305', name: 'Full Stack Web', room: 'LH-302', faculty: 'Prof. S. Suresh Babu' },
    { period: 3, time: '10:50 - 11:40', code: '20CS301', name: 'Deep Learning', room: 'LH-302', faculty: 'Dr. R. Ramachandra Reddy' },
    { period: 4, time: '11:40 - 12:30', code: '20CS302', name: 'Cloud Computing', room: 'LH-302', faculty: 'Dr. M. Sravan Kumar' },
    { period: 5, time: '01:30 - 04:10', code: '20CS307', name: 'Cloud DevOps Lab', room: 'Cloud Lab-1', faculty: 'Dr. M. Sravan Kumar' },
  ],
  Thursday: [
    { period: 1, time: '09:00 - 09:50', code: '20CS302', name: 'Cloud Computing', room: 'LH-302', faculty: 'Dr. M. Sravan Kumar' },
    { period: 2, time: '09:50 - 10:40', code: '20CS303', name: 'Compiler Design', room: 'LH-304', faculty: 'Prof. K. Venkatesh' },
    { period: 3, time: '10:50 - 11:40', code: '20CS304', name: 'AI Ethics', room: 'LH-302', faculty: 'Dr. B. Lakshmi Prasanna' },
    { period: 4, time: '11:40 - 12:30', code: '20CS305', name: 'Full Stack Web', room: 'LH-302', faculty: 'Prof. S. Suresh Babu' },
    { period: 5, time: '01:30 - 03:10', code: '20CS301', name: 'Deep Learning Tutorial', room: 'LH-302', faculty: 'Dr. R. Ramachandra Reddy' },
  ],
  Friday: [
    { period: 1, time: '09:00 - 09:50', code: '20CS301', name: 'Deep Learning', room: 'LH-302', faculty: 'Dr. R. Ramachandra Reddy' },
    { period: 2, time: '09:50 - 10:40', code: '20CS305', name: 'Full Stack Web', room: 'LH-302', faculty: 'Prof. S. Suresh Babu' },
    { period: 3, time: '10:50 - 11:40', code: '20CS303', name: 'Compiler Design', room: 'LH-304', faculty: 'Prof. K. Venkatesh' },
    { period: 4, time: '11:40 - 12:30', code: '20CS302', name: 'Cloud Computing', room: 'LH-302', faculty: 'Dr. M. Sravan Kumar' },
    { period: 5, time: '01:30 - 03:10', code: '20CS304', name: 'Seminar & Mentorship', room: 'Seminar Hall-1', faculty: 'Dr. B. Lakshmi Prasanna' },
  ],
  Saturday: [
    { period: 1, time: '09:00 - 10:40', code: '20CS305', name: 'Project / Coding Club', room: 'Lab-4', faculty: 'Prof. S. Suresh Babu' },
    { period: 2, time: '10:50 - 12:30', code: '20CS301', name: 'AI Hackathon Prep', room: 'AI Lab-2', faculty: 'Dr. R. Ramachandra Reddy' },
  ],
};

export function getDemoData() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istNow = new Date(utc + (3600000 * 5.5));
  const currentMinutes = istNow.getHours() * 60 + istNow.getMinutes();

  const dayOfWeekIndex = now.getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = dayNames[dayOfWeekIndex];
  const isSunday = dayOfWeekIndex === 0;

  const scheduledToday = isSunday ? [] : (DEFAULT_TIMETABLE[currentDayName] || []);
  const todaysClasses = scheduledToday.map((p, idx) => {
    const periodNum = p.period || idx + 1;
    // Parse time to minutes
    let startMin = (8 + periodNum) * 60;
    if (p.time) {
      const match = p.time.split('-')[0].trim().match(/(\d{1,2}):(\d{2})/);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        if (h >= 1 && h <= 5) h += 12;
        startMin = h * 60 + m;
      }
    }
    const endMin = startMin + 50;

    let status = 'pending';
    let rawStatus = 'NA';
    let tag = '⏳ NA (UPCOMING)';
    let postedAt = p.time.split('-')[0].trim();
    let postedBy = 'Awaiting Faculty Entry (GEMS Mobile App)';

    if (currentMinutes >= startMin && currentMinutes < endMin) {
      tag = '⏳ NA (CLASS IN PROGRESS)';
      postedAt = 'In Progress';
      postedBy = `${p.faculty || 'Faculty'} (GEMS Mobile App)`;
    } else if (currentMinutes >= endMin) {
      tag = '⏳ NA (AWAITING GEMS ENTRY)';
      postedAt = p.time.split('-')[0].trim();
      postedBy = 'Awaiting Faculty Entry (GEMS Mobile App)';
    }

    return {
      period: periodNum,
      time: p.time,
      code: p.code,
      shortName: p.name.split(' ')[0],
      subjectName: p.name,
      room: p.room,
      faculty: p.faculty || 'MITS Faculty',
      status: status,
      rawStatus: rawStatus,
      tag: tag,
      postedAt: postedAt,
      postedBy: postedBy,
      syncSource: 'MITS GEMS Live API',
    };
  });

  return {
    isDemo: true,
    student: {
      name: 'K. Manoj Kumar Reddy',
      rollNo: '24691A3365',
      branch: 'Computer Science & Engineering (AI & ML)',
      semester: 'VI Semester (B.Tech)',
      section: 'Section B',
      academicYear: '2025-2026',
      institution: 'Madanapalle Institute of Technology & Science',
      email: '24691a3365@mits.ac.in',
      avatar: '🎓',
    },
    username: '24691A3365',
    lastUpdated: new Date().toISOString(),
    currentDayName: currentDayName,
    isSunday: isSunday,
    xp: {
      total: 2450,
      level: 'Level 6: Attendance Titan',
      streak: 5,
      progress: 78,
    },
    overallAttendance: {
      attended: 182,
      conducted: 219,
      percentage: 83.11,
      label: 'Exact GEMS Attendance',
    },
    overallWithTT: {
      attended: 204,
      conducted: 243,
      percentage: 83.95,
      label: 'With Soft Skills & Aptitude',
    },
    todaysClasses: todaysClasses,
    initialTodaysClasses: todaysClasses,
    weeklyTimetable: DEFAULT_TIMETABLE,
    defaultTimetable: DEFAULT_TIMETABLE,
    attendance: [
      {
        code: '20CS301',
        subjectName: 'Deep Learning & Neural Networks',
        type: 'Theory',
        attended: 38,
        conducted: 44,
        percentage: 86.36,
        safe_bunks: 6,
        faculty: 'Dr. R. Ramachandra Reddy',
        credits: 4,
        room: 'LH-302',
      },
      {
        code: '20CS302',
        subjectName: 'Cloud Computing & DevOps Architecture',
        type: 'Theory',
        attended: 29,
        conducted: 37,
        percentage: 78.38,
        safe_bunks: 1,
        faculty: 'Dr. M. Sravan Kumar',
        credits: 3,
        room: 'LH-302',
      },
      {
        code: '20CS303',
        subjectName: 'Compiler Design & Automata Theory',
        type: 'Theory',
        attended: 26,
        conducted: 38,
        percentage: 68.42,
        safe_bunks: 0,
        faculty: 'Prof. K. Venkatesh',
        credits: 3,
        room: 'LH-304',
      },
      {
        code: '20CS304',
        subjectName: 'AI Ethics, Governance & Cyber Laws',
        type: 'Theory',
        attended: 22,
        conducted: 24,
        percentage: 91.67,
        safe_bunks: 5,
        faculty: 'Dr. B. Lakshmi Prasanna',
        credits: 2,
        room: 'LH-302',
      },
      {
        code: '20CS305',
        subjectName: 'Full Stack Web Development (React & Node)',
        type: 'Integrated',
        attended: 35,
        conducted: 40,
        percentage: 87.50,
        safe_bunks: 6,
        faculty: 'Prof. S. Suresh Babu',
        credits: 4,
        room: 'Lab-4',
      },
      {
        code: '20CS306',
        subjectName: 'Deep Learning Practical Lab',
        type: 'Practical',
        attended: 18,
        conducted: 20,
        percentage: 90.00,
        safe_bunks: 4,
        faculty: 'Dr. R. Ramachandra Reddy',
        credits: 2,
        room: 'AI ML Lab-2',
      },
      {
        code: '20CS307',
        subjectName: 'Cloud Computing & DevOps Lab',
        type: 'Practical',
        attended: 14,
        conducted: 16,
        percentage: 87.50,
        safe_bunks: 2,
        faculty: 'Dr. M. Sravan Kumar',
        credits: 2,
        room: 'Cloud Lab-1',
      },
    ],
  };
}

export const MITS_DEMO_DATA = getDemoData();
