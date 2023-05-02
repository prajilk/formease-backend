const jwt = require('jsonwebtoken');
require('dotenv').config();
const userHelper = require('../helpers/userHelper');

const createTokens = (req, res) => {

    userHelper.login(req.body).then((validUser) => {

        // Generate access token (expires in 15 minutes)
        const accessToken = jwt.sign({ user_id: validUser._id.toString() }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

        // Generate refresh token (expires in 3 days)
        const refreshToken = jwt.sign({ user_id: validUser._id.toString() }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '3d' });

        // Set refresh token in cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            sameSite: 'none',
            secure: true,
            maxAge: 259200000 // 3 Days
        });

        // Set access token in cookie
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            sameSite: 'none',
            secure: true,
            maxAge: 259200000 // 3 Days
        });

        res.status(200).json({ login: 'Success' })
    }).catch((err) => {
        return res.status(401).json({ login: 'Failed', error: err })
    })
}

module.exports = createTokens;