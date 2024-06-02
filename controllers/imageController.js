const {
    containerClient,
} = require('../azure/connections');
const ImageService = require('../sevices/imageService')
const AlbumService = require('../sevices/albumService')

class ImageController {
    async uploadImages(req, res) {
        try {
            if (req.files === undefined || req.files.length === 0) {
                return res.status(400).json({status: 'error', message: 'No files selected or unsupported format!'});
            }
            const id = req.user.id;
            const email = req.user.email
            const {dbResult, resultData} = await ImageService.upload(id, email, req.files)
            res.status(200).json({status:'success', data: resultData});
            for (const item of dbResult) {
                await AlbumService.addOrUpdate(item.resourceBody.className, item.resourceBody.blobName, id, email);
            }
        } catch (e) {
            console.error(e);
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async getImage(req, res) {
        try {
            const id = req.params.id
            const image = await ImageService.get(id)
            return res.status(200).json({status: 'success', image: image})
        } catch (e) {
            console.error(e);
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async downloadImage(req, res) {
        try {
            const id = req.params.id
            const image = await ImageService.get(id)
            const blobClient = containerClient.getBlobClient(image.blobName);
            const downloadBlockBlobResponse = await blobClient.download();

            res.setHeader('Content-Type', downloadBlockBlobResponse.contentType);
            res.setHeader('Content-Disposition', `attachment; filename=${image.originalName}`);

            downloadBlockBlobResponse.readableStreamBody.pipe(res);
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async imageDelete(req, res) {
        try {
            const userId = req.user.id
            const id = req.params.id
            await ImageService.delete(userId, id)
            return res.status(200).json({status:'success'})
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async search(req, res) {
        try {
            const {input: input, album: className} = req.query
            const id = req.user.id;
            const images = await ImageService.search(id, input, className)
            return res.status(200).json({status:'success',images:images});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async changeName(req, res) {
        try {
            const id = req.params.id
            const {newName} = req.body
            const updatedImage = await ImageService.update(id, newName)
            return res.status(200).json({status:'success',image:updatedImage});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
}

module.exports = new ImageController()