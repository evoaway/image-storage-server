const UserService = require('../sevices/userService')
const AlbumService = require('../sevices/albumService')
const {validationResult} = require("express-validator");

class UserController {
    async registration(req, res) {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({status: 'error', message: errors.array()})
            }
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
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({ status: 'error', message: errors.array() });
            }
            const userId = req.user.id;
            const updatedUser = await UserService.update(userId, req.body)
            return res.status(200).json({ status:'success', user: updatedUser });
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async getFullInfo(req, res) {
        try {
            const data = await UserService.getFullInfo()
            return res.status(200).json({ status:'success', data: data });
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async block(req, res) {
        try {
            const id = req.params.id;
            const updatedUser = await UserService.block(id)
            return res.status(200).json({ status:'success', user: updatedUser });
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async delete(req, res) {
        try {
            // not used AlbumService inside userServices to avoid 'module exports inside circular dependency' warning
            const id = req.params.id;
            const albums = await AlbumService.getAlbums(id)
            for(const album of albums){
                await AlbumService.deleteAlbum(album.id)
            }
            await UserService.deleteUser(id)
            return res.status(200).json({ status:'success'});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
}

module.exports = new UserController()