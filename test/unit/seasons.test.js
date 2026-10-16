const { test } = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../../src/renderer/js/seasons/season.js');

test('automatic season follows the calendar, with Halloween, Christmas and the configured birthday', async () => {
  const { seasonForDate } = await load();
  const cases = {
    '2026-10-16': 'autumn',
    '2026-10-24': 'halloween',
    '2026-10-31': 'halloween',
    '2026-11-01': 'halloween',
    '2026-11-02': 'autumn',
    '2026-11-03': 'birthday',
    '2026-11-04': 'autumn',
    '2026-12-01': 'christmas',
    '2027-01-06': 'christmas',
    '2027-01-07': 'winter',
    '2027-02-28': 'winter',
    '2027-03-01': 'spring',
    '2027-06-15': 'summer',
    '2027-09-01': 'autumn',
  };
  for (const [day, season] of Object.entries(cases)) assert.equal(seasonForDate(day, '11-03'), season, day);
  // Without a configured birthday (the committed placeholder) that day is just autumn.
  assert.equal(seasonForDate('2026-11-03', ''), 'autumn');
  assert.equal(seasonForDate('2027-04-20', '04-20'), 'birthday');
});

test('manual choice and effect switches', async () => {
  const { resolveSeason, activeFx, SEASONS, SEASON_FX, SEASON_SOUND } = await load();
  assert.equal(resolveSeason('none', '2026-11-03'), null);
  assert.equal(resolveSeason('spring', '2026-11-03'), 'spring');
  assert.equal(resolveSeason('auto', '2026-11-03', '11-03'), 'birthday');
  assert.equal(resolveSeason('auto', '2026-11-03', ''), 'autumn');
  assert.deepEqual(activeFx('autumn', { rain: false }), ['leaves', 'decor']);
  assert.deepEqual(activeFx(null, {}), []);
  for (const s of SEASONS) {
    assert.ok(SEASON_FX[s]?.length, s);
    assert.ok(SEASON_SOUND[s], s);
  }
});
