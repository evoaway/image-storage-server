const archiver = require('archiver');
const AlbumService = require('../sevices/albumService')
const {downloadBlob} = require("../azure/blob");

class AlbumController {
    async getAlbums(req, res) {
        try {
            const userId = req.user.id;
            const albums = await AlbumService.getAlbums(userId)
            return res.status(200).json({ status: 'success', albums: albums });
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async getSharedWitMe(req, res) {
        try {
            const userId = req.user.id;
            const albums = await AlbumService.getSharedWithMe(userId)
            return res.status(200).json({ status: 'success', albums: albums });
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async getAlbumImages(req, res) {
        try {
            const id = req.params.id;
            const images = await AlbumService.getAlbumImages(id)
            return res.status(200).json({status:'success', images:images});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async addShared(req, res) {
        try {
            const id = req.params.id
            const {email} = req.body
            const album = await AlbumService.addShared(id, email)
            return res.status(200).json({status:'success', album:album});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async removeShared(req, res) {
        try {
            const id = req.params.id
            const {email} = req.body
            const album = await AlbumService.removeShared(id, email)
            return res.status(200).json({status:'success', album:album});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async getSharedUsers(req, res) {
        try {
            const id = req.params.id
            const users = await AlbumService.getSharedUsers(id)
            return res.status(200).json({status:'success', users:users});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async download(req, res) {
        try {
            const id = req.params.id
            const album = await AlbumService.getAlbum(id)
            const imagesBlobs = album.images
            const images = await Promise.all(imagesBlobs.map(blobName => downloadBlob(blobName)));

            const archive = archiver('zip');
            res.attachment('images.zip');

            archive.pipe(res);
            images.forEach((image, index) => {
                archive.append(image, { name: imagesBlobs[index] });
            });
            await archive.finalize();
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async delete(req, res) {
        try {
            const id = req.params.id
            await AlbumService.deleteAlbum(id)
            return res.status(200).json({status:'success'})
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
}

module.exports = new AlbumController()