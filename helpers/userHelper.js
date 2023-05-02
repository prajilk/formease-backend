const bcrypt = require('bcrypt');
const models = require('../db/dbModels')
const crypto = require("crypto");
const { default: mongoose } = require('mongoose');

const userModel = models.Users();
const formModel = models.Forms()

module.exports = {
    register: (userData) => {
        return new Promise(async (resolve, reject) => {
            const isEmailTaken = await userModel.exists({ email: userData.email })
            if (isEmailTaken) {
                reject('User already exists')
            } else {
                userData._id = new mongoose.Types.ObjectId()
                userData.password = await bcrypt.hash(userData.password, 10);
                const apiKey = crypto.randomBytes(10).toString("hex");
                userData = { ...userData, api_key: apiKey }
                await new userModel(userData).save();
                const formData = {
                    user_id: userData._id
                };
                await new formModel(formData).save();
                resolve();
            }
        })
    },
    login: (userData) => {
        return new Promise(async (resolve, reject) => {
            const validUser = await userModel.findOne({ email: userData.email })
            if (validUser) {
                try {
                    if (await bcrypt.compare(userData.password, validUser.password)) {
                        resolve(validUser);
                    } else {
                        reject('Incorrect password');
                    }
                } catch (err) { console.log("Somthing went wrong!") }
            } else {
                reject('Invalid email');
            }
        })
    },
    getUser: (id) => {
        return new Promise(async (resolve, reject) => {
            try {
                const validUser = await userModel.findOne({ _id: id })
                // Remove the password & api_key from the validUser
                if (validUser) {
                    const user = Object.assign({}, validUser);
                    delete user._doc.password;
                    delete user._doc.api_key;
                    delete user._doc.country;
                    resolve(user)
                } else {
                    reject({ message: 'User not found', status_code: 404 })
                }
            } catch (error) {
                reject(error)
            }
        })
    },
    editProfile: (userData) => {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await userModel.updateOne({ _id: userData._id }, { fullname: userData.fullname, email: userData.email })
                if (result.matchedCount === 0)
                    reject({ message: 'User not found', status_code: 404 })
                else
                    resolve()
            } catch (error) {
                reject(error)
            }
        })
    },
    changePassword: (passwords, userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const user = await userModel.findById(userId);
                if (!user) {
                    return reject({ message: 'User not found', status_code: 404 })
                }

                const passwordMatch = await bcrypt.compare(passwords.oldPassword, user.password)
                if (!passwordMatch) {
                    return reject({ message: 'Incorrect password', status_code: 401 })
                }
                if (passwords.oldPassword === passwords.newPassword) {
                    return reject({ message: 'New password should be different from old password', status_code: 400 })
                }

                user.password = await bcrypt.hash(passwords.newPassword, 10);
                await user.save();
                resolve({ message: 'Password changed successfully', status_code: 200 })
            } catch (error) {
                reject({ message: error, status_code: 500 })
            }
        })
    },
    deleteAccount: (userId) => {
        return new Promise(async (resolve, reject) => {
            const validateUser = await userModel.findById(userId);
            if (!validateUser) {
                reject()
            }
            const accountRemoved = await userModel.findByIdAndRemove(userId);
            if (!accountRemoved) {
                reject()
            } else {
                resolve()
            }
        })
    },
    getAPI: (userId) => {
        return new Promise(async (resolve, reject) => {
            const user = await userModel.findById(userId);
            if (!user) {
                reject()
            }
            resolve({ api_key: user.api_key, api_revoked: user.api_revoked })
        })
    },
    rollAPI: (userId) => {
        return new Promise(async (resolve, reject) => {
            const apiKey = crypto.randomBytes(10).toString("hex");
            const updatedUser = await userModel.findByIdAndUpdate(userId, { api_key: apiKey });
            if (!updatedUser) {
                reject()
            }
            resolve(apiKey)
        })
    },
    revokeAPI: (userId) => {
        return new Promise(async (resolve, reject) => {
            const updatedUser = await userModel.findByIdAndUpdate(userId, { api_revoked: true });
            if (!updatedUser) {
                reject()
            }
            resolve()
        })
    },
    grantAPI: (userId) => {
        return new Promise(async (resolve, reject) => {
            const updatedUser = await userModel.findByIdAndUpdate(userId, { api_revoked: false });
            if (!updatedUser) {
                reject()
            }
            resolve(updatedUser.api_key)
        })
    }
}