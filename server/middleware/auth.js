const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    console.log("Auth header:", req.headers.authorization);

    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    } else if (authHeader) {
        token = authHeader;
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

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
