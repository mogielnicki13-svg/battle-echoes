import { QUIZ_DATA } from '../data/quizData';

describe('Quiz Data', () => {
  const allKeys = Object.keys(QUIZ_DATA);
  const battleIds = allKeys.filter(k => k !== '__default__');

  test('has quiz data for at least 15 battles', () => {
    expect(battleIds.length).toBeGreaterThanOrEqual(15);
  });

  test.each(battleIds)('%s has exactly 5 questions', (battleId) => {
    expect(QUIZ_DATA[battleId]).toHaveLength(5);
  });

  test('__default__ fallback exists with at least 1 question', () => {
    expect(QUIZ_DATA['__default__']).toBeDefined();
    expect(QUIZ_DATA['__default__'].length).toBeGreaterThanOrEqual(1);
  });

  test.each(battleIds)('%s questions have valid structure', (battleId) => {
    for (const q of QUIZ_DATA[battleId]) {
      expect(q.question).toBeTruthy();
      expect(q.options).toHaveLength(4);
      expect(q.correct).toBeGreaterThanOrEqual(0);
      expect(q.correct).toBeLessThanOrEqual(3);
      expect(q.explanation).toBeTruthy();
      // Each option should be non-empty
      q.options.forEach((opt: string) => expect(opt.length).toBeGreaterThan(0));
    }
  });
});
