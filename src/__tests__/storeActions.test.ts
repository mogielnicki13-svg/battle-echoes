// ============================================================
// BATTLE ECHOES — Store Action Tests
// Tests for all critical Zustand store actions:
//   awardXP, awardCoins, markBattleListened, markBattleVisited,
//   markBattleCompleted, markQuizCompleted, checkDailyStreak,
//   checkAchievements, canAccessBattle, purchaseCampaign,
//   unlockArtifact, unlockEra, unlockAllEras, signInAsGuest
// ============================================================

import { useAppStore, XP_REWARDS, COIN_REWARDS, ACHIEVEMENT_XP_REWARDS, levelFromXP } from '../store';

// ── Helper: reset store to a fresh guest state ──────────────
function resetStore() {
  useAppStore.setState({
    pendingRewards: [],
    pendingUnlocks: [],
  });
  useAppStore.getState().signInAsGuest();
}

// ── Helper: get user (asserts non-null) ─────────────────────
function getUser() {
  const user = useAppStore.getState().user;
  if (!user) throw new Error('User is null — did you call resetStore()?');
  return user;
}

// ════════════════════════════════════════════════════════════
// SIGN IN AS GUEST
// ════════════════════════════════════════════════════════════
describe('signInAsGuest', () => {
  beforeEach(resetStore);

  test('creates a guest user with expected defaults', () => {
    const user = getUser();
    expect(user.provider).toBe('guest');
    expect(user.isGuest).toBe(true);
    expect(user.totalXP).toBe(0);
    expect(user.coins).toBe(50);
    expect(user.streak).toBe(0);
    expect(user.unlockedEras).toContain('medieval');
    expect(user.unlockedEras).toContain('ancient');
    expect(user.unlockedBattles).toContain('grunwald-1410');
    expect(user.listenedBattles).toEqual([]);
    expect(user.visitedBattles).toEqual([]);
    expect(user.completedBattles).toEqual([]);
    expect(user.completedQuizzes).toEqual([]);
    expect(user.unlockedArtifacts).toEqual([]);
    expect(user.seenAchievementIds).toEqual([]);
    expect(user.hasCompletedFirstBattle).toBe(false);
  });

  test('guest id starts with "guest_"', () => {
    expect(getUser().id).toMatch(/^guest_\d+$/);
  });
});

// ════════════════════════════════════════════════════════════
// AWARD XP
// ════════════════════════════════════════════════════════════
describe('awardXP', () => {
  beforeEach(resetStore);

  test('adds XP to user', () => {
    useAppStore.getState().awardXP(100, 'test');
    expect(getUser().totalXP).toBe(100);
  });

  test('returns XP reward event', () => {
    const events = useAppStore.getState().awardXP(100, 'test');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('xp');
    expect(events[0].amount).toBe(100);
  });

  test('adds events to pendingRewards', () => {
    useAppStore.getState().awardXP(100, 'test');
    const pending = useAppStore.getState().pendingRewards;
    expect(pending.length).toBeGreaterThanOrEqual(1);
    expect(pending.some(e => e.type === 'xp')).toBe(true);
  });

  test('triggers level up at 500 XP and awards bonus coins', () => {
    const initialCoins = getUser().coins;
    const events = useAppStore.getState().awardXP(500, 'level up');
    // Should have XP event + level_up event
    expect(events).toHaveLength(2);
    expect(events[1].type).toBe('level_up');
    expect(events[1].level).toBe(2);
    // Level-up gives bonus coins
    expect(getUser().coins).toBe(initialCoins + COIN_REWARDS.level_up);
  });

  test('does not level up below threshold', () => {
    const events = useAppStore.getState().awardXP(499, 'test');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('xp');
    expect(levelFromXP(getUser().totalXP).level).toBe(1);
  });

  test('accumulates XP across multiple awards', () => {
    useAppStore.getState().awardXP(200, 'a');
    useAppStore.getState().awardXP(300, 'b');
    expect(getUser().totalXP).toBe(500);
  });

  test('returns empty array when no user', () => {
    useAppStore.setState({ user: null });
    const events = useAppStore.getState().awardXP(100, 'test');
    expect(events).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════
// AWARD COINS
// ════════════════════════════════════════════════════════════
describe('awardCoins', () => {
  beforeEach(resetStore);

  test('adds coins to user', () => {
    const initial = getUser().coins;
    useAppStore.getState().awardCoins(100, 'test');
    expect(getUser().coins).toBe(initial + 100);
  });

  test('returns coin reward event', () => {
    const events = useAppStore.getState().awardCoins(50, 'test');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('coins');
    expect(events[0].amount).toBe(50);
  });

  test('negative coins are clamped to 0', () => {
    // Guest starts with 50 coins
    useAppStore.getState().awardCoins(-9999, 'test');
    expect(getUser().coins).toBe(0);
  });

  test('deducting exact balance leaves 0', () => {
    const balance = getUser().coins;
    useAppStore.getState().awardCoins(-balance, 'test');
    expect(getUser().coins).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════
// MARK BATTLE LISTENED
// ════════════════════════════════════════════════════════════
describe('markBattleListened', () => {
  beforeEach(resetStore);

  test('adds battle to listenedBattles', () => {
    useAppStore.getState().markBattleListened('grunwald-1410');
    expect(getUser().listenedBattles).toContain('grunwald-1410');
  });

  test('first battle gives first_battle XP reward', () => {
    const initialXP = getUser().totalXP;
    useAppStore.getState().markBattleListened('grunwald-1410');
    expect(getUser().totalXP).toBeGreaterThanOrEqual(initialXP + XP_REWARDS.first_battle);
  });

  test('first battle gives first_battle coins', () => {
    const initialCoins = getUser().coins;
    useAppStore.getState().markBattleListened('grunwald-1410');
    expect(getUser().coins).toBeGreaterThanOrEqual(initialCoins + COIN_REWARDS.first_battle);
  });

  test('second battle gives regular listen XP (not first_battle)', () => {
    useAppStore.getState().markBattleListened('grunwald-1410');
    const xpAfterFirst = getUser().totalXP;
    useAppStore.getState().markBattleListened('waterloo-1815');
    const xpGain = getUser().totalXP - xpAfterFirst;
    // Should include listen_full XP + possibly achievement XP, but NOT first_battle again
    expect(xpGain).toBeGreaterThanOrEqual(XP_REWARDS.listen_full);
  });

  test('is idempotent — same battle returns empty on second call', () => {
    useAppStore.getState().markBattleListened('grunwald-1410');
    const rewards = useAppStore.getState().markBattleListened('grunwald-1410');
    expect(rewards).toEqual([]);
    // Should still have exactly 1 entry
    expect(getUser().listenedBattles.filter(b => b === 'grunwald-1410')).toHaveLength(1);
  });

  test('marks hasCompletedFirstBattle on first listen', () => {
    expect(getUser().hasCompletedFirstBattle).toBe(false);
    useAppStore.getState().markBattleListened('grunwald-1410');
    expect(getUser().hasCompletedFirstBattle).toBe(true);
  });

  test('updates activityLog for today', () => {
    useAppStore.getState().markBattleListened('grunwald-1410');
    const today = new Date().toISOString().slice(0, 10);
    expect(getUser().activityLog[today]).toBe(1);
  });
});

// ════════════════════════════════════════════════════════════
// MARK BATTLE VISITED (GPS)
// ════════════════════════════════════════════════════════════
describe('markBattleVisited', () => {
  beforeEach(resetStore);

  test('adds battle to visitedBattles', () => {
    useAppStore.getState().markBattleVisited('grunwald-1410');
    expect(getUser().visitedBattles).toContain('grunwald-1410');
  });

  test('awards GPS XP and coins', () => {
    const initXP = getUser().totalXP;
    const initCoins = getUser().coins;
    useAppStore.getState().markBattleVisited('grunwald-1410');
    expect(getUser().totalXP).toBeGreaterThanOrEqual(initXP + XP_REWARDS.visit_gps);
    expect(getUser().coins).toBeGreaterThanOrEqual(initCoins + COIN_REWARDS.visit_gps);
  });

  test('respects xpOverride and coinOverride', () => {
    const initXP = getUser().totalXP;
    const initCoins = getUser().coins;
    useAppStore.getState().markBattleVisited('grunwald-1410', 50, 10);
    expect(getUser().totalXP).toBeGreaterThanOrEqual(initXP + 50);
    expect(getUser().coins).toBeGreaterThanOrEqual(initCoins + 10);
  });

  test('is idempotent', () => {
    useAppStore.getState().markBattleVisited('grunwald-1410');
    const xpBefore = getUser().totalXP;
    const rewards = useAppStore.getState().markBattleVisited('grunwald-1410');
    expect(rewards).toEqual([]);
    expect(getUser().totalXP).toBe(xpBefore);
  });
});

// ════════════════════════════════════════════════════════════
// MARK BATTLE COMPLETED
// ════════════════════════════════════════════════════════════
describe('markBattleCompleted', () => {
  beforeEach(resetStore);

  test('adds to completedBattles and awards listen_all', () => {
    const initXP = getUser().totalXP;
    useAppStore.getState().markBattleCompleted('grunwald-1410');
    expect(getUser().completedBattles).toContain('grunwald-1410');
    expect(getUser().totalXP).toBeGreaterThanOrEqual(initXP + XP_REWARDS.listen_all);
  });

  test('is idempotent', () => {
    useAppStore.getState().markBattleCompleted('grunwald-1410');
    const rewards = useAppStore.getState().markBattleCompleted('grunwald-1410');
    expect(rewards).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════
// MARK QUIZ COMPLETED
// ════════════════════════════════════════════════════════════
describe('markQuizCompleted', () => {
  beforeEach(resetStore);

  test('adds to completedQuizzes', () => {
    useAppStore.getState().markQuizCompleted('grunwald-1410');
    expect(getUser().completedQuizzes).toContain('grunwald-1410');
  });

  test('is idempotent — does not duplicate entries', () => {
    useAppStore.getState().markQuizCompleted('grunwald-1410');
    useAppStore.getState().markQuizCompleted('grunwald-1410');
    expect(getUser().completedQuizzes.filter(q => q === 'grunwald-1410')).toHaveLength(1);
  });
});

// ════════════════════════════════════════════════════════════
// UNLOCK ARTIFACT
// ════════════════════════════════════════════════════════════
describe('unlockArtifact', () => {
  beforeEach(resetStore);

  test('adds artifact to unlockedArtifacts', () => {
    useAppStore.getState().unlockArtifact('artifact-001');
    expect(getUser().unlockedArtifacts).toContain('artifact-001');
  });

  test('is idempotent — does not duplicate', () => {
    useAppStore.getState().unlockArtifact('artifact-001');
    useAppStore.getState().unlockArtifact('artifact-001');
    expect(getUser().unlockedArtifacts.filter(a => a === 'artifact-001')).toHaveLength(1);
  });

  test('triggers checkAchievements', () => {
    // Unlocking 1 artifact should trigger first_artifact achievement
    useAppStore.getState().unlockArtifact('artifact-001');
    expect(getUser().seenAchievementIds).toContain('first_artifact');
  });
});

// ════════════════════════════════════════════════════════════
// UNLOCK ERA / UNLOCK ALL ERAS
// ════════════════════════════════════════════════════════════
describe('unlockEra / unlockAllEras', () => {
  beforeEach(resetStore);

  test('unlockEra adds era to unlockedEras', () => {
    useAppStore.getState().unlockEra('ww1');
    expect(getUser().unlockedEras).toContain('ww1');
  });

  test('unlockEra is idempotent', () => {
    useAppStore.getState().unlockEra('ww1');
    useAppStore.getState().unlockEra('ww1');
    expect(getUser().unlockedEras.filter(e => e === 'ww1')).toHaveLength(1);
  });

  test('unlockAllEras sets all 6 eras', () => {
    useAppStore.getState().unlockAllEras();
    const eras = getUser().unlockedEras;
    expect(eras).toContain('ancient');
    expect(eras).toContain('medieval');
    expect(eras).toContain('early_modern');
    expect(eras).toContain('napoleon');
    expect(eras).toContain('ww1');
    expect(eras).toContain('ww2');
    expect(eras).toHaveLength(6);
  });

  test('hasAllEras returns true after unlockAllEras', () => {
    expect(useAppStore.getState().hasAllEras()).toBe(false);
    useAppStore.getState().unlockAllEras();
    expect(useAppStore.getState().hasAllEras()).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════
// CAN ACCESS BATTLE
// ════════════════════════════════════════════════════════════
describe('canAccessBattle', () => {
  beforeEach(resetStore);

  test('can access directly unlocked battle', () => {
    // Guest starts with grunwald-1410 unlocked
    expect(useAppStore.getState().canAccessBattle('grunwald-1410')).toBe(true);
  });

  test('can access battle in unlocked era', () => {
    // Guest has medieval unlocked, agincourt is medieval
    expect(useAppStore.getState().canAccessBattle('agincourt-1415')).toBe(true);
  });

  test('cannot access battle in locked era', () => {
    // Guest doesn't have ww1 unlocked by default (only medieval + ancient)
    // But ypres is ww1, and ww1 is not free
    expect(useAppStore.getState().canAccessBattle('ypres-1914')).toBe(false);
  });

  test('can access after unlocking era', () => {
    expect(useAppStore.getState().canAccessBattle('ypres-1914')).toBe(false);
    useAppStore.getState().unlockEra('ww1');
    expect(useAppStore.getState().canAccessBattle('ypres-1914')).toBe(true);
  });

  test('returns false for nonexistent battle', () => {
    expect(useAppStore.getState().canAccessBattle('nonexistent-battle')).toBe(false);
  });

  test('returns false when no user', () => {
    useAppStore.setState({ user: null });
    expect(useAppStore.getState().canAccessBattle('grunwald-1410')).toBe(false);
  });

  test('can access campaign battle after purchasing campaign', () => {
    // Napoleon-pack contains austerlitz-1805 (napoleon era)
    // By default guest doesn't have napoleon era
    expect(useAppStore.getState().canAccessBattle('austerlitz-1805')).toBe(false);
    // Give user enough coins to purchase
    useAppStore.getState().awardCoins(500, 'test');
    useAppStore.getState().purchaseCampaign('napoleon-pack');
    expect(useAppStore.getState().canAccessBattle('austerlitz-1805')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════
// PURCHASE CAMPAIGN
// ════════════════════════════════════════════════════════════
describe('purchaseCampaign', () => {
  beforeEach(resetStore);

  test('deducts coins and adds campaign to ownedCampaigns', () => {
    // Give enough coins (napoleon-pack costs 350)
    useAppStore.getState().awardCoins(400, 'test');
    const coinsBefore = getUser().coins;
    useAppStore.getState().purchaseCampaign('napoleon-pack');
    expect(getUser().coins).toBe(coinsBefore - 350);
    expect(getUser().ownedCampaigns).toContain('napoleon-pack');
  });

  test('returns unlock event on success', () => {
    useAppStore.getState().awardCoins(400, 'test');
    const events = useAppStore.getState().purchaseCampaign('napoleon-pack');
    expect(events.some(e => e.type === 'unlock')).toBe(true);
  });

  test('returns empty if not enough coins', () => {
    // Guest has 50 coins, campaign costs 350
    const events = useAppStore.getState().purchaseCampaign('napoleon-pack');
    expect(events).toEqual([]);
    // Coins unchanged
    expect(getUser().coins).toBe(50);
    // Campaign not added
    expect(getUser().ownedCampaigns ?? []).not.toContain('napoleon-pack');
  });

  test('is idempotent — cannot buy same campaign twice', () => {
    useAppStore.getState().awardCoins(800, 'test');
    useAppStore.getState().purchaseCampaign('napoleon-pack');
    const coinsAfterFirst = getUser().coins;
    const events = useAppStore.getState().purchaseCampaign('napoleon-pack');
    expect(events).toEqual([]);
    expect(getUser().coins).toBe(coinsAfterFirst); // no deduction
  });

  test('returns empty for nonexistent campaign', () => {
    useAppStore.getState().awardCoins(9999, 'test');
    const events = useAppStore.getState().purchaseCampaign('nonexistent');
    expect(events).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════
// CHECK DAILY STREAK
// ════════════════════════════════════════════════════════════
describe('checkDailyStreak', () => {
  beforeEach(resetStore);

  test('returns empty if already checked today', () => {
    // Guest's lastActive is set to now, so today === lastActive
    const rewards = useAppStore.getState().checkDailyStreak();
    expect(rewards).toEqual([]);
  });

  test('resets streak to 1 if last active was more than 1 day ago', () => {
    // Set lastActive to 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    useAppStore.setState(s => ({
      user: s.user ? { ...s.user, lastActive: threeDaysAgo.toISOString(), streak: 5 } : null,
    }));
    useAppStore.getState().checkDailyStreak();
    expect(getUser().streak).toBe(1);
  });

  test('increments streak if last active was yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    useAppStore.setState(s => ({
      user: s.user ? { ...s.user, lastActive: yesterday.toISOString(), streak: 3 } : null,
    }));
    useAppStore.getState().checkDailyStreak();
    expect(getUser().streak).toBe(4);
  });

  test('awards streak XP multiplied by streak count', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    useAppStore.setState(s => ({
      user: s.user ? { ...s.user, lastActive: yesterday.toISOString(), streak: 3, totalXP: 0 } : null,
    }));
    useAppStore.getState().checkDailyStreak();
    // Streak 3 → new streak 4, XP = daily_streak * 4
    expect(getUser().totalXP).toBeGreaterThanOrEqual(XP_REWARDS.daily_streak * 4);
  });

  test('awards streak coins', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const coins = getUser().coins;
    useAppStore.setState(s => ({
      user: s.user ? { ...s.user, lastActive: yesterday.toISOString(), streak: 1 } : null,
    }));
    useAppStore.getState().checkDailyStreak();
    expect(getUser().coins).toBeGreaterThanOrEqual(coins + COIN_REWARDS.daily_streak);
  });
});

// ════════════════════════════════════════════════════════════
// CHECK ACHIEVEMENTS
// ════════════════════════════════════════════════════════════
describe('checkAchievements', () => {
  beforeEach(resetStore);

  test('first_listen triggers after 1 battle listened', () => {
    useAppStore.getState().markBattleListened('grunwald-1410');
    expect(getUser().seenAchievementIds).toContain('first_listen');
  });

  test('five_listens triggers after 5 battles', () => {
    const battles = ['grunwald-1410', 'waterloo-1815', 'verdun-1916', 'stalingrad-1942', 'britain-1940'];
    battles.forEach(b => useAppStore.getState().markBattleListened(b));
    expect(getUser().seenAchievementIds).toContain('five_listens');
  });

  test('first_quiz triggers after markQuizCompleted', () => {
    useAppStore.getState().markQuizCompleted('grunwald-1410');
    expect(getUser().seenAchievementIds).toContain('first_quiz');
  });

  test('three_quizzes triggers after 3 quizzes', () => {
    ['grunwald-1410', 'waterloo-1815', 'verdun-1916'].forEach(b =>
      useAppStore.getState().markQuizCompleted(b));
    expect(getUser().seenAchievementIds).toContain('three_quizzes');
  });

  test('first_gps triggers after 1 visited battle', () => {
    useAppStore.getState().markBattleVisited('grunwald-1410');
    expect(getUser().seenAchievementIds).toContain('first_gps');
  });

  test('first_artifact triggers after unlockArtifact', () => {
    useAppStore.getState().unlockArtifact('test-artifact');
    expect(getUser().seenAchievementIds).toContain('first_artifact');
  });

  test('all_perspectives triggers after 1 completed battle', () => {
    useAppStore.getState().markBattleCompleted('grunwald-1410');
    expect(getUser().seenAchievementIds).toContain('all_perspectives');
  });

  test('xp_5000 triggers at 5000 XP', () => {
    // Award enough XP to reach 5000
    useAppStore.getState().awardXP(5000, 'test');
    useAppStore.getState().checkAchievements();
    expect(getUser().seenAchievementIds).toContain('xp_5000');
  });

  test('achievement XP rewards are applied', () => {
    // first_listen achievement gives 50 XP
    const xpBefore = getUser().totalXP;
    useAppStore.getState().markBattleListened('grunwald-1410');
    const xpAfter = getUser().totalXP;
    // Should include: first_battle XP (200) + first_listen achievement XP (50) + first_battle coins (50)
    const expectedMin = XP_REWARDS.first_battle + ACHIEVEMENT_XP_REWARDS.first_listen;
    expect(xpAfter - xpBefore).toBeGreaterThanOrEqual(expectedMin);
  });

  test('achievements are not duplicated on repeated checks', () => {
    useAppStore.getState().markBattleListened('grunwald-1410');
    const seen1 = getUser().seenAchievementIds.filter(a => a === 'first_listen');
    expect(seen1).toHaveLength(1);
    // Call checkAchievements again
    useAppStore.getState().checkAchievements();
    const seen2 = getUser().seenAchievementIds.filter(a => a === 'first_listen');
    expect(seen2).toHaveLength(1);
  });

  test('newly unlocked achievements are added to pendingUnlocks', () => {
    useAppStore.setState({ pendingUnlocks: [] });
    useAppStore.getState().markBattleListened('grunwald-1410');
    expect(useAppStore.getState().pendingUnlocks).toContain('first_listen');
  });
});

// ════════════════════════════════════════════════════════════
// CLEAR PENDING REWARDS / DISMISS ACHIEVEMENT
// ════════════════════════════════════════════════════════════
describe('clearPendingRewards / dismissAchievementUnlock', () => {
  beforeEach(resetStore);

  test('clearPendingRewards empties the queue', () => {
    useAppStore.getState().awardXP(100, 'test');
    expect(useAppStore.getState().pendingRewards.length).toBeGreaterThan(0);
    useAppStore.getState().clearPendingRewards();
    expect(useAppStore.getState().pendingRewards).toEqual([]);
  });

  test('dismissAchievementUnlock removes first from queue', () => {
    useAppStore.setState({ pendingUnlocks: ['a', 'b', 'c'] });
    useAppStore.getState().dismissAchievementUnlock();
    expect(useAppStore.getState().pendingUnlocks).toEqual(['b', 'c']);
  });
});

// ════════════════════════════════════════════════════════════
// EDUCATOR MODE
// ════════════════════════════════════════════════════════════
describe('setEducatorMode', () => {
  beforeEach(resetStore);

  test('enables educator mode', () => {
    useAppStore.getState().setEducatorMode(true);
    expect(getUser().isEducator).toBe(true);
  });

  test('disables educator mode', () => {
    useAppStore.getState().setEducatorMode(true);
    useAppStore.getState().setEducatorMode(false);
    expect(getUser().isEducator).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════
// SIGN OUT
// ════════════════════════════════════════════════════════════
describe('signOut', () => {
  beforeEach(resetStore);

  test('sets user to null', async () => {
    await useAppStore.getState().signOut();
    expect(useAppStore.getState().user).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════
// GET LEVEL INFO
// ════════════════════════════════════════════════════════════
describe('getLevelInfo', () => {
  beforeEach(resetStore);

  test('returns level 1 for new guest', () => {
    const info = useAppStore.getState().getLevelInfo();
    expect(info.level).toBe(1);
    expect(info.currentXP).toBe(0);
    expect(info.xpToNext).toBe(500);
  });

  test('reflects XP changes', () => {
    useAppStore.getState().awardXP(600, 'test');
    const info = useAppStore.getState().getLevelInfo();
    expect(info.level).toBe(2);
    expect(info.currentXP).toBe(100);
  });
});
