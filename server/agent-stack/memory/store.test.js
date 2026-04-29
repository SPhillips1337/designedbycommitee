const test = require('node:test');
const assert = require('node:assert');
const { createStore } = require('./store.js');

test('store.js', async (t) => {
  let store;

  t.beforeEach(() => {
    store = createStore();
  });

  await t.test('saveContext should add data to history', () => {
    const data = { message: 'hello' };
    store.saveContext(data);
    const context = store.getContext();
    assert.strictEqual(context.history.length, 1);
    assert.deepStrictEqual(context.history[0], data);
  });

  await t.test('saveContext should limit history to 100 items', () => {
    for (let i = 0; i < 110; i++) {
      store.saveContext({ id: i });
    }
    const context = store.getContext();
    assert.strictEqual(context.history.length, 100);
    // The first 10 items (0-9) should have been shifted out
    assert.strictEqual(context.history[0].id, 10);
    assert.strictEqual(context.history[99].id, 109);
  });

  await t.test('getContext should return the current store', () => {
    const context = store.getContext();
    assert.ok(context.history);
    assert.strictEqual(Array.isArray(context.history), true);
  });
});
