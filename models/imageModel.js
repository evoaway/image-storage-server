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
}