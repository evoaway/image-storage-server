const { BlobServiceClient } = require('@azure/storage-blob');
const { ComputerVisionClient } = require('@azure/cognitiveservices-computervision');
const { ApiKeyCredentials} = require('@azure/ms-rest-js');
const { CosmosClient } = require('@azure/cosmos');


const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER);

const computerVisionClient = new ComputerVisionClient(
    new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': process.env.COMPUTER_VISION_API_KEY } }), process.env.COMPUTER_VISION_ENDPOINT);

const cosmosClient = new CosmosClient(process.env.COSMOS_DB_CONNECTION_STRING);
const cosmosDatabase = cosmosClient.database(process.env.COSMOS_DB_DATABASE_NAME);

const getContainer = async (containerId) => {
    const { container } = await cosmosDatabase.containers.createIfNotExists({ id: containerId });
    return container;
};

module.exports = {
    blobServiceClient,
    containerClient,
    computerVisionClient,
    cosmosClient,
    cosmosDatabase,
    getContainer
};
