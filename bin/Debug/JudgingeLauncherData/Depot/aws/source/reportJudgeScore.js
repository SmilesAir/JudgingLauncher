
const Common = require("complete-judging-common/source/backendCommon.js")

module.exports.handler = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let body = JSON.parse(event.body) || {}

    if (body.tournamentName === undefined ||
        body.judgeId === undefined ||
        body.results === undefined) {
        throw new Error("Schema is wrong")
    }

    return Common.reportJudgeScore(body.tournamentName, body.judgeId, body.results)
})}
