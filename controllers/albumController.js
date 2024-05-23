const {getContainer, containerClient} = require("../azure");
const archiver = require('archiver');

async function getUserByEmail(email){
    const userContainer = await getContainer('Users');
    const querySpec = {
        query: 'SELECT c.id FROM c WHERE c.email = @email',
        parameters: [
            {
                name: '@email',
                value: email
            }
        ]
    };
    const { resources } = await userContainer.items.query(querySpec).fetchAll();
    return  resources[0]
}
async function downloadBlob(blobName) {
    const blobClient = containerClient.getBlobClient(blobName);
    const downloadBlockBlobResponse = await blobClient.download(0);
    return await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
}

async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => {
            chunks.push(data);
        });
        readableStream.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on("error", reject);
    });
}
class AlbumController {
    async getAlbums(req, res) {
        try {
            const userId = req.user.id;
            const albumContainer = await getContainer('Albums');
            const { resources: albums } = await albumContainer.items.query({
                query: 'SELECT c.id, c.className, c.sharedWith, c.date FROM c WHERE c.userId = @userId',
                parameters: [{ name: '@userId', value: userId }]
            }).fetchAll();
            return res.status(200).json({ status: 'success', albums: albums });
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async getSharedWitMe(req, res) {
        try {
            const userId = req.user.id;
            const albumContainer = await getContainer('Albums');
            const { resources: albums } = await albumContainer.items.query({
                query: 'SELECT c.id, c.className, c.userEmail FROM c WHERE ARRAY_CONTAINS(c.sharedWith,@userId)',
                parameters: [{ name: '@userId', value: userId }]
            }).fetchAll();
            return res.status(200).json({ status: 'success', albums: albums });
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async getAlbumImages(req, res) {
        try {
            const id = req.params.id;
            const albumContainer = await getContainer('Albums');
            const {resource: album} = await albumContainer.item(id).read();
            const ids = album.images;
            const container = await getContainer('Images');
            const querySpec = {
                query: `SELECT c.id, c.originalName, c.imageUrl FROM c WHERE c.blobName IN (${ids.map((_, i) => `@id${i}`).join(', ')}) ORDER BY c.date DESC`,
                parameters: ids.map((id, i) => ({ name: `@id${i}`, value: id }))
            };
            const { resources:images } = await container.items.query(querySpec).fetchAll();
            return res.status(200).json({status:'success', images:images});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async addShared(req, res) {
        try {
            const id = req.params.id
            const {email} = req.body
            const user = await getUserByEmail(email)
            if (!user) {
                return res.status(404).json({message: "User not found"})
            }
            const albumContainer = await getContainer('Albums');
            const {resource: album} = await albumContainer.item(id).read();
            const index = album.sharedWith.indexOf(user.id);
            if (index === -1) {
                album.sharedWith = [...album.sharedWith, user.id];
                await albumContainer.item(id).replace(album);
            }
            return res.status(200).json({status:'success', album:album});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async removeShared(req, res) {
        try {
            const id = req.params.id
            const {email} = req.body
            const user = await getUserByEmail(email)
            if (!user) {
                return res.status(404).json({message: "User not found"})
            }
            const albumContainer = await getContainer('Albums');
            const { resource: album } = await albumContainer.item(id).read();
            if (!album) {
                return res.status(404).json({ error: 'Album not found' });
            }
            const index = album.sharedWith.indexOf(user.id);
            if (index !== -1) {
                album.sharedWith.splice(index, 1);
                await albumContainer.item(id).replace(album);
            }
            return res.status(200).json({status:'success', album:album});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async getSharedUsers(req, res) {
        try {
            const id = req.params.id
            const albumContainer = await getContainer('Albums');
            const { resource: album } = await albumContainer.item(id).read();
            const sharedUsers = album.sharedWith
            const container = await getContainer('Users');
            if (!sharedUsers.length){
                return res.status(200).json({status:'success', users:[]});
            }
            const querySpec = {
                query: `SELECT c.id, c.email FROM c WHERE c.id IN (${sharedUsers.map((_, i) => `@id${i}`).join(', ')})`,
                parameters: sharedUsers.map((id, i) => ({ name: `@id${i}`, value: id }))
            };
            const { resources:users } = await container.items.query(querySpec).fetchAll();
            return res.status(200).json({status:'success', users:users});
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async download(req, res) {
        try {
            const id = req.params.id
            const albumContainer = await getContainer('Albums');
            const { resource: album } = await albumContainer.item(id).read();
            const imagesBlobs = album.images
            const images = await Promise.all(imagesBlobs.map(blobName => downloadBlob(blobName)));

            const archive = archiver('zip');
            res.attachment('images.zip');

            archive.pipe(res);
            images.forEach((image, index) => {
                archive.append(image, { name: imagesBlobs[index] });
            });
            await archive.finalize();
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
    async delete(req, res) {
        try {
            const id = req.params.id
            const albumContainer = await getContainer('Albums');
            const { resource: album } = await albumContainer.item(id).read();
            await albumContainer.item(id).delete()
            const imagesBlobs = album.images
            const querySpec = {
                query: `SELECT c.id FROM c WHERE c.blobName IN (${imagesBlobs.map((_, i) => `@id${i}`).join(', ')})`,
                parameters: imagesBlobs.map((id, i) => ({ name: `@id${i}`, value: id }))
            };
            const container = await getContainer('Images');
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
            return res.status(200).json({status:'success'})
        } catch (e) {
            res.status(500).json({status: 'error', message: e.message})
        }
    }
}

module.exports = new AlbumController()