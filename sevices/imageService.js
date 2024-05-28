const sharp = require("sharp");
const {v4: uuidv4} = require("uuid");
const path = require("path");
const {containerClient, cvClient} = require("../azure/azureConnections");
const Image = require('../models/imageModel')
const {getImagesContainer} = require("../azure/helpers");

class ImageService {
    async upload(id, email, files) {
        const imageUploadPromises = files.map(async (file) => {
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
            return new Image(imageId, id, file.originalname, blobName, imageUrl, classResult, tags, resultText, metadata, size)
        });
        const uploadAndCVResults = await Promise.all(imageUploadPromises);
        const container = await getImagesContainer()
        const dbResult = await container.items.bulk(uploadAndCVResults.map(item => ({ operationType: 'Create', resourceBody: item })));
        const resultData = uploadAndCVResults.map(({ originalName, className }) => ({ originalName, className }));
        return {dbResult: dbResult, resultData: resultData}
    }
    async get(id){
        const container = await getImagesContainer()
        const {resource:image} = await container.item(id).read();
        if (!image)
            throw new Error("Image not found")
        return image
    }
    async delete(userId, imageId) {
        const container = await getImagesContainer()
        const {resource:image} = await container.item(imageId).read();
        if (!image) {
            throw new Error("Image not found")
        }
        const albumContainer = await getImagesContainer();
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
        await container.item(imageId).delete()
    }
    async search(userId, input, className) {
        const container = await getImagesContainer()
        const querySpec = {
            query: "SELECT * FROM c WHERE c.userId=@userId AND c.className=@className AND (CONTAINS(LOWER(c.originalName), @input) OR ARRAY_CONTAINS(c.tags, @input))",
            parameters: [
                { name: "@input", value: input.toLowerCase() },
                { name: "@className", value: className },
                { name: "@userId", value: userId },
            ]
        };
        const { resources: images } = await container.items.query(querySpec).fetchAll();
        return images
    }
    async update(id, newName) {
        const container = await getImagesContainer();
        const {resource:image} = await container.item(id).read();
        image.originalName = newName + path.extname(image.originalName)
        const { resource: updatedImage } = await container.item(id).replace(image);
        return updatedImage
    }
}

module.exports = new ImageService()