const jwt = require('jsonwebtoken');
const refreshToken = require('./refreshToken');
const userHelper = require('../helpers/userHelper');
require('dotenv').config();


const verifyToken = (req, res, next) => {

    if (req.cookies?.accessToken || req.cookies?.refreshToken) {

        // Check if access token is present in header or cookies
        const accessToken = req.cookies.accessToken;
        if (!accessToken) {
            return res.status(401).send({ data: 'Access token is missing', error: true });
        }

        // Verify access token
        try {
            const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
            userHelper.getUser(decoded.user_id).then((userDetails) => {
                // Do something with the user ID (e.g., fetch user data from database)
                return res.status(200).json({ user: userDetails._doc, error: false }); // Return protected data
            }).catch((err) => {
                if (err.status_code === 404) res.status(404).json(err)
                else res.status(500).json(err)
            })
        } catch (err) {
            // Refreh the ACCESS Token using REFREH Token
            return refreshToken(req, res, next, verifyToken)
        }

    } else {
        return res.status(401).send({ data: 'Cookie is not recieved', error: true });
    }
}

module.exports = verifyToken;