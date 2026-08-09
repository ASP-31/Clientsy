const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toErrorPayload, isValidObjectId } = require('../Middleware/security');

test('toErrorPayload preserves explicit statusCode + message', () => {
  const error = new Error('Not found');
  error.statusCode = 404;
  assert.deepEqual(toErrorPayload(error), { statusCode: 404, message: 'Not found' });
});

test('toErrorPayload maps Mongoose ValidationError to 400', () => {
  const error = { name: 'ValidationError', errors: { email: { message: 'Please add a valid email' } } };
  assert.deepEqual(toErrorPayload(error), { statusCode: 400, message: 'Please add a valid email' });
});

test('toErrorPayload maps CastError to 400 with generic message', () => {
  const error = { name: 'CastError' };
  assert.deepEqual(toErrorPayload(error), { statusCode: 400, message: 'Invalid ID format' });
});

test('toErrorPayload maps duplicate key (11000) to 409', () => {
  const error = { code: 11000, keyPattern: { email: 1 } };
  assert.deepEqual(toErrorPayload(error), { statusCode: 409, message: 'email already exists' });
});

test('toErrorPayload falls back to 500 + fallback message for unknown errors', () => {
  const error = new Error('boom');
  assert.deepEqual(toErrorPayload(error), { statusCode: 500, message: 'Server Error' });
  assert.deepEqual(toErrorPayload(error, 'Custom fallback'), { statusCode: 500, message: 'Custom fallback' });
});

test('isValidObjectId accepts valid ObjectIds and rejects junk', () => {
  assert.equal(isValidObjectId('507f1f77bcf86cd799439011'), true);
  assert.equal(isValidObjectId('not-an-id'), false);
  assert.equal(isValidObjectId(undefined), false);
});