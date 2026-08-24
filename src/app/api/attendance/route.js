import { NextResponse } from 'next/server';

const MITS_BRANCH_CODES = {
  '01': 'Civil Engineering',
  '02': 'Electrical & Electronics Engineering',
  '03': 'Mechanical Engineering',
  '04': 'Electronics & Communication Engineering',
  '05': 'Computer Science & Engineering',
  '12': 'Information Technology',
  '25': 'Artificial Intelligence & Data Science',
  '31': 'Computer Science & Engineering (Cyber Security)',
  '32': 'Computer Science & Engineering (Data Science)',
  '33': 'Computer Science & Engineering (AI & ML)',
  '34': 'Computer Science & Engineering (IoT)',
  '35': 'Computer Science & Engineering (Networks)',
  '62': 'Computer Science & Design',
};

/**
 * Infer branch name from MITS roll number (e.g. 24691A3365 -> 33 -> AI & ML)
 */
function getBranchFromRoll(rollNo = '') {
  const clean = String(rollNo).trim().toUpperCase();
  // Typical MITS Roll No: 24691A3365, 23691A0501, 22695A0412
  const branchCode = clean.length >= 8 ? clean.substring(6, 8) : clean.substring(5, 7);
  return MITS_BRANCH_CODES[branchCode] || 'Computer Science & Engineering';
}

/**
 * Parse standard timetable time string to minutes from midnight (00:00)
 */
function parseTimeToMinutes(timeStr, periodNum = 1) {
  if (!timeStr) {
    const defaultHours = [9, 10, 11, 12, 14, 15, 16];
    const h = defaultHours[periodNum - 1] || (8 + periodNum);
    return h * 60;
  }
  const clean = timeStr.trim();
  const startPart = clean.split('-')[0].trim();
  const match = startPart.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const meridiem = match[3] ? match[3].toUpperCase() : null;
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    if (!meridiem) {
      if (hours >= 1 && hours <= 5) hours += 12;
    }
    return hours * 60 + mins;
  }
  return (8 + periodNum) * 60;
}

/**
 * Determine dynamic period attendance status (P = present / A = absent / NA = pending)
 * based on live current time, period timing, and official GEMS records.
 * Note: In MITS GEMS app, "NA" stands for Pending (Awaiting Faculty Entry).
 */
function evaluatePeriodStatus(timeStr, periodNum, faculty = 'MITS Faculty', subjectRecord = null, code = '', rawGemsStatus = 'NA') {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istNow = new Date(utc + (3600000 * 5.5));
  const currentMinutes = istNow.getHours() * 60 + istNow.getMinutes();

  const periodStartMinutes = parseTimeToMinutes(timeStr, periodNum);
  const periodEndMinutes = periodStartMinutes + 50;

  const normalizedStatus = String(rawGemsStatus || 'NA').trim().toUpperCase();

  // If GEMS provides explicit status
  if (normalizedStatus === 'P' || normalizedStatus === 'PRESENT') {
    return {
      status: 'present',
      rawStatus: 'P',
      tag: '🟢 P (RECORDED IN GEMS)',
      postedAt: timeStr ? timeStr.split('-')[0].trim() : `${String(Math.floor(periodStartMinutes / 60)).padStart(2, '0')}:00`,
      postedBy: `${faculty} (GEMS Mobile App)`,
      syncSource: 'MITS GEMS Live API',
    };
  }

  if (normalizedStatus === 'A' || normalizedStatus === 'ABSENT') {
    return {
      status: 'absent',
      rawStatus: 'A',
      tag: '🔴 A (RECORDED ABSENT IN GEMS)',
      postedAt: timeStr ? timeStr.split('-')[0].trim() : `${String(Math.floor(periodStartMinutes / 60)).padStart(2, '0')}:00`,
      postedBy: `${faculty} (GEMS Mobile App)`,
      syncSource: 'MITS GEMS Live API',
    };
  }

  // If period is in the future
  if (currentMinutes < periodStartMinutes) {
    return {
      status: 'pending',
      rawStatus: 'NA',
      tag: '⏳ NA (UPCOMING)',
      postedAt: 'Scheduled: ' + (timeStr || `Period ${periodNum}`),
      postedBy: 'Awaiting Faculty Entry (GEMS Mobile App)',
      syncSource: 'MITS GEMS Live Timetable',
    };
  }

  // If period is currently in progress
  if (currentMinutes >= periodStartMinutes && currentMinutes <= periodEndMinutes) {
    return {
      status: 'pending',
      rawStatus: 'NA',
      tag: '⏳ NA (CLASS IN PROGRESS)',
      postedAt: 'In Progress',
      postedBy: `${faculty} (GEMS Mobile App)`,
      syncSource: 'MITS GEMS Live Sync',
    };
  }

  // In MITS GEMS, all unposted/pending periods strictly display as NA (Pending Entry)
  return {
    status: 'pending',
    rawStatus: 'NA',
    tag: '⏳ NA (AWAITING GEMS ENTRY)',
    postedAt: timeStr ? timeStr.split('-')[0].trim() : `${String(Math.floor(periodStartMinutes / 60)).padStart(2, '0')}:00`,
    postedBy: 'Awaiting Faculty Entry (GEMS Mobile App)',
    syncSource: 'MITS GEMS Android App & Portal',
  };
}

/**
 * Direct Live MITS GEMS Scraper
 * Authenticates directly with http://mitsims.in/ and parses real-time attendance & timetable
 */
async function scrapeDirectMitsGems(username, password) {
  try {
    // 1. Initial GET to obtain session cookie
    const initRes = await fetch('http://mitsims.in/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    });

    const setCookies = initRes.headers.getSetCookie 
      ? initRes.headers.getSetCookie() 
      : [initRes.headers.get('set-cookie') || ''];
    
    let cookieHeader = setCookies.map(c => c.split(';')[0]).filter(Boolean).join('; ');

    // 2. Perform Login POST
    const loginParams = new URLSearchParams();
    loginParams.append('userId', username);
    loginParams.append('password', password);

    const loginRes = await fetch('http://mitsims.in/studentLogin/studentLogin.action?personType=student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: loginParams.toString(),
      cache: 'no-store',
    });

    const loginText = await loginRes.text();
    const loginSetCookies = loginRes.headers.getSetCookie 
      ? loginRes.headers.getSetCookie() 
      : [loginRes.headers.get('set-cookie') || ''];
    
    if (loginSetCookies.length > 0) {
      const extra = loginSetCookies.map(c => c.split(';')[0]).filter(Boolean).join('; ');
      cookieHeader = cookieHeader ? `${cookieHeader}; ${extra}` : extra;
    }

    if (!loginText.includes('success')) {
      return { error: 'Invalid MITS GEMS Roll Number or Password.' };
    }

    // 2.5 Fetch Official GEMS Mobile API Data (from GEMS.apk)
    let mobileTodayClasses = [];
    let mobileAttendanceDetails = [];
    let mobileStudentInfo = null;
    try {
      const mobileLoginRes = await fetch('http://mitsims.in/studentAppLogin/studentLogin.action?actionType=studentAppLogin&personType=student&userId=' + encodeURIComponent(username), {
        method: 'POST',
        headers: {
          'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 10; SM-G975F Build/QP1A.190711.020)',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'password=' + encodeURIComponent(password),
        cache: 'no-store',
      });
      const mobileLoginText = await mobileLoginRes.text();
      const mobileData = Function('return (' + mobileLoginText + ')')();
      if (mobileData && mobileData.status === 'success' && mobileData.studentLoginDetails && mobileData.studentLoginDetails.length > 0) {
        mobileStudentInfo = mobileData.studentLoginDetails[0];
        
        // Format IST Date as DD/MM/YYYY for GEMS Mobile API
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const istNow = new Date(utc + (3600000 * 5.5));
        const pad = (n) => String(n).padStart(2, '0');
        const dateStr = `${pad(istNow.getDate())}/${pad(istNow.getMonth() + 1)}/${istNow.getFullYear()}`;

        // Fetch Today's Classes & Real-Time Status from Official GEMS Mobile Dashboard API
        const mobileTodayRes = await fetch(`http://mitsims.in/studentApp/dashboard.action?tkn=${mobileStudentInfo.authToken}&studentId=${mobileStudentInfo.id}&studentType=student&stdnt.id=${mobileStudentInfo.id}&dateString=${dateStr}`, {
          headers: { 'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 10; SM-G975F Build/QP1A.190711.020)' },
          cache: 'no-store',
        });
        const mobileTodayText = await mobileTodayRes.text();
        const mobileTodayData = Function('return (' + mobileTodayText + ')')();
        if (mobileTodayData && mobileTodayData.classDetails && Array.isArray(mobileTodayData.classDetails)) {
          mobileTodayClasses = mobileTodayData.classDetails;
        }

        // Fetch Official Attendance Details from Mobile API
        const mobileAttRes = await fetch(`http://mitsims.in/studentApp/getAttendanceDetails.action?tkn=${mobileStudentInfo.authToken}&stdnt.id=${mobileStudentInfo.id}&studentId=${mobileStudentInfo.id}&actionType=attendanceDetails&studentType=student`, {
          headers: { 'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 10; SM-G975F Build/QP1A.190711.020)' },
          cache: 'no-store',
        });
        const mobileAttText = await mobileAttRes.text();
        const mobileAttData = Function('return (' + mobileAttText + ')')();
        if (mobileAttData && mobileAttData.attendanceDetails && Array.isArray(mobileAttData.attendanceDetails)) {
          mobileAttendanceDetails = mobileAttData.attendanceDetails;
        }
      }
    } catch (mErr) {
      console.warn('GEMS Mobile API error:', mErr);
    }

    // 3. Fetch Consolidated View (Student info)
    const consRes = await fetch('http://mitsims.in/gemsonline-student/getConsolidatedView.action?', {
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    });
    const consText = await consRes.text();

    const nameMatch = consText.match(/fieldLabel:\s*['"]Student Name['"],\s*value:\s*['"]([^'"]+)['"]/);
    const studentName = (mobileStudentInfo && mobileStudentInfo.name) ? mobileStudentInfo.name.trim() : (nameMatch ? nameMatch[1].trim() : `Student (${username})`);

    const batchMatch = consText.match(/fieldLabel:\s*['"]Student Batch['"],\s*value:\s*['"]([^'"]+)['"]/);
    const batchYear = batchMatch ? batchMatch[1].trim() : '2024';

    const branchMatch = consText.match(/fieldLabel:\s*['"](?:Department|Branch|Programme)['"],\s*value:\s*['"]([^'"]+)['"]/);
    const branch = branchMatch ? branchMatch[1].trim() : getBranchFromRoll(username);

    // 4. Fetch Dashboard View (Real Attendance, Timetable & Faculty)
    const dashRes = await fetch('http://mitsims.in/gemsonline-student/dashboard.action?actionType=view', {
      headers: {
        'Cookie': cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    });
    const dashText = await dashRes.text();

    // Extract Semester Activity title
    const semTitleMatch = dashText.match(/title\s*:\s*['"]Semester Activity for-([^'"]+)['"]/);
    const semesterTitle = semTitleMatch ? semTitleMatch[1].trim() : 'B.Tech Semester';

    // Extract all ExtJS displayfield span contents
    const spanRegex = /value:\s*['"]<span style\s*=\s*['"].*?>(.*?)<\/span>['"]/g;
    const spans = [];
    let match;
    while ((match = spanRegex.exec(dashText)) !== null) {
      spans.push(match[1]);
    }

    const facultyMap = {};
    const subjectNames = {};

    // 1st table: Subject Names & Faculty mapping
    for (let i = 0; i < spans.length; i++) {
      const clean = spans[i].replace(/<[^>]+>/g, ' ').trim();
      if (clean.includes('Email:')) {
        const parts = clean.split('Email:');
        const facName = parts[0].trim();
        if (i >= 2) {
          const subName = spans[i - 1].replace(/<[^>]+>/g, ' ').trim();
          const code = spans[i - 2].replace(/<[^>]+>/g, ' ').trim();
          if (code && !code.startsWith('<b>')) {
            facultyMap[code] = facName;
            subjectNames[code] = subName;
          }
        }
      }
    }

    // 2nd table: Classes Attended & Total Conducted
    const attendanceList = [];
    let attStartIndex = -1;
    for (let i = 0; i < spans.length; i++) {
      if (spans[i].includes('CLASSES ATTENDED')) {
        attStartIndex = i;
        break;
      }
    }

    if (attStartIndex !== -1) {
      const attSpans = spans.slice(attStartIndex + 2);
      let idx = 0;
      while (idx < attSpans.length) {
        const codeRaw = attSpans[idx].replace(/<[^>]+>/g, ' ').trim();
        if (idx + 3 < attSpans.length) {
          const attStr = attSpans[idx + 1].replace(/<[^>]+>/g, ' ').trim();
          const condStr = attSpans[idx + 2].replace(/<[^>]+>/g, ' ').trim();
          const pctStr = attSpans[idx + 3].replace(/<[^>]+>/g, ' ').trim();

          const attended = parseInt(attStr, 10);
          const conducted = parseInt(condStr, 10);
          const pct = parseFloat(pctStr);

          if (!isNaN(attended) && !isNaN(conducted)) {
            const subName = subjectNames[codeRaw] || codeRaw;
            const fac = facultyMap[codeRaw] || 'MITS Faculty';
            const safeBunks = Math.max(0, Math.floor((attended / 0.75) - conducted));
            const isTT = codeRaw === 'APTITUDE' || codeRaw === 'SOFTSKILLS';

            attendanceList.push({
              code: codeRaw,
              subjectName: subName,
              type: subName.toUpperCase().includes('LAB') || subName.toUpperCase().includes('PRACTICAL') ? 'Practical' : 'Theory',
              attended: attended,
              conducted: conducted,
              percentage: !isNaN(pct) ? pct : (conducted > 0 ? Number(((attended / conducted) * 100).toFixed(2)) : 0),
              safe_bunks: safeBunks,
              faculty: fac,
              isTT: isTT,
              room: subName.toUpperCase().includes('LAB') ? 'Computer Center / Lab' : 'LH-302',
            });
            idx += 4;
          } else {
            idx += 1;
          }
        } else {
          break;
        }
      }
    }

    // 3. Extract Official Weekly Timetable from MITS GEMS & Resolve Multi-Batch/Elective Slots
    const periodTimes = {};
    const coldefRegex = /dataIndex:\s*['"](Period\d+)['"],\s*text:\s*['"]<span[^>]*>\s*([\d:]+\s*(?:AM|PM))\s*<\/span>['"]/g;
    let colMatch;
    while ((colMatch = coldefRegex.exec(dashText)) !== null) {
      periodTimes[colMatch[1]] = colMatch[2].trim();
    }

    // Resolve any multi-batch / combined lab IDs in parallel via MITS IMS Details API
    const multiMatches = [...dashText.matchAll(/ttWindow\(this,\s*null\s*,\s*['"]view['"]\s*,\s*['"]([^'"]+)['"]\)/g)];
    const multiIds = [...new Set(multiMatches.map(m => m[1]))];

    const resolvedSlotMap = {};
    if (multiIds.length > 0) {
      await Promise.all(
        multiIds.map(async (strId) => {
          try {
            const res = await fetch(`http://mitsims.in/gemsonline-student/viewMyClassTtDetails.action?&str=${strId}&type=view`, {
              headers: {
                'Cookie': cookieHeader,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              },
              cache: 'no-store',
            });
            const ttText = await res.text();
            const subNameMatch = ttText.match(/value\s*:\s*['"]<span[^>]*font-weight:\s*bold;[^>]*>(.*?)<\/span>['"]/);
            const codeMatch = ttText.match(/value\s*:\s*['"]<span[^>]*><b>([A-Za-z0-9]+)<\/b><\/span>['"]/);
            const facMatch = ttText.match(/Faculty:\s*<b>([^<]+)<\/b>/);
            const roomMatch = ttText.match(/Class Room:\s*<b>([^<]+)<\/b>/);

            const subName = subNameMatch ? subNameMatch[1].trim() : '';
            const code = codeMatch ? codeMatch[1].trim() : '';
            const fac = facMatch ? facMatch[1].trim() : '';
            const room = roomMatch && roomMatch[1].trim() !== '-' ? roomMatch[1].trim() : '';

            if (code || subName) {
              resolvedSlotMap[strId] = {
                code: code || 'SUB',
                subjectName: subName || subjectNames[code] || code,
                faculty: fac || facultyMap[code] || 'MITS Faculty',
                room: room || (code.toUpperCase().includes('LAB') || subName.toUpperCase().includes('LAB') ? 'Computer Center / Lab' : 'LH-302'),
              };
            }
          } catch (err) {
            console.warn(`Failed to resolve slot ${strId}:`, err);
          }
        })
      );
    }

    const dayMap = {
      MON: 'Monday',
      TUE: 'Tuesday',
      WED: 'Wednesday',
      THU: 'Thursday',
      FRI: 'Friday',
      SAT: 'Saturday',
    };

    const weeklyTimetable = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
    };

    const ttPos = dashText.indexOf('timeTableTable');
    if (ttPos !== -1) {
      const recordsPos = dashText.indexOf('records :', ttPos);
      const endPos = dashText.indexOf('listeners :', recordsPos);
      const ttBlock = dashText.substring(recordsPos, endPos !== -1 ? endPos : recordsPos + 40000);

      const dayChunks = ttBlock.split(/'days'\s*:\s*['"]<span[^>]*>([A-Z]+)<\/span>['"]/);
      for (let k = 1; k < dayChunks.length; k += 2) {
        const shortDay = dayChunks[k].trim();
        const dayContent = dayChunks[k + 1];
        const fullDay = dayMap[shortDay] || shortDay;

        const periodsList = [];
        const pEntryRegex = /(?:,\s*)?"(Period\d+)"\s*:\s*(Ext\.String\.format\([\s\S]*?\)|''|'[^']*')(?=\s*,|\s*\})/g;
        let pMatch;
        while ((pMatch = pEntryRegex.exec(dayContent)) !== null) {
          const pKey = pMatch[1];
          const pRaw = pMatch[2];
          if (!pRaw || pRaw === "''" || pRaw === "''") continue;

          const pNum = parseInt(pKey.replace('Period', ''), 10);
          const timeStr = periodTimes[pKey] || (pNum <= 4 ? `0${8 + pNum}:00 AM` : `0${pNum - 3}:00 PM`);

          // Check if it has a multi-batch ttWindow call resolved via IMS API
          const multiIdMatch = pRaw.match(/ttWindow\(this,\s*null\s*,\s*['"]view['"]\s*,\s*['"]([^'"]+)['"]\)/);
          if (multiIdMatch && resolvedSlotMap[multiIdMatch[1]]) {
            const resolved = resolvedSlotMap[multiIdMatch[1]];
            periodsList.push({
              period: pNum,
              periodKey: pKey,
              time: timeStr,
              code: resolved.code,
              name: resolved.subjectName,
              subjectName: resolved.subjectName,
              faculty: resolved.faculty,
              room: resolved.room,
            });
            continue;
          }

          const pSpans = [];
          const spRegex = /<span[^>]*>(.*?)<\/span>/g;
          let spMatch;
          while ((spMatch = spRegex.exec(pRaw)) !== null) {
            const c = spMatch[1].replace(/<[^>]+>/g, ' ').trim();
            if (c) pSpans.push(c);
          }

          if (pSpans.length > 0) {
            let code = pSpans[0];
            let fac = pSpans[1] || facultyMap[code] || 'MITS Faculty';
            let subName = subjectNames[code] || code;

            if (code.toLowerCase().includes('more than 1')) {
              code = 'ELECTIVE/LAB';
              subName = 'Elective Course / Practical Lab';
              fac = 'Department Faculty';
            }

            periodsList.push({
              period: pNum,
              periodKey: pKey,
              time: timeStr,
              code: code,
              name: subName,
              subjectName: subName,
              faculty: fac,
              room: code.includes('LAB') || subName.toUpperCase().includes('LAB') ? 'Computer Center / Lab' : 'LH-302',
            });
          }
        }
        weeklyTimetable[fullDay] = periodsList.sort((a, b) => a.period - b.period);
      }
    }

    if (attendanceList.length > 0) {
      const totalAttended = attendanceList.reduce((sum, s) => sum + s.attended, 0);
      const totalConducted = attendanceList.reduce((sum, s) => sum + s.conducted, 0);
      const exactOverallPct = totalConducted > 0 ? Number(((totalAttended / totalConducted) * 100).toFixed(2)) : 0;

      // 4. Calculate today's periods based on actual day of the week
      const now = new Date();
      const dayOfWeekIndex = now.getDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayNames[dayOfWeekIndex];
      const isSunday = dayOfWeekIndex === 0;

      let todaysClasses = [];
      if (!isSunday) {
        if (mobileTodayClasses && mobileTodayClasses.length > 0) {
          // 1. Direct integration with Official GEMS Mobile API (from GEMS.apk)
          todaysClasses = mobileTodayClasses.map((c, idx) => {
            const periodNum = idx + 1;
            const timeVal = c.time ? (c.time.length <= 8 ? c.time.slice(0, 5) : c.time) : (idx === 0 ? '09:00 AM' : idx === 1 ? '10:00 AM' : '11:00 AM');
            const rawSt = (c.status || '').trim();
            const stLower = rawSt.toLowerCase();

            let status = 'pending';
            let finalRawStatus = 'NA';
            let tag = '⏳ NA (AWAITING GEMS ENTRY)';

            if (stLower === 'present' || stLower === 'p') {
              status = 'present';
              finalRawStatus = 'P';
              tag = '🟢 P (RECORDED IN GEMS)';
            } else if (stLower === 'absent' || stLower === 'ab' || stLower === 'a') {
              status = 'absent';
              finalRawStatus = 'A';
              tag = '🔴 A (RECORDED ABSENT IN GEMS)';
            } else if (stLower === 'permission' || stLower === 'pm') {
              status = 'permission';
              finalRawStatus = 'PM';
              tag = '🟡 PM (PERMISSION IN GEMS)';
            }

            const subRecord = attendanceList.find((a) => a.code === c.code || a.subjectName === c.subjectName);

            return {
              period: periodNum,
              time: timeVal,
              code: c.code,
              shortName: (c.subjectName || c.code).split(' ')[0],
              subjectName: c.subjectName || c.code,
              room: c.roomNo || 'LH-302',
              faculty: c.facultyName || 'MITS Faculty',
              status: status,
              rawStatus: finalRawStatus,
              tag: tag,
              attPercentage: c.attPercentage || (subRecord ? `${subRecord.percentage}%` : ''),
              postedAt: rawSt && rawSt !== 'NA' && rawSt !== '' ? 'Today (GEMS Official)' : undefined,
              postedBy: c.facultyName ? `${c.facultyName} (Official GEMS App)` : 'Faculty',
              syncSource: 'MITS GEMS Official Mobile API (APK)',
            };
          });
        } else {
          // 2. Fallback to weekly scheduled timetable
          const scheduledToday = weeklyTimetable[currentDayName] || [];
          todaysClasses = scheduledToday.map((p, idx) => {
            const periodNum = p.period || idx + 1;
            const timeVal = p.time || (idx === 0 ? '09:00 AM' : idx === 1 ? '10:00 AM' : '11:00 AM');
            const subRecord = attendanceList.find((a) => a.code === p.code || a.subjectName === p.name || a.subjectName === p.subjectName);
            const evalRes = evaluatePeriodStatus(timeVal, periodNum, p.faculty || 'MITS Faculty', subRecord, p.code);

            return {
              period: periodNum,
              time: timeVal,
              code: p.code,
              shortName: (p.name || p.subjectName || p.code).split(' ')[0],
              subjectName: p.name || p.subjectName || p.code,
              room: p.room || 'LH-302',
              faculty: p.faculty || 'MITS Faculty',
              status: evalRes.status,
              rawStatus: evalRes.rawStatus,
              tag: evalRes.tag,
              postedAt: evalRes.postedAt,
              postedBy: evalRes.postedBy,
              syncSource: evalRes.syncSource,
            };
          });
        }
      }

      return {
        student: {
          name: studentName,
          rollNo: username,
          branch: branch,
          semester: semesterTitle,
          batch: batchYear,
          section: 'Section B',
          institution: 'Madanapalle Institute of Technology & Science',
          avatar: '🎓',
        },
        username: username,
        password: password,
        lastUpdated: new Date().toISOString(),
        currentDayName: currentDayName,
        isSunday: isSunday,
        overallAttendance: {
          attended: totalAttended,
          conducted: totalConducted,
          percentage: exactOverallPct,
          label: 'Official Exam Attendance',
        },
        overallWithTT: {
          attended: totalAttended,
          conducted: totalConducted,
          percentage: exactOverallPct,
          label: 'With Soft Skills & Aptitude',
        },
        attendance: attendanceList,
        weeklyTimetable: weeklyTimetable,
        todaysClasses: todaysClasses,
        initialTodaysClasses: todaysClasses,
      };
    }

    return null;
  } catch (err) {
    console.error('Direct GEMS Scraper error:', err);
    return null;
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !body.username || !body.password) {
      return NextResponse.json(
        { error: 'Roll Number and Password are required to sign in.' },
        { status: 400 }
      );
    }

    const username = String(body.username).trim().toUpperCase();
    const password = String(body.password);

    if (username.length < 5) {
      return NextResponse.json(
        { error: 'Please enter a valid MITS Roll Number.' },
        { status: 400 }
      );
    }

    // 1. Try Direct Connection to MITS GEMS Live Server
    const liveGemsData = await scrapeDirectMitsGems(username, password);
    if (liveGemsData && !liveGemsData.error) {
      return NextResponse.json(liveGemsData);
    }

    // 2. Fallback to Secondary Scraper API if available
    try {
      const response = await fetch('https://attendance-optimizer-mb8g.onrender.com/api/gems-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.attendance) {
          const exactAttendance = data.attendance.map((item) => {
            const realAttended = item.rawAttended !== undefined ? Number(item.rawAttended) : Number(item.attended || 0);
            const conducted = Number(item.conducted || 0);
            const calculatedPct = conducted > 0 ? Number(((realAttended / conducted) * 100).toFixed(2)) : 0;
            const safe_bunks = Math.max(0, Math.floor((realAttended / 0.75) - conducted));
            return {
              ...item,
              attended: realAttended,
              conducted: conducted,
              percentage: calculatedPct,
              safe_bunks: safe_bunks,
            };
          });

          const totalAttended = exactAttendance.reduce((sum, i) => sum + i.attended, 0);
          const totalConducted = exactAttendance.reduce((sum, i) => sum + i.conducted, 0);
          const exactOverallPercentage = totalConducted > 0 ? Number(((totalAttended / totalConducted) * 100).toFixed(2)) : 0;

          const now = new Date();
          const dayOfWeekIndex = now.getDay();
          const isSunday = dayOfWeekIndex === 0;

          const todaySample = isSunday ? [] : exactAttendance.slice(0, 5).map((s, idx) => {
            const timeVal = idx === 0 ? '09:00 - 09:50' : idx === 1 ? '09:50 - 10:40' : idx === 2 ? '10:50 - 11:40' : idx === 3 ? '11:40 - 12:30' : '01:30 - 02:20';
            const periodNum = idx + 1;
            const evalRes = evaluatePeriodStatus(timeVal, periodNum, s.faculty || 'MITS Faculty', s, s.code);

            return {
              period: periodNum,
              time: timeVal,
              code: s.code,
              shortName: (s.subjectName || s.code).split(' ')[0],
              subjectName: s.subjectName || s.code,
              room: 'LH-302',
              faculty: s.faculty || 'MITS Faculty',
              status: evalRes.status,
              rawStatus: evalRes.rawStatus,
              tag: evalRes.tag,
              postedAt: evalRes.postedAt,
              postedBy: evalRes.postedBy,
              syncSource: evalRes.syncSource,
            };
          });

          return NextResponse.json({
            ...data,
            attendance: exactAttendance,
            todaysClasses: todaySample,
            initialTodaysClasses: todaySample,
            isSunday: isSunday,
            overallAttendance: {
              attended: totalAttended,
              conducted: totalConducted,
              percentage: exactOverallPercentage,
            },
          });
        }
      }
    } catch (fallbackErr) {
      console.warn('Fallback scraper unavailable:', fallbackErr);
    }

    if (liveGemsData?.error) {
      return NextResponse.json({ error: liveGemsData.error }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Unable to connect to MITS GEMS portal. Please check credentials or network.' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Attendance API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error while connecting to MITS GEMS.' },
      { status: 500 }
    );
  }
}
