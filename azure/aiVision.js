const {cvClient} = require("./connections");

async function imageAnalysis(imageUrl) {
    const result = await cvClient.path('/imageanalysis:analyze').post({
        body: {
            url: imageUrl
        },
        queryParameters: {
            features: ['Tags', 'Read']
        },
        contentType: 'application/json'
    });
    let tags = []
    const classResult = result.body.tagsResult.values[0]?.name || 'unknown';
    result.body.tagsResult.values.forEach(value => {
        tags.push(value.name)
    })
    let resultText = []
    if (result.body.readResult) {
        result.body.readResult.blocks.forEach(block => {
            block.lines.forEach(line => {
                resultText.push(line.text)
            })
        })
    }
    const metadata = result.body.metadata
    return {tags, classResult, resultText, metadata}
}
module.exports = {downloadBlob, getUsersContainer, getAlbumsContainer, getImagesContainer, imageAnalysis}