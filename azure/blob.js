const {containerClient} = require("./connections");

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

async function uploadBlob(blobName,imageBuffer) {
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.uploadData(imageBuffer);
    return blockBlobClient.url;
}

module.exports = {downloadBlob,uploadBlob}