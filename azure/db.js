const {cosmosDatabase} = require("./connections");

async function getUsersContainer() {
    const { container } = await cosmosDatabase.containers.createIfNotExists({ id: 'Users' });
    return container;
}

async function getAlbumsContainer() {
    const { container } = await cosmosDatabase.containers.createIfNotExists({ id: 'Albums' });
    return container;
}

async function getImagesContainer() {
    const { container } = await cosmosDatabase.containers.createIfNotExists({ id: 'Images' });
    return container;
}

module.exports = {getUsersContainer, getAlbumsContainer, getImagesContainer}