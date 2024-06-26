const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
require('dotenv').config()

//Connect to database
require('./db/dbConnection')();

const { login } = require('./auth/login');
const { verifyToken } = require('./auth/verifyToken');

const userHelper = require('./helpers/userHelper');
const formHelper = require('./helpers/formHelper');

const app = express();

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:3000', 'https://formease.vercel.app'],
    credentials: true
}))

// Register new user
app.post('/register', (req, res) => {
    userHelper.register(req.body).then(() => {
        res.status(200).json({ status: 'Success' })
    }).catch((err) => {
        res.status(409).json({ status: 'Failed', error: err })
    })
})

// Login route
app.post('/login', async (req, res) => login(req, res))

// Verify user
app.get('/user/verify', verifyToken, (req, res) => {
    res.status(200).json({ message: "Access granted", user: req.user });
})

app.post('/edit-profile', (req, res) => {
    userHelper.editProfile(req.body).then(() => {
        userHelper.getUser(req.body._id).then((userDetails) => {
            res.status(200).json({ user: userDetails._doc, status: 'Profile updated successfully', error: false }); // Return updated data
        }).catch((err) => {
            if (err.status_code === 404) res.status(404).json(err)
            else res.status(500).json(err)
        })
    }).catch((err) => {
        if (err.status_code === 404) res.status(404).json(err)
        else res.status(500).json(err)
    })
})

app.post('/change-password', verifyToken, (req, res) => {
    userHelper.changePassword(req.body, req.user._id).then((data) => {
        res.status(data.status_code).json(data)
    }).catch((err) => {
        res.status(err.status_code).json(err)
    })
})

app.get('/delete-account', verifyToken, (req, res) => {
    userHelper.deleteAccount(req.user._id).then(() => {
        res.clearCookie('accessToken', {
            httpOnly: true,
            sameSite: 'none',
            secure: true,
            expires: new Date(0)
        })
        res.clearCookie('refreshToken', {
            httpOnly: true,
            sameSite: 'none',
            secure: true,
            expires: new Date(0)
        })
        res.status(200).json("Account deleted successfully")
    }).catch((err) => {
        res.status(500).json({ messagse: "Something went wrong", error: err })
    })
})

app.get('/number-of-forms', verifyToken, (req, res) => {
    formHelper.getTotalNumberOfForms(req.user._id).then((totalForms) => {
        res.status(200).json({ total_forms: totalForms })
    }).catch((err) => {
        res.status(500).json({ total_forms: 'NaN', message: "Something went wrong", error: err })
    })
})

app.get('/get-api', verifyToken, (req, res) => {
    userHelper.getAPI(req.user._id).then((apiDetails) => {
        res.status(200).json(apiDetails)
    }).catch((err) => {
        res.status(500).json({ error: err })
    })
})

app.get('/roll-api', verifyToken, (req, res) => {
    userHelper.rollAPI(req.user._id).then((newKey) => {
        res.status(200).json({ new_API_key: newKey })
    }).catch((err) => {
        res.status(500).json({ error: err })
    })
})

app.get('/revoke-api', verifyToken, (req, res) => {
    userHelper.revokeAPI(req.user._id).then(() => {
        res.status(200).json({ api_revoked: true })
    }).catch((err) => {
        res.status(500).json({ error: err })
    })
})

app.get('/grant-api', verifyToken, (req, res) => {
    userHelper.grantAPI(req.user._id).then((apiKey) => {
        res.status(200).json({ api_key: apiKey })
    }).catch((err) => {
        res.status(500).json({ error: err })
    })
})

app.post('/create-new-form', verifyToken, (req, res) => {
    formHelper.createNewForm(req.user._id, req.body).then(() => {
        res.status(200).json({ status: "success" })
    }).catch((err) => {
        res.status(500).json({ error: err })
    })
})

app.get('/get-forms', verifyToken, (req, res) => {
    formHelper.getAllForms(req.user._id).then((formList) => {
        res.status(200).json({ formList })
    }).catch((err) => {
        res.status(500).json({ error: err })
    })
})

app.post('/get-this-form', verifyToken, (req, res) => {
    formHelper.getThisForm(req.body.form_id, req.user._id).then((formData) => {
        res.status(200).json({ forms: formData.forms })
    }).catch((err) => {
        if (err.status_code)
            res.status(err.status_code).json({ message: err.message })
        else
            res.status(500).json({ error: err })
    })
})

app.post('/get-form-analytics', verifyToken, (req, res) => {
    formHelper.getFormAnalytics(req.body.form_id, req.user._id).then((formAnalytics) => {
        res.status(200).json({ formAnalytics })
    }).catch((err) => {
        if (err.status_code)
            res.status(err.status_code).json({ message: err.message })
        else
            res.status(500).json({ error: err })
    })
})

app.post('/delete-form', verifyToken, (req, res) => {
    formHelper.deleteThisForm(req.user._id, req.body.form_id).then((response) => {
        if (response.status_code === 200)
            res.status(200).json(response)
        else if (response.status_code === 404)
            res.status(404).json(response)
        else
            res.status(500).json(response)
    }).catch((err) => {
        res.status(500).json({ error: err })
    })
})

app.post('/edit-form', verifyToken, (req, res) => {
    formHelper.editForm(req.user._id, req.body).then(() => {
        res.status(200).json({ status: 'Form updated successfully' });
    }).catch((err) => {
        if (err.status_code === 404) res.status(404).json(err)
        else res.status(500).json(err)
    })
})

app.post('/change-service', verifyToken, (req, res) => {
    formHelper.changeFormService(req.user._id, req.body).then(() => {
        res.status(200).json({ status: 'Service stopped successfully' });
    }).catch((err) => {
        if (err.status_code === 404) res.status(404).json(err)
        else res.status(500).json(err)
    })
})

app.post('/change-send-mail', verifyToken, (req, res) => {
    formHelper.changeSendMailService(req.user._id, req.body).then(() => {
        res.status(200).json({ status: 'Send mail service changed successfully' });
    }).catch((err) => {
        if (err.status_code === 404) res.status(404).json(err)
        else res.status(500).json(err)
    })
})

app.post('/delete-this-submission', verifyToken, (req, res) => {
    formHelper.deleteThisSubmission(req.body.formId, req.body.submissionId, req.user._id).then(() => {
        res.status(200).json({ submissionDeleted: true });
    }).catch((err) => {
        if (err.status_code === 404) res.status(404).json(err)
        else res.status(500).json(err)
    })
})

app.listen(5000, console.log('Server running on Port: 5000'));