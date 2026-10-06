import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../src/services/client.ts';

test('desktop boundary sends bounded structured commands', async () => {
  const calls = [];
  const client = createClient(async (command, args) => { calls.push([command, args]); return []; });
  await client.lessons();
  await client.history('User1');
  await client.history('User1', 42);
  const input = { username: 'User1', lesson_id: 999, wpm: 42, accuracy: 0 };
  await client.save(input);
  await client.close();
  await client.restart();
  await client.version();
  assert.deepEqual(calls, [
    ['get_lessons', undefined],
    ['get_progress', { username: 'User1', limit: 100, before: null }],
    ['get_progress', { username: 'User1', limit: 100, before: 42 }],
    ['save_progress', { input }], ['stop_application', undefined],
    ['restart_application', undefined], ['app_version', undefined],
  ]);
});

test('save failures propagate without retrying a potentially committed write', async () => {
  let writes = 0;
  const client = createClient(async () => { writes++; throw new Error('Storage unavailable'); });
  await assert.rejects(client.save({ username: 'User1', lesson_id: 1, wpm: 42, accuracy: 98 }));
  assert.equal(writes, 1);
});
