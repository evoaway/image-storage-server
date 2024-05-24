const UserService = require('../sevices/userService')

class UserController {
    async registration(req, res) {
        try {
            const {email, password, firstname, lastname} = req.body;
            const userData = await UserService.create(email, password, firstname, lastname)
            return res.status(200).json({status: 'success', user: userData});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }

    }
    async login(req, res) {
        try {
            const {email, password} = req.body
            const token = await UserService.login(email, password)
            return res.status(200).json({ token: token });
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async getMyInfo(req, res) {
        try {
            const userId = req.user.id;
            const userData = await UserService.getMe(userId)
            return res.status(200).json({ status:'success', user: userData.user, memory:userData.memory });
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async updateMyInfo(req,res) {
        try {
            const userId = req.user.id;
            const updatedUser = await UserService.update(userId, req.body)
            return res.status(200).json({ status:'success', user: updatedUser });
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
}

module.exports = new UserController()