const {cosmosDatabase} = require("./azureConnections");
const {containerClient} = require("./azureConnections");

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

module.exports = {downloadBlob, getUsersContainer, getAlbumsContainer, getImagesContainer}