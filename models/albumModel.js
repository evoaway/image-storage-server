const {getAlbumsContainer} = require("../azure/db");
module.exports = class Album {
    constructor(className, images, userId, userEmail, sharedWith) {
        this.className = className;
        this.images = images;
        this.userId = userId;
        this.userEmail = userEmail;
        this.sharedWith = sharedWith;
        this.createdAt = new Date()
    }
    async crete(){
        const albums = await getAlbumsContainer();
        await albums.items.create(this);
    }
    async find(querySpec) {
        const albumContainer = await getAlbumsContainer()
        const { resources: albums } = await albumContainer.items.query(querySpec).fetchAll();
        return albums
    }
    async get(id) {
        const albumContainer = await getAlbumsContainer()
        const {resource: album} = await albumContainer.item(id).read();
        return album
    }
    async update(id, album){
        const albumContainer = await getAlbumsContainer()
        await albumContainer.item(id).replace(album);
    }
    async delete(id) {
        const albumContainer = await getAlbumsContainer()
        await albumContainer.item(id).delete()
    }
}