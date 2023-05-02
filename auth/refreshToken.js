const jwt = require('jsonwebtoken');
require('dotenv').config()

const refreshToken = (req, res, next, callback) => {

    if (req.cookies.refreshToken) {

        const refreshToken = req.cookies.refreshToken;

        // Verify refresh token
        try {
            const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
            const user = { ...decoded };
            delete user.iat;
            delete user.exp;

            // Generate new access token (expires in 10 minutes)
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

            // Set new access token in cookie
            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                maxAge: 259200000 // 3 Days
            });

            // Update the accessToken with new accessToken
            req.cookies.accessToken = accessToken;

            // Call the callback function passed through the parameter, to again execute the function after refreshing the token.
            return callback(req, res, next);

        } catch (err) {
            res.clearCookie('refreshToken');
            res.clearCookie('accessToken');
            return res.status(401).json({ data: 'Refresh token is invalid', error: true });
        }
    } else {
        return res.status(401).json({ data: 'Cookie doesnt have REFRESH Token', error: true });
    }
}

module.exports = refreshToken;