const crypto = require('crypto');
const mongoose = require('mongoose');
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

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toErrorPayload = (error, fallback = 'Server Error') => {
  // Client-reported status (404/400/409 etc.)
  if (error.statusCode) {
    return { statusCode: error.statusCode, message: error.message };
  }

  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((val) => val.message);
    return { statusCode: 400, message: messages.join(', ') };
  }

  // Malformed ObjectId
  if (error.name === 'CastError') {
    return { statusCode: 400, message: 'Invalid ID format' };
  }

  // Duplicate key (Mongo error 11000)
  if (error.code === 11000) {
    const fields = Object.keys(error.keyPattern || {}).join(', ');
    return { statusCode: 409, message: `${fields} already exists` };
  }

  return { statusCode: 500, message: fallback };
};

const handleControllerError = (res, error, fallback = 'Server Error') => {
  const { statusCode, message } = toErrorPayload(error, fallback);
  return res.status(statusCode).json({ success: false, message });
};

/**
 * Wraps an async Express handler so rejected promises are forwarded
 * to the global error middleware instead of crashing the process.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const omitProtectedFields = (body, fields = ['owner', 'uploadedBy']) => {
  const payload = { ...body };
  fields.forEach((field) => delete payload[field]);
  return payload;
};

module.exports = {
  assertOwnedClient,
  asyncHandler,
  getJwtSecret,
  handleControllerError,
  isValidObjectId,
  makeToken,
  omitProtectedFields,
  requireOwnedClient,
  toErrorPayload
};