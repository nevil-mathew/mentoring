/**
 * name : validators/v1/accounts.js
 * author : Aman Gupta
 * Date : 20-Oct-2021
 * Description : Validations of accounts controller
*/

module.exports = {
    create: (req) => {
        req.checkBody('name')
            .trim()
            .notEmpty()
            .withMessage('name field is empty')
            .matches(/^[A-Za-z ]+$/)
            .withMessage('name is invalid');

        req.checkBody('email')
            .trim()
            .notEmpty()
            .withMessage('email field is empty')
            .isEmail()
            .matches(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)
            .withMessage('email is invalid')
            .normalizeEmail();

        req.checkBody('password')
            .trim()
            .notEmpty()
            .withMessage('password field is empty');

        req.checkBody('isAMentor')
            .optional()
            .isBoolean()
            .withMessage('isAMentor is invalid');
    },

    login: (req) => {
        req.checkBody('email')
            .trim()
            .notEmpty()
            .withMessage('email field is empty')
            .isEmail()
            .withMessage('email is invalid')
            .normalizeEmail();

        req.checkBody('password')
            .trim()
            .notEmpty()
            .withMessage('password field is empty');
    },

    logout: (req) => {
        req.checkBody('refreshToken')
            .notEmpty()
            .withMessage('refreshToken field is empty');
    },

    generateToken: (req) => {
        req.checkBody('refreshToken')
            .notEmpty()
            .withMessage('refreshToken field is empty');
    },

    generateOtp: (req) => {
        req.checkBody('email')
            .notEmpty()
            .withMessage('email field is empty')
            .isEmail()
            .withMessage('email is invalid');
    },

    registrationOtp: (req) => {
        req.checkBody('email')
            .notEmpty()
            .withMessage('email field is empty')
            .isEmail()
            .withMessage('email is invalid');

        req.checkBody('name')
            .notEmpty()
            .withMessage('name field is empty');
    },

    resetPassword: (req) => {
        req.checkBody('email')
            .notEmpty()
            .withMessage('email field is empty')
            .isEmail()
            .withMessage('email is invalid');

        req.checkBody('password')
            .notEmpty()
            .withMessage('password field is empty');

        req.checkBody('otp')
            .notEmpty()
            .withMessage('otp field is empty')
            .matches(/^[0-9]+$/)
            .withMessage('otp should be number')
            .isLength({ min: 6, max: 6 })
            .withMessage('otp is invalid');
    },

    changeRole: (req) => {
        req.checkBody('email')
            .notEmpty()
            .withMessage('email field is empty')
            .isEmail()
            .withMessage('email is invalid');
    }
};