import { ALL_ARTIFACTS, getArtifactsForBattle, getCollectionStats, RARITY_META } from '../artifacts/data';

describe('Artifacts', () => {
  test('ALL_ARTIFACTS has items', () => {
    expect(ALL_ARTIFACTS.length).toBeGreaterThan(0);
  });

  test('each artifact has required fields', () => {
    for (const a of ALL_ARTIFACTS) {
      expect(a.id).toBeTruthy();
      expect(a.battleId).toBeTruthy();
      expect(a.name).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(['common', 'uncommon', 'rare', 'legendary']).toContain(a.rarity);
      expect(a.icon).toBeTruthy();
      expect(a.unlockCondition).toBeTruthy();
    }
  });

  test('artifact IDs are unique', () => {
    const ids = ALL_ARTIFACTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('getArtifactsForBattle returns correct subset', () => {
    const grunwald = getArtifactsForBattle('grunwald-1410');
    expect(grunwald.length).toBe(6);
    grunwald.forEach(a => expect(a.battleId).toBe('grunwald-1410'));
  });

  test('getCollectionStats works', () => {
    const stats = getCollectionStats([]);
    expect(stats.total).toBe(ALL_ARTIFACTS.length);
    expect(stats.unlocked).toBe(0);
  });

  test('RARITY_META has all rarities', () => {
    expect(RARITY_META.common).toBeDefined();
    expect(RARITY_META.uncommon).toBeDefined();
    expect(RARITY_META.rare).toBeDefined();
    expect(RARITY_META.legendary).toBeDefined();
  });
});
