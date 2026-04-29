const test = require('node:test');
const assert = require('node:assert');
const { getContext, saveContext, resetStore } = require('./store.js');

test('store.js', async (t) => {
  t.beforeEach(() => {
    resetStore();
  });

  await t.test('saveContext should add data to history', () => {
    const data = { message: 'hello' };
    saveContext(data);
    const context = getContext();
    assert.strictEqual(context.history.length, 1);
    assert.deepStrictEqual(context.history[0], data);
  });

  await t.test('saveContext should limit history to 100 items', () => {
    for (let i = 0; i < 110; i++) {
      saveContext({ id: i });
    }
    const context = getContext();
    assert.strictEqual(context.history.length, 100);
    // The first 10 items (0-9) should have been shifted out
    assert.strictEqual(context.history[0].id, 10);
    assert.strictEqual(context.history[99].id, 109);
  });

  await t.test('getContext should return the current store', () => {
    const context = getContext();
    assert.ok(context.history);
    assert.strictEqual(Array.isArray(context.history), true);
  });
});
