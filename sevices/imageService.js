const sharp = require("sharp");
const {v4: uuidv4} = require("uuid");
const path = require("path");
const {containerClient} = require("../azure/connections");
const Image = require('../models/imageModel')
const {imageAnalysis} = require("../azure/aiVision");
const {getImagesContainer} = require("../azure/db");
const {uploadBlob} = require("../azure/blob");

const THRESHOLD_SIZE = 2 * 1024 * 1024 // 2 MB
const READABLE_FORMATS = ['image/jpeg','image/png','image/tiff']

async function imageCompression(file) {
    const format = file.mimetype
    const formatOptions = {
        'image/jpeg': sharp(file.buffer).jpeg({ quality: 90 }),
        'image/png': sharp(file.buffer).png({ quality: 90 }),
        'image/webp': sharp(file.buffer).webp({ quality: 90 }),
        'image/tiff': sharp(file.buffer).tiff({ quality: 90 })
    };

    if (!formatOptions[format]) {
        throw new Error(`Unsupported image format: ${format}`);
    }

    return formatOptions[format].toBuffer();
}
class ImageService {
    async imageProcessing(file) {
        let imageBuffer = file.buffer;
        let features;
        if (file.size > THRESHOLD_SIZE) {
            imageBuffer = await imageCompression(file)
        }
        if (READABLE_FORMATS.includes(file.mimetype)) {
            features = ['Tags', 'Read']
        } else {
            features = ['Tags']
        }
        return {imageBuffer,features}
    }
    async upload(id, email, files) {
        const imageUploadPromises = files.map(async (file) => {
            const {imageBuffer,features} = await this.imageProcessing(file)
            const size = imageBuffer.length
            const imageId = uuidv4().toString()
            const blobName = imageId + path.extname(file.originalname);
            const imageUrl = await uploadBlob(blobName, imageBuffer)

            const {tags, classResult, resultText, metadata} = await imageAnalysis(imageUrl,features)
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