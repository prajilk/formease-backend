const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
    const { authorization } = req.headers;

    if (!authorization) {
        return res.status(401).json({ error: "Authorization token required" })
    }

    const token = authorization.split(" ")[1];

    try {
        const user = jwt.verify(token, process.env.TOKEN_SECRET)
        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({ error: "Request is not Authorized" })
    }
}

module.exports = {
    verifyToken
}