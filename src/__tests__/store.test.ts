import { xpForLevel, levelFromXP, XP_REWARDS, COIN_REWARDS } from '../store';

describe('XP System', () => {
  test('xpForLevel returns correct values', () => {
    expect(xpForLevel(1)).toBe(500);
    expect(xpForLevel(5)).toBe(2500);
    expect(xpForLevel(10)).toBe(5000);
  });

  test('levelFromXP at 0 XP', () => {
    const info = levelFromXP(0);
    expect(info.level).toBe(1);
    expect(info.currentXP).toBe(0);
    expect(info.xpToNext).toBe(500);
  });

  test('levelFromXP at exactly 500 XP (level 2)', () => {
    const info = levelFromXP(500);
    expect(info.level).toBe(2);
    expect(info.currentXP).toBe(0);
    expect(info.xpToNext).toBe(1000);
  });

  test('levelFromXP at 1499 XP (still level 2)', () => {
    const info = levelFromXP(1499);
    expect(info.level).toBe(2);
    expect(info.currentXP).toBe(999);
    expect(info.xpToNext).toBe(1000);
  });

  test('levelFromXP at 1500 XP (level 3)', () => {
    const info = levelFromXP(1500);
    expect(info.level).toBe(3);
    expect(info.currentXP).toBe(0);
    expect(info.xpToNext).toBe(1500);
  });

  test('levelFromXP high XP', () => {
    const info = levelFromXP(10000);
    expect(info.level).toBeGreaterThan(3);
    expect(info.currentXP).toBeGreaterThanOrEqual(0);
    expect(info.currentXP).toBeLessThan(info.xpToNext);
  });

  test('XP_REWARDS has expected keys', () => {
    expect(XP_REWARDS.listen_full).toBe(100);
    expect(XP_REWARDS.visit_gps).toBe(300);
    expect(XP_REWARDS.first_battle).toBe(200);
  });

  test('COIN_REWARDS has expected keys', () => {
    expect(COIN_REWARDS.listen_full).toBe(25);
    expect(COIN_REWARDS.level_up).toBe(100);
  });
});
