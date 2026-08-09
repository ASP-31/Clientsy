const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const Client = require('../Models/Client');
const clientController = require('../Controllers/clientController');

// Stub the Mongo model statics so tests run without a live DB.
const originalFind = Client.find;
const originalCount = Client.countDocuments;

const mockChain = (docs) => {
  const chain = {};
  chain.lean = () => chain;
  chain.sort = () => chain;
  chain.skip = () => chain;
  chain.limit = (n) => {
    chain._limit = n;
    return chain;
  };
  chain.then = (resolve) => {
    resolve(docs || chain._docs || []);
    return Promise.resolve();
  };
  return chain;
};

after(() => {
  Client.find = originalFind;
  Client.countDocuments = originalCount;
});

test('getClients applies owner filter, search regex and pagination', async () => {
  const call = { search: 'Acme', page: '2', limit: '10' };
  let capturedFilter;

  Client.find = (filter) => {
    capturedFilter = filter;
    return mockChain([{ _id: '507f1f77bcf86cd799439011', name: 'Acme Corp' }]);
  };
  Client.countDocuments = async (filter) => {
    assert.deepEqual(filter, capturedFilter);
    return 23;
  };

  let statusCode;
  const res = {
    status(code) { statusCode = code; return this; },
    json(body) { res._body = body; return this; }
  };

  await clientController.getClients({ user: { id: 'owner-1' }, query: call }, res);

  assert.equal(statusCode, 200);
  assert.equal(capturedFilter.owner, 'owner-1');
  assert.equal(Array.isArray(capturedFilter.$or), true);
  assert.equal(capturedFilter.$or[0].name.$regex, 'Acme');
  assert.equal(capturedFilter.$or[0].name.$regex, 'Acme');
  assert.equal(capturedFilter.$or[0].name.$options, 'i');
  assert.deepEqual(res._body.pagination, { total: 23, page: 2, limit: 10, totalPages: 3 });
  assert.equal(res._body.data.length, 1);
});

test('getClients falls back to default page/limit and clamps limit to 1000', async () => {
  let captured;

  Client.find = (filter) => {
    const chain = mockChain([]);
    chain.limit = (n) => { captured = n; return chain; };
    return chain;
  };
  Client.countDocuments = async () => 5;

  const res = {
    status() { return this; },
    json(body) { res._body = body; return this; }
  };

  await clientController.getClients({ user: { id: 'owner-1' }, query: { limit: '5000' } }, res);

  assert.equal(captured, 1000);
  assert.equal(res._body.pagination.page, 1);
  assert.equal(res._body.pagination.totalPages, 1);
});