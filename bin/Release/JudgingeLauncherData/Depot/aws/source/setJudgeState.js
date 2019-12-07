
const AWS = require('aws-sdk')
let docClient = new AWS.DynamoDB.DocumentClient()

const Common = require("complete-judging-common/source/backendCommon.js")

module.exports.handler = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {

    event.body = JSON.parse(event.body) || {}

    Common.setJudgeState(event.pathParameters.tournamentName, event.body.judgeId, event.body.status, event.body.isAlt)
})}


