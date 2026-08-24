/**
 * Attendance calculation helpers and threshold optimizers for MITS GEMS.
 */

/**
 * Standard MITS attendance thresholds
 */
export const TARGET_THRESHOLDS = [
  { value: 65, label: '65% (Condonation)', badge: 'Condonation Limit', color: '#d97706', desc: 'Minimum allowed with medical condonation fine' },
  { value: 75, label: '75% (MITS Standard)', badge: 'Official Safe Zone', color: '#16a34a', desc: 'Mandatory minimum for regular semester end exam eligibility' },
  { value: 80, label: '80% (Placement Safe)', badge: 'Placement Ready', color: '#2563eb', desc: 'Preferred by top MNCs and placement training cells' },
  { value: 85, label: '85% (Distinction)', badge: 'Distinction', color: '#7c3aed', desc: 'Guarantees 4/5 internal assessment attendance marks' },
  { value: 90, label: '90% (Top Tier)', badge: 'High Honor', color: '#db2777', desc: 'Guarantees full 5/5 internal assessment marks & academic honors' },
];

/**
 * Calculates exact attendance percentage.
 * @param {number} attended
 * @param {number} conducted
 * @returns {number}
 */
export function calculatePercentage(attended, conducted) {
  if (!conducted || conducted <= 0) return 0;
  return Number(((attended / conducted) * 100).toFixed(2));
}

/**
 * Calculates internal assessment attendance marks awarded (out of 5 marks).
 * Based on autonomous engineering university standards (MITS/JNTU):
 * - >= 90%: 5 Marks
 * - 85% to 89.99%: 4 Marks
 * - 80% to 84.99%: 3 Marks
 * - 75% to 79.99%: 2 Marks
 * - 65% to 74.99%: 1 Mark
 * - < 65%: 0 Marks
 * @param {number} percentage
 * @returns {{marks: number, max: number, grade: string, badge: string, nextThresholdText: string}}
 */
export function calculateInternalMarks(percentage) {
  const pct = Number(percentage) || 0;
  if (pct >= 90) {
    return {
      marks: 5,
      max: 5,
      grade: 'Outstanding',
      badge: '🌟 Full 5/5 Marks',
      nextThresholdText: 'Maximum internal marks secured!',
    };
  }
  if (pct >= 85) {
    return {
      marks: 4,
      max: 5,
      grade: 'Excellent',
      badge: '⭐ 4/5 Marks',
      nextThresholdText: `Reach 90% (+${(90 - pct).toFixed(1)}%) for full 5/5 marks`,
    };
  }
  if (pct >= 80) {
    return {
      marks: 3,
      max: 5,
      grade: 'Very Good',
      badge: '👍 3/5 Marks',
      nextThresholdText: `Reach 85% (+${(85 - pct).toFixed(1)}%) for 4/5 marks`,
    };
  }
  if (pct >= 75) {
    return {
      marks: 2,
      max: 5,
      grade: 'Good (Eligible)',
      badge: '✓ 2/5 Marks',
      nextThresholdText: `Reach 80% (+${(80 - pct).toFixed(1)}%) for 3/5 marks`,
    };
  }
  if (pct >= 65) {
    return {
      marks: 1,
      max: 5,
      grade: 'Condonation Zone',
      badge: '⚠️ 1/5 Marks',
      nextThresholdText: `Reach 75% (+${(75 - pct).toFixed(1)}%) to avoid condonation fine!`,
    };
  }
  return {
    marks: 0,
    max: 5,
    grade: 'Detention Risk',
    badge: '🚨 0/5 Marks',
    nextThresholdText: `Critical: Must attend all upcoming classes to cross 65%!`,
  };
}

/**
 * Calculates how many safe bunks remain while staying at or above target (default 75%).
 * Formula: floor((attended / target) - conducted)
 * @param {number} attended
 * @param {number} conducted
 * @param {number} targetPercentage
 * @returns {number}
 */
export function calculateSafeBunks(attended, conducted, targetPercentage = 75) {
  const target = (Number(targetPercentage) || 75) / 100;
  if (!conducted || conducted <= 0) return 0;
  return Math.max(0, Math.floor((attended / target) - conducted));
}

/**
 * Calculates how many consecutive classes must be attended to reach target percentage.
 * Formula: ceil((target * conducted - attended) / (1 - target))
 * @param {number} attended
 * @param {number} conducted
 * @param {number} targetPercentage
 * @returns {number}
 */
export function calculateRequiredClasses(attended, conducted, targetPercentage = 75) {
  const target = (Number(targetPercentage) || 75) / 100;
  if (!conducted || conducted <= 0) return 0;
  const currentPct = (attended / conducted) * 100;
  if (currentPct >= targetPercentage) return 0;
  if (target >= 1) return 999;
  return Math.ceil((target * conducted - attended) / (1 - target));
}

/**
 * Generates a full milestone roadmap matrix across all key thresholds for a subject.
 * @param {number} attended
 * @param {number} conducted
 * @returns {Array<{threshold: number, label: string, isMet: boolean, safeBunks: number, requiredClasses: number, margin: number}>}
 */
export function generateMilestones(attended, conducted) {
  const thresholds = [65, 75, 80, 85, 90];
  const currentPct = calculatePercentage(attended, conducted);

  return thresholds.map((t) => {
    const isMet = currentPct >= t;
    const safeBunks = calculateSafeBunks(attended, conducted, t);
    const required = calculateRequiredClasses(attended, conducted, t);

    return {
      threshold: t,
      label: `${t}% Target`,
      isMet,
      safeBunks,
      requiredClasses: required,
      margin: Number((currentPct - t).toFixed(2)),
    };
  });
}

/**
 * Calculates semester end forecast given remaining classes.
 * @param {number} currentAttended
 * @param {number} currentConducted
 * @param {number} remainingClasses
 * @param {number} targetPercentage
 */
export function calculateSemesterForecast(
  currentAttended,
  currentConducted,
  remainingClasses,
  targetPercentage = 75
) {
  const totalClasses = currentConducted + Math.max(0, remainingClasses);
  const target = (Number(targetPercentage) || 75) / 100;
  const totalRequiredToPass = Math.ceil(totalClasses * target);
  const additionalAttendedNeeded = Math.max(0, totalRequiredToPass - currentAttended);

  // Best Case: Attend 100% of remaining
  const bestCasePct = calculatePercentage(currentAttended + remainingClasses, totalClasses);

  // Worst Case: Attend 0 of remaining
  const worstCasePct = calculatePercentage(currentAttended, totalClasses);

  // Safe Bunks in remaining classes
  const maxPossibleBunksInRemaining = Math.max(0, remainingClasses - additionalAttendedNeeded);

  // Feasibility
  const isAchievable = additionalAttendedNeeded <= remainingClasses;
  const requiredRate = remainingClasses > 0
    ? Math.min(100, Math.max(0, Number(((additionalAttendedNeeded / remainingClasses) * 100).toFixed(1))))
    : 0;

  return {
    totalClasses,
    remainingClasses,
    totalRequiredToPass,
    additionalAttendedNeeded,
    bestCasePct,
    worstCasePct,
    maxPossibleBunksInRemaining,
    isAchievable,
    requiredRate,
  };
}

/**
 * Simulates multi-day leave impact across weekly timetable and subjects.
 * @param {Array} subjects
 * @param {Array<string>} selectedDays (e.g. ['Friday', 'Saturday', 'Monday'])
 * @param {Object} timetable ({ Monday: [...], Tuesday: [...] })
 * @param {number} targetPercentage
 */
export function calculateLeaveImpact(subjects = [], selectedDays = [], timetable = {}, targetPercentage = 75) {
  const missedPeriodsByCode = {};

  selectedDays.forEach((day) => {
    const dayPeriods = timetable[day] || [];
    dayPeriods.forEach((p) => {
      if (p.code) {
        missedPeriodsByCode[p.code] = (missedPeriodsByCode[p.code] || 0) + 1;
      }
    });
  });

  let prevTotalAttended = 0;
  let prevTotalConducted = 0;
  let projectedTotalAttended = 0;
  let projectedTotalConducted = 0;

  const subjectResults = subjects.map((s) => {
    const missedClasses = missedPeriodsByCode[s.code] || 0;
    const currentAttended = s.simAttended !== undefined ? s.simAttended : s.attended;
    const currentConducted = s.simConducted !== undefined ? s.simConducted : s.conducted;
    const currentPct = calculatePercentage(currentAttended, currentConducted);

    const projectedAttended = currentAttended; // Missed so attended doesn't increase
    const projectedConducted = currentConducted + missedClasses;
    const projectedPct = calculatePercentage(projectedAttended, projectedConducted);
    const drop = Number((currentPct - projectedPct).toFixed(2));
    const projectedSafeBunks = calculateSafeBunks(projectedAttended, projectedConducted, targetPercentage);
    const projectedRequired = calculateRequiredClasses(projectedAttended, projectedConducted, targetPercentage);
    const isSafeBefore = currentPct >= targetPercentage;
    const isSafeAfter = projectedPct >= targetPercentage;
    const becomesShortage = isSafeBefore && !isSafeAfter;

    prevTotalAttended += currentAttended;
    prevTotalConducted += currentConducted;
    projectedTotalAttended += projectedAttended;
    projectedTotalConducted += projectedConducted;

    return {
      code: s.code,
      subjectName: s.subjectName,
      type: s.type,
      missedPeriods: missedClasses,
      currentAttended,
      currentConducted,
      currentPct,
      projectedAttended,
      projectedConducted,
      projectedPct,
      drop,
      projectedSafeBunks,
      projectedRequired,
      isSafeBefore,
      isSafeAfter,
      becomesShortage,
    };
  });

  const currentOverallPct = calculatePercentage(prevTotalAttended, prevTotalConducted);
  const projectedOverallPct = calculatePercentage(projectedTotalAttended, projectedTotalConducted);
  const overallDrop = Number((currentOverallPct - projectedOverallPct).toFixed(2));
  const totalMissedPeriods = Object.values(missedPeriodsByCode).reduce((a, b) => a + b, 0);

  const dangerSubjects = subjectResults.filter((s) => !s.isSafeAfter);
  const newlyShortageSubjects = subjectResults.filter((s) => s.becomesShortage);

  let riskLevel = 'SAFE';
  if (projectedOverallPct < targetPercentage || newlyShortageSubjects.length > 1) {
    riskLevel = 'CRITICAL';
  } else if (newlyShortageSubjects.length > 0 || projectedOverallPct < targetPercentage + 2) {
    riskLevel = 'MODERATE';
  }

  return {
    selectedDays,
    totalMissedPeriods,
    currentOverallPct,
    projectedOverallPct,
    overallDrop,
    riskLevel,
    dangerSubjects,
    newlyShortageSubjects,
    subjectResults,
  };
}

/**
 * Simulates the effect of attending or missing future classes.
 * @param {number} attended
 * @param {number} conducted
 * @param {number} deltaAttended (e.g. +2 if attended 2, 0 if missed)
 * @param {number} deltaConducted (e.g. +2 classes held)
 * @param {number} target
 */
export function simulateAttendance(attended, conducted, deltaAttended, deltaConducted, target = 75) {
  const newAttended = Math.max(0, attended + deltaAttended);
  const newConducted = Math.max(0, conducted + deltaConducted);
  const newPct = calculatePercentage(newAttended, newConducted);
  const newSafeBunks = calculateSafeBunks(newAttended, newConducted, target);
  const newRequired = calculateRequiredClasses(newAttended, newConducted, target);

  return {
    attended: newAttended,
    conducted: newConducted,
    percentage: newPct,
    safeBunks: newSafeBunks,
    requiredClasses: newRequired,
    isSafe: newPct >= target,
  };
}

/**
 * Calculates real-time deltas and status summaries for today's classes.
 * @param {Array} todayClassesList
 * @param {Array} initialTodayClassesList
 * @returns {{ deltas: Object, summaryMap: Object }}
 */
export function calculateTodayDeltas(todayClassesList = [], initialTodayClassesList = []) {
  const deltas = {};
  const summaryMap = {};

  const initialStatusMap = {};
  initialTodayClassesList.forEach((c, idx) => {
    const key = c.id || `${c.code || 'SUB'}_${c.period || idx}`;
    initialStatusMap[key] = c.status || 'pending';
  });

  todayClassesList.forEach((c, idx) => {
    const code = c.code || 'UNKNOWN';
    const key = c.id || `${c.code || 'SUB'}_${c.period || idx}`;
    const initialStatus = initialStatusMap[key] || c.initialStatus || 'pending';
    const currentStatus = c.status || 'pending';

    if (!deltas[code]) {
      deltas[code] = { attendedDelta: 0, conductedDelta: 0 };
    }

    if (!summaryMap[code]) {
      summaryMap[code] = {
        presentPeriods: [],
        absentPeriods: [],
        pendingPeriods: [],
        upcomingPeriods: [],
        totalPeriodsToday: 0,
        presentCount: 0,
        absentCount: 0,
        pendingCount: 0,
        upcomingCount: 0,
      };
    }

    summaryMap[code].totalPeriodsToday += 1;

    if (currentStatus === 'present') {
      summaryMap[code].presentCount += 1;
      summaryMap[code].presentPeriods.push(c.period || idx + 1);
    } else if (currentStatus === 'absent') {
      summaryMap[code].absentCount += 1;
      summaryMap[code].absentPeriods.push(c.period || idx + 1);
    } else {
      summaryMap[code].pendingCount += 1;
      summaryMap[code].upcomingCount += 1;
      summaryMap[code].pendingPeriods.push(c.period || idx + 1);
      summaryMap[code].upcomingPeriods.push(c.period || idx + 1);
    }

    // Compute differential delta from initial status
    let baseAttended = initialStatus === 'present' ? 1 : 0;
    let baseConducted = initialStatus === 'present' || initialStatus === 'absent' ? 1 : 0;

    let currAttended = currentStatus === 'present' ? 1 : 0;
    let currConducted = currentStatus === 'present' || currentStatus === 'absent' ? 1 : 0;

    deltas[code].attendedDelta += (currAttended - baseAttended);
    deltas[code].conductedDelta += (currConducted - baseConducted);
  });

  return { deltas, summaryMap };
}

