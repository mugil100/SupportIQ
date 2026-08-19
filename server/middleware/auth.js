const jwt = require("jsonwebtoken");
const { extractTokenFromHeaderOrQuery } = require("../utils/helpers");

const verifyToken = (req, res, next) => {
    console.log("Auth header:", req.headers.authorization);

    const token = extractTokenFromHeaderOrQuery(
        req.headers.authorization,
        req.query ? req.query.token : null
    );

    if (!token) return res.status(401).json({ error: "No token" });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        console.log("Decoded JWT:", decoded);
        if (err) return res.status(403).json({ error: "Invalid Token" });

        req.customer_id = decoded.customer_id;
        req.role = decoded.role;
        next();
    });
};

module.exports = { verifyToken };
