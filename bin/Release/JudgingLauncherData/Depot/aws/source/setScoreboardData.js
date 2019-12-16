
const AWS = require('aws-sdk')
const s3 = new AWS.S3()

const Common = require("complete-judging-common/source/backendCommon.js")

module.exports.handler = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    event.body = JSON.parse(event.body) || {}

    let key = `${decodeURI(event.pathParameters.tournamentName)}-results.json`
    let putParams = {
        Body: JSON.stringify(event.body.scoreboardData),
        Bucket: process.env.RESULTS_BUCKET,
        Key: key,
        GrantRead: "uri=http://acs.amazonaws.com/groups/global/AllUsers"
    }
    s3.putObject(putParams).promise().catch((error) => {
        console.log(`Error updating s3 with scoreboard data. ${error}`)
    })
})}
