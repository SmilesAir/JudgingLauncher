
const AWS = require('aws-sdk')
let docClient = new AWS.DynamoDB.DocumentClient()

const Common = require("complete-judging-common/source/backendCommon.js")

module.exports.handler = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let ret = {
        tournamentInfos: []
    }

    let infoKeys = []
    let scanParams = {
        TableName: process.env.ACTIVE_TOURNAMENT_KEYS
    }
    await docClient.scan(scanParams).promise().then((response) => {
        response.Items.forEach((element) => {
            let key = element.tournamentInfoKey
            if (key !== undefined) {
                infoKeys.push(key)
            }
        })

    }).catch((error) => {
        console.log("Error", error)

        throw new Error(error)
    })

    for (let i = 0; i < infoKeys.length; ++i) {
        let info = await Common.getTournamentInfo(infoKeys[i])
        if (info !== undefined) {
            ret.tournamentInfos.push(info)
        }
    }

    return ret
})}

