/**
 * Attendance calculation helpers and threshold optimizers for MITS GEMS.
 */

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
 * Calculates how many safe bunks remain while staying at or above target (default 75%).
 * @param {number} attended
 * @param {number} conducted
 * @param {number} targetPercentage
 * @returns {number}
 */
export function calculateSafeBunks(attended, conducted, targetPercentage = 75) {
  const target = targetPercentage / 100;
  if (!conducted || conducted <= 0) return 0;
  return Math.max(0, Math.floor((attended / target) - conducted));
}

/**
 * Calculates how many consecutive classes must be attended to reach target percentage.
 * @param {number} attended
 * @param {number} conducted
 * @param {number} targetPercentage
 * @returns {number}
 */
export function calculateRequiredClasses(attended, conducted, targetPercentage = 75) {
  const target = targetPercentage / 100;
  if (!conducted || conducted <= 0) return 0;
  const currentPct = (attended / conducted) * 100;
  if (currentPct >= targetPercentage) return 0;
  return Math.ceil((target * conducted - attended) / (1 - target));
}
