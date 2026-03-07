/**
 * Official F1 Points System
 */
const POINTS_SYSTEM = {
  1: 25,
  2: 18,
  3: 15,
  4: 12,
  5: 10,
  6: 8,
  7: 6,
  8: 4,
  9: 2,
  10: 1,
};

/**
 * Get points for a position
 */
const getPointsForPosition = (position) => {
  return POINTS_SYSTEM[position] || 0;
};

/**
 * Check if position is a podium
 */
const isPodium = (position) => {
  return position >= 1 && position <= 3;
};

/**
 * Check if position is a win
 */
const isWin = (position) => {
  return position === 1;
};

module.exports = {
  getPointsForPosition,
  isPodium,
  isWin,
};
