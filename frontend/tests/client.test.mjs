import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '../src/services/client.ts';

test('desktop boundary sends bounded structured commands', async () => {
  const calls = [];
  const client = createClient(async (command, args) => { calls.push([command, args]); return []; });
  await client.lessons();
  await client.history('User1');
  await client.history('User1', 42);
  await client.summary('User1');
  const input = {
    username: 'User1', mode: 'custom', lesson_id: null, wpm: 42, raw_wpm: 45, accuracy: 0,
    duration_ms: 1000, characters: 10, errors: 10, keys: [],
  };
  await client.save(input);
  await client.close();
  await client.restart();
  await client.version();
  await client.dataLocation();
  await client.lightingConnect();
  await client.lightingConnect(7000);
  await client.lightingHighlight(3, [{ key: 'a', color: [1, 2, 3] }]);
  await client.lightingDisconnect();
  assert.deepEqual(calls, [
    ['get_lessons', undefined],
    ['get_progress', { username: 'User1', limit: 100, before: null }],
    ['get_progress', { username: 'User1', limit: 100, before: 42 }],
    ['get_summary', { username: 'User1' }],
    ['save_progress', { input }], ['stop_application', undefined],
    ['restart_application', undefined], ['app_version', undefined], ['data_location', undefined],
    ['lighting_connect', { port: null }], ['lighting_connect', { port: 7000 }],
    ['lighting_highlight', { frame: 3, keys: [{ key: 'a', color: [1, 2, 3] }] }], ['lighting_disconnect', undefined],
  ]);
});

test('save failures propagate without retrying a potentially committed write', async () => {
  let writes = 0;
  const client = createClient(async () => { writes++; throw new Error('Storage unavailable'); });
  await assert.rejects(client.save({
    username: 'User1', mode: 'lesson', lesson_id: 1, wpm: 42, raw_wpm: 42, accuracy: 98,
    duration_ms: 1000, characters: 10, errors: 0, keys: [],
  }));
  assert.equal(writes, 1);
});
