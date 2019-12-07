
const Common = require("complete-judging-common/source/backendCommon.js")

module.exports.handler = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    return Common.clearPoolResults(event.pathParameters.tournamentName,
        event.pathParameters.divisionIndex,
        event.pathParameters.roundIndex,
        event.pathParameters.poolIndex)
})}
