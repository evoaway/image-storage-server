const {getImagesContainer} = require("../azure/db");
module.exports = class Image {
    constructor(id, userId, originalName, blobName, imageUrl, className, tags, text, metadata, size, type='image') {
        this.id = id;
        this.type = type;
        this.userId = userId;
        this.originalName = originalName;
        this.blobName = blobName;
        this.imageUrl = imageUrl;
        this.className = className;
        this.tags = tags;
        this.text = text;
        this.metadata = metadata;
        this.date = new Date();
        this.size = size;
    }
    async create(data) {
        const container = await getImagesContainer()
        return await container.items.bulk(data.map(item => ({operationType: 'Create', resourceBody: item})))
    }
    async find(querySpec) {
        const imageContainer = await getImagesContainer();
        const { resources } = await imageContainer.items.query(querySpec).fetchAll();
        return resources
    }
    async get(id){
        const container = await getImagesContainer()
        const {resource:image} = await container.item(id).read();
        return image
    }
    async update(id, image){
        const container = await getImagesContainer()
        const { resource: updatedImage } = await container.item(id).replace(image);
        return updatedImage
    }
    async delete(id) {
        const container = await getImagesContainer()
        await container.item(id).delete()
    }
}