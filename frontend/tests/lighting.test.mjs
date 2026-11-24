import { test } from 'node:test';
import assert from 'node:assert/strict';
import { litKeys } from '../src/domain/lighting.ts';

test('the next character lights its key in its finger colour', () => {
  assert.deepEqual(litKeys('f'), [{ key: 'f', color: [34, 197, 94] }]);
  assert.deepEqual(litKeys(' '), [{ key: ' ', color: [148, 163, 184] }]);
});

test('capitals and symbols also light the Shift on the other hand', () => {
  assert.deepEqual(litKeys('A'), [{ key: 'a', color: [244, 63, 94] }, { key: 'shift-right', color: [217, 70, 239] }]);
  assert.deepEqual(litKeys('?'), [{ key: '/', color: [217, 70, 239] }, { key: 'shift-left', color: [244, 63, 94] }]);
});

test('nothing is lit between exercises or for keys off the keyboard', () => {
  assert.deepEqual(litKeys(''), []);
  assert.deepEqual(litKeys('é'), []);
});
