const {getContainer} = require("../azure");

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

class AlbumController {
    async getAlbums(req, res) {
        try {
            const userId = req.user.id;
            const albumContainer = await getContainer('Albums');
            const { resources: albums } = await albumContainer.items.query({
                query: 'SELECT c.id, c.class, c.sharedWith FROM c WHERE c.userId = @userId',
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
                query: 'SELECT c.id, c.class FROM c WHERE ARRAY_CONTAINS(c.sharedWith,@userId)',
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
                query: `SELECT c.id, c.imageUrl, c.blobName FROM c WHERE c.id IN (${ids.map((_, i) => `@id${i}`).join(', ')})`,
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
            const user = getUserByEmail(email)
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
}

module.exports = new AlbumController()