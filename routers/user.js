const Router = require('express')
const router = new Router()
const userController = require('../controllers/userController')
const authMiddleware = require("../middleware/authMiddleware");
const checkRole = require("../middleware/checkRoleMiddleware");
const {check} = require("express-validator");

router.post('/registration', [
    check('email', "Invalid email format").isEmail(),
    check('password', "Password cannot be empty").trim().notEmpty(),
    check('password', "Password is too short").isLength({ min: 6, max: 32 }),
], userController.registration)
router.post('/login', userController.login)
router.get('/', authMiddleware, userController.getMyInfo)
router.patch('/', authMiddleware, check('email', "Invalid email format").optional().isEmail(),
    userController.updateMyInfo)
router.get('/admin/info', checkRole('admin'), userController.getFullInfo)
router.patch('/admin/:id', checkRole('admin'), userController.block)
router.delete('/admin/:id', checkRole('admin'), userController.delete)

module.exports = router