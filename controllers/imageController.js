const {
    containerClient,
    computerVisionClient,
    getContainer, blobServiceClient
} = require('../azure');
const { v4: uuidv4} = require('uuid');
const sharp = require("sharp");
const path = require('path');

async function readText(imageId, imageUrl) {
    try {
        const readResult = await computerVisionClient.recognizePrintedText(true,imageUrl)
        let resultText = []
        readResult.regions[0].lines.forEach(line => {
            line.words.forEach(word => {
                resultText.push(word.text)
            })
        })
        const container = await getContainer('Images');
        const { resource: image } = await container.item(imageId).read();
        if (image) {
            image['text'] = resultText;
            await container.item(imageId).replace(image);
        }
    } catch (e) {
        console.error(e)
    }
}
async function addItemToArray(classname, imageId, blobName, userId) {
    try {
        const albumContainer = await getContainer('Albums');
        const { resources: album } = await albumContainer.items.query({
            query: 'SELECT * FROM c WHERE c.classname = @classname AND c.userId = @userId',
            parameters: [{ name: '@classname', value: classname }, {name: '@userId', value: userId}]
        }).fetchAll();
        const existAlbum = album[0]
        if (existAlbum) {
            existAlbum['images'].push(imageId);
            existAlbum['imagesBlob'].push(blobName);
            await albumContainer.item(existAlbum.id).replace(existAlbum);
        } else {
            const newDocument = {
                ['class']: classname,
                ['images']: [imageId],
                ['imagesBlob']: [blobName],
                ['userId']: userId,
                ['sharedWith']: []
            };
            await albumContainer.items.create(newDocument);
        }
    } catch (e) {
        console.error(e)
    }
}

class ImageController {
    async uploadImages(req, res) {
        try {
            const id = req.user.id;
            const imageUploadPromises = req.files.map(async (file) => {
                let imageBuffer = file.buffer;
                if (file.size > 2000000) {
                    imageBuffer = await sharp(file.buffer)
                        .jpeg({ quality: 90 })
                        .toBuffer();
                }
                const size = imageBuffer.length
                const imageId = uuidv4().toString()
                const blobName = imageId + path.extname(file.originalname);
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                await blockBlobClient.uploadData(imageBuffer);
                const imageUrl = blockBlobClient.url;

                const tags = await computerVisionClient.tagImage(imageUrl)
                const classResult = tags.tags[0]?.name || 'unknown';
                const metadata = tags.metadata
                return {
                    id: imageId,
                    type: 'image',
                    userId: id,
                    originalName: file.originalname,
                    blobName,
                    imageUrl,
                    class: classResult,
                    metadata,
                    size
                };
            });
            const results = await Promise.all(imageUploadPromises);

            const container = await getContainer('Images');
            const finalResult = await container.items.bulk(results.map(item => ({ operationType: 'Create', resourceBody: item })));
            res.status(200).json({status:'success'});
            for (const item of finalResult) {
                await addItemToArray(item.resourceBody.class, item.resourceBody.id, item.resourceBody.blobName, id);
            }
            results.map(item => (readText(item.id, item.imageUrl)))
        } catch (e) {
            console.error(e);
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async getImage(req, res) {
        try {
            const id = req.params.id
            const container = await getContainer('Images');
            const {resource:image} = await container.item(id).read();
            if (image)
                return res.status(200).json({status: 'success', image: image})
            return res.status(500).json({status: 'error', message: "Image not found"})
        } catch (e) {
            console.error(e);
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async downloadImage(req, res) {
        try {
            const id = req.params.id
            const container = await getContainer('Images');
            const {resource:image} = await container.item(id).read();
            if (!image){
                return res.status(500).json({status: 'error', message: "Image not found"})
            }
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
            const id = req.params.id
            const container = await getContainer('Images');
            const {resource:image} = await container.item(id).read();
            if (!image) {
                return res.status(500).json({status: 'error', message: "Image not found"})
            }
            const albumContainer = await getContainer('Albums');
            const querySpec = {
                query: 'SELECT * FROM c WHERE c.class = @class',
                parameters: [
                    {
                        name: '@class',
                        value: image.class
                    }
                ]
            };
            const { resources } = await albumContainer.items.query(querySpec).fetchAll();
            const album = resources[0]
            const index = album.images.indexOf(image.id);
            if (index !== -1) {
                album.images.splice(index, 1);
                await albumContainer.item(album.id).replace(album);
            }
            const blobClient = containerClient.getBlobClient(image.blobName);
            await blobClient.delete();
            await container.item(id).delete()
            return res.status(200).json({status:'success'})
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async search(req, res) {
        try {
            const {name} = req.query
            const id = req.user.id;
            const container = await getContainer('Images');
            const querySpec = {
                query: "SELECT * FROM c WHERE CONTAINS(c.originalName, @name) AND c.userId = @userId",
                parameters: [
                    { name: "@name", value: name },
                    { name: "@userId", value: id },
                ]
            };
            const { resources: images } = await container.items.query(querySpec).fetchAll();
            return res.status(200).json({status:'success',images:images});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
}

module.exports = new ImageController()