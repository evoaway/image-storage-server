const Router = require('express')
const router = new Router()
const userController = require('../controllers/userController')
const authMiddleware = require("../middleware/authMiddleware");
const checkRole = require("../middleware/checkRoleMiddleware");

router.post('/registration', userController.registration)
router.post('/login', userController.login)
router.get('/', authMiddleware, userController.getMyInfo)
router.patch('/', authMiddleware, userController.updateMyInfo)
router.get('/admin/info', checkRole('admin'), userController.getFullInfo)
router.patch('/admin/:id', checkRole('admin'), userController.block)
router.delete('/admin/:id', checkRole('admin'), userController.delete)

module.exports = router