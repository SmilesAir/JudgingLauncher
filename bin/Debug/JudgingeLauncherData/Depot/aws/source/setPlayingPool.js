

const Common = require("complete-judging-common/source/backendCommon.js")

module.exports.handler = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {

    event.body = JSON.parse(event.body) || {}

    if (event.body.data !== undefined) {
        await Common.setPlayingPool(event.pathParameters.tournamentName, event.body.data)
    }

    if (event.body.dataAlt !== undefined) {
        await Common.setPlayingPool(event.pathParameters.tournamentName, event.body.dataAlt)
    }

    return {
        success: true
    }
})}

