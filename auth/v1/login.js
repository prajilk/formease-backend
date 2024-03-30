const jwt = require('jsonwebtoken');
require('dotenv').config();
const userHelper = require("../../helpers/userHelper");

function login(req, res) {
    userHelper.login(req.body).then((validUser) => {
        // Remove the password from the validUser
        const user = Object.assign({}, validUser);

        // Generate access token (expires in 10 minutes)
        const accessToken = jwt.sign({ _id: user._doc._id }, process.env.TOKEN_SECRET, { expiresIn: '1d' });

        return res.status(200).json({ token: accessToken, error: false })
    }).catch((err) => {
        return res.status(401).json({ error: "error" + err, token: null })
    })
}

module.exports = {
    login
}