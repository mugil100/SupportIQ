const { validationResult } = require("express-validator");

/**
 * Reads express-validator results and short-circuits with a structured
 * error envelope if any chain failed.
 *
 * Response shape on failure:
 * {
 *   "errors": [
 *     { "field": "email",   "message": "Must be a valid email" },
 *     { "field": "password","message": "Must be at least 8 characters" }
 *   ]
 * }
 */
const validate = (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const errors = result.array().map((err) => ({
        field: err.path ?? err.param ?? null,
        message: err.msg,
    }));

    return res.status(400).json({ errors });
};

module.exports = { validate };
