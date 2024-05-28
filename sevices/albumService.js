const {containerClient} = require("../azure/azureConnections");
const Album = require('../models/albumModel')
const User = require('../sevices/userService')
const {getAlbumsContainer, getUsersContainer, getImagesContainer} = require("../azure/helpers");

class AlbumService {
    async addOrUpdate(classname, imageBlob, userId, userEmail) {
        try {
            const albumContainer = await getAlbumsContainer()
            const { resources: album } = await albumContainer.items.query({
                query: 'SELECT * FROM c WHERE c.className = @classname AND c.userId = @userId',
                parameters: [{ name: '@classname', value: classname }, {name: '@userId', value: userId}]
            }).fetchAll();
            const existAlbum = album[0]
            if (existAlbum) {
                existAlbum['images'].push(imageBlob);
                await albumContainer.item(existAlbum.id).replace(existAlbum);
            } else {
                const newAlbum = new Album(classname, [imageBlob], userId, userEmail, [])
                await albumContainer.items.create(newAlbum);
            }
        } catch (e) {
            console.error(e)
        }
    }
    async getAlbums(userId) {
        const albumContainer = await getAlbumsContainer()
        const { resources: albums } = await albumContainer.items.query({
            query: 'SELECT c.id, c.className, c.sharedWith, c.date FROM c WHERE c.userId = @userId',
            parameters: [{ name: '@userId', value: userId }]
        }).fetchAll();
        return albums
    }
    async getSharedWithMe(id){
        const albumContainer = await getAlbumsContainer()
        const { resources: albums } = await albumContainer.items.query({
            query: 'SELECT c.id, c.className, c.userEmail FROM c WHERE ARRAY_CONTAINS(c.sharedWith,@userId)',
            parameters: [{ name: '@userId', value: id }]
        }).fetchAll();
        return albums
    }
    async getAlbumImages(id) {
        const albumContainer = await getAlbumsContainer()
        const {resource: album} = await albumContainer.item(id).read();
        const ids = album.images;
        const container = await getImagesContainer()
        const querySpec = {
            query: `SELECT c.id, c.originalName, c.imageUrl FROM c WHERE c.blobName IN (${ids.map((_, i) => `@id${i}`).join(', ')}) ORDER BY c.date DESC`,
            parameters: ids.map((id, i) => ({ name: `@id${i}`, value: id }))
        };
        const { resources:images } = await container.items.query(querySpec).fetchAll();
        return images
    }
    async addShared(id, email) {
        const user = await User.getUserByEmail(email)
        if (!user) {
            throw new Error("User not found")
        }
        const albumContainer = await getAlbumsContainer()
        const {resource: album} = await albumContainer.item(id).read();
        const index = album.sharedWith.indexOf(user.id);
        if (index === -1) {
            album.sharedWith = [...album.sharedWith, user.id];
            await albumContainer.item(id).replace(album);
        }
        return album
    }
    async removeShared(id, email) {
        const user = await User.getUserByEmail(email)
        if (!user) {
            throw new Error("User not found")
        }
        const albumContainer = await getAlbumsContainer()
        const { resource: album } = await albumContainer.item(id).read();
        if (!album) {
            throw new Error('Album not found');
        }
        const index = album.sharedWith.indexOf(user.id);
        if (index !== -1) {
            album.sharedWith.splice(index, 1);
            await albumContainer.item(id).replace(album);
        }
        return album
    }
    async getSharedUsers(id){
        const albumContainer = await getAlbumsContainer()
        const { resource: album } = await albumContainer.item(id).read();
        const sharedUsers = album.sharedWith
        const container = await getUsersContainer()
        if (!sharedUsers.length){
            return [];
        }
        const querySpec = {
            query: `SELECT c.id, c.email FROM c WHERE c.id IN (${sharedUsers.map((_, i) => `@id${i}`).join(', ')})`,
            parameters: sharedUsers.map((id, i) => ({ name: `@id${i}`, value: id }))
        };
        const { resources:users } = await container.items.query(querySpec).fetchAll();
        return users
    }
    async getAlbum(id) {
        const albumContainer = await getAlbumsContainer()
        const { resource: album } = await albumContainer.item(id).read();
        return album
    }
    async deleteAlbum(id) {
        const albumContainer = await getAlbumsContainer()
        const { resource: album } = await albumContainer.item(id).read();
        await albumContainer.item(id).delete()
        const imagesBlobs = album.images
        const querySpec = {
            query: `SELECT c.id FROM c WHERE c.blobName IN (${imagesBlobs.map((_, i) => `@id${i}`).join(', ')})`,
            parameters: imagesBlobs.map((id, i) => ({ name: `@id${i}`, value: id }))
        };
        const container = await getImagesContainer()
        const { resources: images } = await container.items.query(querySpec).fetchAll();
        const deleteInDb = images.map(async image => {
            await container.item(image.id).delete();
        });
        await Promise.all(deleteInDb);

        const deleteBlob = imagesBlobs.map(async (blobName) => {
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            await blockBlobClient.delete();
        });
        await Promise.all(deleteBlob);
    }
}

module.exports = new AlbumService()