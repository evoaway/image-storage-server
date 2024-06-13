const {containerClient} = require("../azure/connections");
const Album = require('../models/albumModel')
const Image = require('../models/imageModel')
const UserModel = require('../models/userModel')
const User = require('../sevices/userService')

class AlbumService {
    async addOrUpdate(classname, imageBlob, userId, userEmail) {
        try {
            const albumModel = new Album()
            const querySpec = {
                query: 'SELECT * FROM c WHERE c.className = @classname AND c.userId = @userId',
                parameters: [{ name: '@classname', value: classname }, {name: '@userId', value: userId}]
            }
            const albums = await albumModel.find(querySpec)
            const existAlbum = albums[0]
            if (existAlbum) {
                existAlbum['images'].push(imageBlob);
                await albumModel.update(existAlbum.id, existAlbum)
            } else {
                const newAlbum = new Album(classname, [imageBlob], userId, userEmail, [])
                await newAlbum.crete()
            }
        } catch (e) {
            console.error(e)
        }
    }
    async getAlbums(userId) {
        const album = new Album()
        const querySpec = {
            query: 'SELECT c.id, c.className, c.sharedWith, c.date FROM c WHERE c.userId = @userId',
            parameters: [{ name: '@userId', value: userId }]
        }
        return await album.find(querySpec)
    }
    async getSharedWithMe(id){
        const album = new Album()
        const querySpec = {
            query: 'SELECT c.id, c.className, c.userEmail FROM c WHERE ARRAY_CONTAINS(c.sharedWith,@userId)',
            parameters: [{ name: '@userId', value: id }]
        }
        return await album.find(querySpec)
    }
    async getAlbumImages(id,userId) {
        const album = new Album()
        const albumFind = await album.get(id)
        if (albumFind.userId === userId || albumFind.sharedWith.indexOf(userId) !== -1) {
            const ids = albumFind.images;
            if(ids.length > 0){
                const querySpec = {
                    query: `SELECT c.id, c.originalName, c.imageUrl FROM c WHERE c.blobName IN (${ids.map((_, i) => `@id${i}`).join(', ')}) ORDER BY c.date DESC`,
                    parameters: ids.map((id, i) => ({ name: `@id${i}`, value: id }))
                };
                const image = new Image()
                return image.find(querySpec)
            }
            return []
        }
        else {
            throw new Error("Album not found")
        }
    }
    async addShared(id, email) {
        const user = await User.getUserByEmail(email)
        if (!user) {
            throw new Error("User not found")
        }
        const album = new Album()
        const updateAlbum = await album.get(id)
        if (!updateAlbum) {
            throw new Error('Album not found');
        }
        const index = updateAlbum.sharedWith.indexOf(user.id);
        if (index === -1) {
            updateAlbum.sharedWith = [...updateAlbum.sharedWith, user.id];
            await album.update(id, updateAlbum)
        }
        return updateAlbum
    }
    async removeShared(id, email) {
        const user = await User.getUserByEmail(email)
        if (!user) {
            throw new Error("User not found")
        }
        const album = new Album()
        const updateAlbum = await album.get(id)
        if (!updateAlbum) {
            throw new Error('Album not found');
        }
        const index = updateAlbum.sharedWith.indexOf(user.id);
        if (index !== -1) {
            updateAlbum.sharedWith.splice(index, 1);
            await album.update(id, updateAlbum)
        }
        return updateAlbum
    }
    async getSharedUsers(id){
        const album = new Album()
        const findAlbum = await album.get(id)
        const sharedUsers = findAlbum.sharedWith
        if (!sharedUsers.length){
            return [];
        }
        const querySpec = {
            query: `SELECT c.id, c.email FROM c WHERE c.id IN (${sharedUsers.map((_, i) => `@id${i}`).join(', ')})`,
            parameters: sharedUsers.map((id, i) => ({ name: `@id${i}`, value: id }))
        };
        const user = new UserModel()
        return await user.findAll(querySpec)
    }
    async getAlbum(id) {
        const albumModel = new Album()
        const album = await albumModel.get(id)
        if(!album) {
            throw new Error("Album not found")
        }
        return album
    }
    async deleteAlbum(id) {
        const albumModel = new Album()
        const album = await albumModel.get(id)
        await albumModel.delete(id)
        const imagesBlobs = album.images
        const querySpec = {
            query: `SELECT c.id FROM c WHERE c.blobName IN (${imagesBlobs.map((_, i) => `@id${i}`).join(', ')})`,
            parameters: imagesBlobs.map((id, i) => ({ name: `@id${i}`, value: id }))
        };
        const image = new Image()
        const images = await image.find(querySpec)
        const deleteInDb = images.map(async img => {
            await image.delete(img.id)
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