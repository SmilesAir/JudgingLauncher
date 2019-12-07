
const Common = require("complete-judging-common/source/backendCommon.js")

module.exports.handler = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    return Common.getBackupResults(decodeURI(event.pathParameters.judgeName), parseInt(event.pathParameters.startTime))
})}
