const { BlobServiceClient } = require('@azure/storage-blob');
const { CosmosClient } = require('@azure/cosmos');
const createClient = require('@azure-rest/ai-vision-image-analysis').default;
const { AzureKeyCredential } = require('@azure/core-auth');


const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER);

const cosmosClient = new CosmosClient(process.env.COSMOS_DB_CONNECTION_STRING);
const cosmosDatabase = cosmosClient.database(process.env.COSMOS_DB_DATABASE_NAME);

const getContainer = async (containerId) => {
    const { container } = await cosmosDatabase.containers.createIfNotExists({ id: containerId });
    return container;
};

const credential = new AzureKeyCredential(process.env.COMPUTER_VISION_API_KEY);
const cvClient = createClient(process.env.COMPUTER_VISION_ENDPOINT, credential);

module.exports = {
    blobServiceClient,
    containerClient,
    cosmosClient,
    cosmosDatabase,
    getContainer,
    cvClient
};
