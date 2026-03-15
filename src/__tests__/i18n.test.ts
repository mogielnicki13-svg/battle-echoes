import pl from '../i18n/locales/pl';
import en from '../i18n/locales/en';

// Deep-check that EN has all the same keys as PL
function getAllKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

describe('i18n Translations', () => {
  const plKeys = getAllKeys(pl);
  const enKeys = getAllKeys(en);

  test('PL has at least 100 translation keys', () => {
    expect(plKeys.length).toBeGreaterThanOrEqual(100);
  });

  test('EN has the same number of keys as PL', () => {
    expect(enKeys.length).toBe(plKeys.length);
  });

  test('all PL keys exist in EN', () => {
    const missingInEN = plKeys.filter(k => !enKeys.includes(k));
    expect(missingInEN).toEqual([]);
  });

  test('all EN keys exist in PL', () => {
    const missingInPL = enKeys.filter(k => !plKeys.includes(k));
    expect(missingInPL).toEqual([]);
  });

  test('no empty translation values in PL', () => {
    const getValue = (obj: any, path: string): any => {
      return path.split('.').reduce((o, k) => o?.[k], obj);
    };
    for (const key of plKeys) {
      const val = getValue(pl, key);
      expect(val).toBeTruthy();
    }
  });

  test('no empty translation values in EN', () => {
    const getValue = (obj: any, path: string): any => {
      return path.split('.').reduce((o, k) => o?.[k], obj);
    };
    for (const key of enKeys) {
      const val = getValue(en, key);
      expect(val).toBeTruthy();
    }
  });
});
