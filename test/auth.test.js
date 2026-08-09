const { test } = require('node:test');
const assert = require('node:assert/strict');
const { restrictTo } = require('../Middleware/auth');

const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.body = obj;
    return res;
  };
  return res;
};

test('restrictTo passes for allowed role', () => {
  const middleware = restrictTo('developer', 'admin');
  const req = { user: { role: 'developer' } };
  const res = makeRes();
  let called = false;
  middleware(req, res, () => { called = true; });
  assert.equal(called, true);
});

test('restrictTo blocks disallowed role with 403', () => {
  const middleware = restrictTo('developer');
  const req = { user: { role: 'client' } };
  const res = makeRes();
  middleware(req, res, () => { throw new Error('should not call next'); });
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'You do not have permission to perform this action');
});

test('restrictTo blocks missing req.user with 401', () => {
  const middleware = restrictTo('developer');
  const res = makeRes();
  middleware({}, res, () => { throw new Error('should not call next'); });
  assert.equal(res.statusCode, 401);
});