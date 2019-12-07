
const Common = require("complete-judging-common/source/backendCommon.js")

module.exports.handler = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    return Common.stopPlayingPools(event.pathParameters.tournamentName)
})}
