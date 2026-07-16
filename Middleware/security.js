const crypto = require('crypto');
const Client = require('../Models/Client');

const insecureSecrets = new Set([
  'clientsy_super_secret_dev_key',
  'your_jwt_secret_here',
  'changeme',
  'secret'
]);

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || insecureSecrets.has(secret)) {
    throw new Error('JWT_SECRET must be set to a strong value of at least 32 characters.');
  }
  return secret;
};

const makeToken = () => crypto.randomBytes(32).toString('hex');

const requireOwnedClient = async (clientId, ownerId) => {
  if (!clientId) {
    return null;
  }

  return Client.findOne({ _id: clientId, owner: ownerId }).select('_id email name owner');
};

const assertOwnedClient = async (clientId, ownerId) => {
  const client = await requireOwnedClient(clientId, ownerId);
  if (!client) {
    const error = new Error('Client not found');
    error.statusCode = 404;
    throw error;
  }
  return client;
};

const handleControllerError = (res, error, fallback = 'Server Error') => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((val) => val.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  return res.status(500).json({ success: false, message: fallback });
};

const omitProtectedFields = (body, fields = ['owner', 'uploadedBy']) => {
  const payload = { ...body };
  fields.forEach((field) => delete payload[field]);
  return payload;
};

module.exports = {
  assertOwnedClient,
  getJwtSecret,
  handleControllerError,
  makeToken,
  omitProtectedFields,
  requireOwnedClient
};
