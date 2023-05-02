const { default: mongoose } = require('mongoose');
const models = require('../db/dbModels')
const crypto = require("crypto");

const formModel = models.Forms();

const dateOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
}

const makeDateFormat = (minus) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - minus);
    return yesterday.toLocaleDateString('en-US', dateOptions)
}

const sinceCreated = (createdDate) => {
    const since = new Date(createdDate);
    const labels = []
    while (since < new Date()) {
        sinceThen = new Date(since);
        since.setDate(since.getDate() + 1);
        labels.push(sinceThen.toLocaleDateString('en-US', dateOptions));
    }
    return labels;
}

const getDataFromDates = (filterArray, submissionsArray, createdDate) => {
    const countMap = new Map();

    // Count occurrences in submissionsArray
    for (const date of submissionsArray) {
        countMap.set(date, (countMap.get(date) || 0) + 1);
    }

    // Initialize result array
    const result = [];

    // Compare occurrences in filterArray and submissionsArray
    for (const date of filterArray) {
        if (new Date(date) < new Date(createdDate)) {
            result.push(null); // Add null for dates before the created date
        } else {
            const count = countMap.get(date) || 0;
            result.push(count);
        }
    }

    return result;
};

const getTodaysSubmissions = (formData) => {
    let count = 0;
    for (var i = 0; i < formData.length; i++) {
        if (formData[i].time.toLocaleDateString('en-US', dateOptions) === new Date().toLocaleDateString('en-US', dateOptions)) {
            count++;
        }
    }
    return count;
}

module.exports = {
    createNewForm: (userId, formDetails) => {
        return new Promise(async (resolve, reject) => {
            try {
                const form_id = crypto.randomBytes(6).toString("hex");
                formModel.findOneAndUpdate(
                    { user_id: userId },
                    {
                        $push: {
                            forms: {
                                form_id,
                                form_name: formDetails.formName,
                                created_date: new Date(),
                                send_mail: formDetails.sendMail,
                            }
                        }
                    },
                    { upsert: true, new: true }
                ).then(() => resolve()).catch(() => reject())
            } catch (error) {
                reject()
            }
        })
    },
    getAllForms: (userId) => {
        return new Promise(async (resolve, reject) => {
            const formList = await formModel.aggregate([
                {
                    $match: {
                        user_id: new mongoose.Types.ObjectId(userId)
                    }
                },
                {
                    $project: {
                        forms: {
                            $map: {
                                input: "$forms",
                                as: "form",
                                in: {
                                    form_id: "$$form.form_id",
                                    form_name: "$$form.form_name",
                                    service_cancelled: "$$form.service_cancelled"
                                }
                            }
                        }
                    }
                }
            ])
            if (formList[0])
                resolve(formList[0].forms);
            else
                reject();
        })
    },
    getTotalNumberOfForms: (userId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const totalForms = await formModel.aggregate([
                    { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
                    { $project: { count: { $size: "$forms" } } }
                ])
                if (totalForms[0])
                    resolve(totalForms[0].count)
                else
                    resolve(0)
            } catch (error) {
                console.log(error);
                reject(error)
            }
        })
    },
    getThisForm: (formId, userId) => {
        return new Promise(async (resolve, reject) => {
            const formData = await formModel.findOne({
                user_id: new mongoose.Types.ObjectId(userId),
                forms: {
                    $elemMatch: {
                        form_id: formId
                    }
                }
            }, { "forms.$": 1 })
            if (formData === null)
                reject({ status_code: 404, message: "Invalid form ID" })
            else if (Object.keys(formData).length)
                resolve(formData)
            else
                reject({ status_code: 500, message: 'Somthing went wrong!' })
        })
    },
    deleteThisForm: async (userId, formId) => {
        return new Promise(async (resolve, reject) => {
            try {
                const userData = await formModel.findOne({ user_id: userId })
                const initial_forms_length = userData.forms.length;
                const updated_object = await formModel.findOneAndUpdate(
                    { user_id: userId },
                    { $pull: { forms: { form_id: formId } } },
                    { new: true }
                )
                const final_forms_length = updated_object.forms.length;

                if (final_forms_length < initial_forms_length) {
                    resolve({ status_code: 200, message: "Form deleted successfully" })
                } else {
                    reject({ status_code: 404, message: "Invalid form ID" })
                }
            } catch (error) {
                reject({ status_code: 404, message: "Invalid user ID" })
            }
        }).catch((err) => { return err })
    },
    deleteThisSubmission: (formId, submissionId, userId) => {
        return new Promise(async (resolve, reject) => {
            const updatedData = await formModel.findOneAndUpdate(
                { user_id: userId, 'forms.form_id': formId },
                { $pull: { 'forms.$.form_data': { _id_: new mongoose.Types.ObjectId(submissionId) } } },
                { new: true }
            )
            if (updatedData === null) reject({ status_code: 404, message: "Invalid form ID" })

            const targetId = submissionId;
            let isPresent = false;

            updatedData.forms.forEach(form => {
                const foundData = form.form_data.find(item => item._id_.toString() === targetId.toString());
                if (foundData) {
                    isPresent = true;
                    return;
                }
            });

            if (isPresent) {
                reject({ status_code: 500, message: "Something went wrong!" })
            } else {
                resolve({ status_code: 200, message: "Submission deleted successfully" })
            }

        })
    },
    editForm: (userId, formDetails) => {
        return new Promise(async (resolve, reject) => {
            try {
                const result = await formModel.updateOne(
                    { user_id: userId, "forms.form_id": formDetails.formId },
                    { $set: { "forms.$.form_name": formDetails.formName } })
                if (result.matchedCount === 0)
                    reject({ message: 'Form not found', status_code: 404 })
                else
                    resolve()
            } catch (error) {
                reject(error)
            }
        })
    },
    changeFormService: (userId, form) => {
        return new Promise(async (resolve, reject) => {
            const result = await formModel.updateOne(
                { user_id: userId, "forms.form_id": form.formId },
                { $set: { "forms.$.service_cancelled": form.value } }
            )
            if (result.matchedCount === 0)
                reject({ message: 'Form not found', status_code: 404 })
            else
                resolve()
        })
    },
    changeSendMailService: (userId, form) => {
        return new Promise(async (resolve, reject) => {
            const result = await formModel.updateOne(
                { user_id: userId, "forms.form_id": form.formId },
                { $set: { "forms.$.send_mail": form.value } }
            )
            if (result.matchedCount === 0)
                reject({ message: 'Form not found', status_code: 404 })
            else
                resolve()
        })
    },
    getFormAnalytics: (formId, userId) => {
        const formAnalytics = {
            "today": {
                submissions: 0
            },
            "3days": {
                datas: [],
                labels: Array.from({ length: 3 }, (_, i) => makeDateFormat(i + 1)).reverse()
            },
            "7days": {
                datas: [],
                labels: Array.from({ length: 7 }, (_, i) => makeDateFormat(i + 1)).reverse()
            },
            "28days": {
                datas: [],
                labels: Array.from({ length: 28 }, (_, i) => makeDateFormat(i + 1)).reverse()
            },
            "sinceCreated": {
                datas: [],
                labels: []
            },
        }
        return new Promise(async (resolve, reject) => {

            const formData = await formModel.findOne({
                user_id: new mongoose.Types.ObjectId(userId),
                forms: {
                    $elemMatch: {
                        form_id: formId
                    }
                }
            }, { "forms.$": 1 })

            if (formData === null)
                reject({ status_code: 404, message: "Invalid form ID" })
            else if (Object.keys(formData).length !== 0) {
                formAnalytics.sinceCreated.labels = sinceCreated(formData.forms[0].created_date)

                const submissionsDate = formData.forms[0].form_data.map(element =>
                    new Date(element.time).toLocaleDateString('en-US', dateOptions)
                );

                formAnalytics['today'].submissions = getTodaysSubmissions(formData.forms[0].form_data);

                for (const key in formAnalytics) {
                    if (key !== "sinceCreated" && key !== "today") {
                        formAnalytics[key].datas = getDataFromDates(
                            formAnalytics[key].labels,
                            submissionsDate,
                            new Date(formData.forms[0].created_date).toLocaleDateString('en-US', dateOptions)
                        );
                    } else {
                        formAnalytics.sinceCreated.datas = getDataFromDates(
                            formAnalytics.sinceCreated.labels,
                            submissionsDate,
                            new Date(formData.forms[0].created_date).toLocaleDateString('en-US', dateOptions)
                        );
                    }
                }
                resolve(formAnalytics)
            }
            else
                reject({ status_code: 500, message: 'Somthing went wrong!' })
        })
    }
}