const sharp = require("sharp");
const {v4: uuidv4} = require("uuid");
const path = require("path");
const {containerClient} = require("../azure/connections");
const Image = require('../models/imageModel')
const {imageAnalysis} = require("../azure/aiVision");
const {uploadBlob} = require("../azure/blob");
const Album = require("../models/albumModel");
const {formatBytes} = require("./utils");

const THRESHOLD_SIZE = 2 * 1024 * 1024 // 2 MB
const READABLE_FORMATS = ['image/jpeg','image/png','image/tiff']

async function imageCompression(file) {
    const format = file.mimetype
    const formatOptions = {
        'image/jpeg': sharp(file.buffer).jpeg({ quality: 85 }),
        'image/png': sharp(file.buffer).png({ quality: 85 }),
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
        const imageModel = new Image()
        const dbResult = await imageModel.create(uploadAndCVResults)
        const resultData = uploadAndCVResults.map(({ id, originalName, className }) => ({ id, originalName, className }));
        return {dbResult: dbResult, resultData: resultData}
    }
    async get(id,userID){
        const image = new Image()
        const result = await image.get(id)
        const {size} = result
        result.size = formatBytes(size)
        if (!result || result.userId !== userID)
            throw new Error("Image not found")
        return result
    }
    async delete(userId, imageId) {
        const imageModel = new Image()
        const image = await imageModel.get(imageId)
        if (!image) {
            throw new Error("Image not found")
        }
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
        const albumModel = new Album()
        const albums = await albumModel.find(querySpec)
        const album = albums[0]
        const index = album.images.indexOf(image.blobName);
        if (index !== -1) {
            album.images.splice(index, 1);
            await albumModel.update(album.id, album)
        }
        const blob = containerClient.getBlobClient(image.blobName);
        await blob.delete();
        await imageModel.delete(imageId)
    }
    async search(userId, input, className) {
        const querySpec = {
            query: "SELECT c.id, c.originalName, c.imageUrl, c.tags FROM c WHERE c.userId=@userId AND c.className=@className AND (CONTAINS(LOWER(c.originalName), @input) OR ARRAY_CONTAINS(c.tags, @input))",
            parameters: [
                { name: "@input", value: input.toLowerCase() },
                { name: "@className", value: className },
                { name: "@userId", value: userId },
            ]
        };
        const image = new Image()
        return await image.find(querySpec)
    }
    async update(id, newName) {
        const image = new Image()
        const updateImage = await image.get(id);
        updateImage.originalName = newName + path.extname(updateImage.originalName)
        return await image.update(id, updateImage)
    }
}

module.exports = new ImageService()