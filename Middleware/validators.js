const { body, validationResult } = require('express-validator');

// Runs express-validator chains and sends a 400 with a field-keyed `errors`
// object (matches the frontend's existing err.errors[field] convention).
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const byField = {};
    errors.array().forEach((err) => {
      byField[err.param] = byField[err.param] || { message: err.msg };
    });
    const first = errors.array()[0];
    return res.status(400).json({
      success: false,
      message: first ? first.msg : 'Validation failed',
      errors: byField
    });
  }
  next();
};

const registerValidators = [
  body('name')
    .trim()
    .notEmpty().withMessage('Please provide a name')
    .isLength({ max: 80 }).withMessage('Name cannot be longer than 80 characters'),
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(['developer', 'client']).withMessage('Role must be developer or client'),
  validate
];

const loginValidators = [
  body('email')
    .trim()
    .notEmpty().withMessage('Please provide an email')
    .isEmail().withMessage('Please provide a valid email'),
  body('password')
    .notEmpty().withMessage('Please provide a password'),
  validate
];

const createClientValidators = [
  body('name')
    .trim()
    .notEmpty().withMessage('Client name is required'),
  body('email')
    .trim()
    .notEmpty().withMessage('Client email is required')
    .isEmail().withMessage('Please provide a valid client email'),
  body('status')
    .optional()
    .isIn(['lead', 'active', 'on-hold', 'completed']).withMessage('Invalid client status'),
  body('leadStage')
    .optional()
    .isIn(['new', 'in-talks', 'proposal-sent', 'won', 'lost', 'none']).withMessage('Invalid lead stage'),
  body('leadValue')
    .optional()
    .isFloat({ min: 0 }).withMessage('Lead value must be a non-negative number'),
  body('tags')
    .optional()
    .custom((tags) => {
      if (typeof tags === 'string') return true;
      if (Array.isArray(tags) && tags.every((t) => typeof t === 'string')) return true;
      throw new Error('Tags must be a comma-separated string or an array of strings');
    }),
  validate
];

const updateClientValidators = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Client name cannot be empty'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid client email'),
  body('status')
    .optional()
    .isIn(['lead', 'active', 'on-hold', 'completed']).withMessage('Invalid client status'),
  body('leadStage')
    .optional()
    .isIn(['new', 'in-talks', 'proposal-sent', 'won', 'lost', 'none']).withMessage('Invalid lead stage'),
  body('leadValue')
    .optional()
    .isFloat({ min: 0 }).withMessage('Lead value must be a non-negative number'),
  body('tags')
    .optional()
    .custom((tags) => {
      if (typeof tags === 'string') return true;
      if (Array.isArray(tags) && tags.every((t) => typeof t === 'string')) return true;
      throw new Error('Tags must be a comma-separated string or an array of strings');
    }),
  validate
];

const invoiceValidators = [
  body('client')
    .notEmpty().withMessage('Client is required'),
  body('invoiceNumber')
    .trim()
    .notEmpty().withMessage('Invoice number is required'),
  body('items')
    .optional()
    .isArray().withMessage('Items must be an array'),
  body('items.*.qty')
    .optional()
    .isFloat({ min: 0 }).withMessage('Item quantity must be non-negative'),
  body('items.*.rate')
    .optional()
    .isFloat({ min: 0 }).withMessage('Item rate must be non-negative'),
  body('items.*.amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('Item amount must be non-negative'),
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  validate
];

module.exports = {
  invoiceValidators,
  updateClientValidators,
  createClientValidators,
  loginValidators,
  registerValidators
};