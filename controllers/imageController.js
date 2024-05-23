const {
    containerClient,
    getContainer, cvClient
} = require('../azure');
const { v4: uuidv4} = require('uuid');
const sharp = require("sharp");
const path = require('path');

async function addItemToArray(classname, imageBlob, userId, userEmail) {
    try {
        const albumContainer = await getContainer('Albums');
        const { resources: album } = await albumContainer.items.query({
            query: 'SELECT * FROM c WHERE c.className = @classname AND c.userId = @userId',
            parameters: [{ name: '@classname', value: classname }, {name: '@userId', value: userId}]
        }).fetchAll();
        const existAlbum = album[0]
        if (existAlbum) {
            existAlbum['images'].push(imageBlob);
            await albumContainer.item(existAlbum.id).replace(existAlbum);
        } else {
            const newDocument = {
                className: classname,
                images: [imageBlob],
                userId: userId,
                userEmail: userEmail,
                sharedWith: [],
                date: new Date().toISOString(),
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
            const email = req.user.email
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

                const result = await cvClient.path('/imageanalysis:analyze').post({
                    body: {
                        url: imageUrl
                    },
                    queryParameters: {
                        features: ['Tags', 'Read']
                    },
                    contentType: 'application/json'
                });
                let tags = []
                const classResult = result.body.tagsResult.values[0]?.name || 'unknown';
                result.body.tagsResult.values.forEach(value => {
                    tags.push(value.name)
                })
                let resultText = []
                if (result.body.readResult) {
                    result.body.readResult.blocks.forEach(block => {
                        block.lines.forEach(line => {
                            resultText.push(line.text)
                        })
                    })
                }
                const metadata = result.body.metadata
                return {
                    id: imageId,
                    type: 'image',
                    userId: id,
                    originalName: file.originalname,
                    blobName,
                    imageUrl,
                    className: classResult,
                    tags:tags,
                    text: resultText,
                    metadata,
                    date: new Date().toISOString(),
                    size
                };
            });
            const uploadAndCVResults = await Promise.all(imageUploadPromises);
            const container = await getContainer('Images');
            const dbResult = await container.items.bulk(uploadAndCVResults.map(item => ({ operationType: 'Create', resourceBody: item })));
            const resultData = uploadAndCVResults.map(({ originalName, className }) => ({ originalName, className }));
            res.status(200).json({status:'success', data: resultData});
            for (const item of dbResult) {
                await addItemToArray(item.resourceBody.className, item.resourceBody.blobName, id, email);
            }
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
            const userId = req.user.id
            const id = req.params.id
            const container = await getContainer('Images');
            const {resource:image} = await container.item(id).read();
            console.log(image)
            if (!image) {
                return res.status(500).json({status: 'error', message: "Image not found"})
            }
            const albumContainer = await getContainer('Albums');
            const querySpec = {
                query: 'SELECT * FROM c WHERE c.className = @class AND c.userId = @userId',
                parameters: [
                    {
                        name: '@class',
                        value: image.className
                    },
                    {
                        name: '@userId',
                        value: userId
                    }
                ]
            };
            const { resources } = await albumContainer.items.query(querySpec).fetchAll();
            const album = resources[0]
            const index = album.images.indexOf(image.blobName);
            if (index !== -1) {
                album.images.splice(index, 1);
                await albumContainer.item(album.id).replace(album);
            }
            const blob = containerClient.getBlobClient(image.blobName);
            await blob.delete();
            await container.item(id).delete()
            return res.status(200).json({status:'success'})
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async search(req, res) {
        try {
            const {input: input, album: className} = req.query
            const id = req.user.id;
            const container = await getContainer('Images');
            const querySpec = {
                query: "SELECT * FROM c WHERE c.userId=@userId AND c.className=@className AND (CONTAINS(LOWER(c.originalName), @input) OR ARRAY_CONTAINS(c.tags, @input))",
                parameters: [
                    { name: "@input", value: input.toLowerCase() },
                    { name: "@className", value: className },
                    { name: "@userId", value: id },
                ]
            };
            const { resources: images } = await container.items.query(querySpec).fetchAll();
            return res.status(200).json({status:'success',images:images});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async changeName(req, res) {
        try {
            const id = req.params.id
            const {newName} = req.body
            const container = await getContainer('Images');
            const {resource:image} = await container.item(id).read();
            image.originalName = newName + path.extname(image.originalName)
            const { resource: updatedImage } = await container.item(id).replace(image);
            return res.status(200).json({status:'success',image:updatedImage});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
}

module.exports = new ImageController()