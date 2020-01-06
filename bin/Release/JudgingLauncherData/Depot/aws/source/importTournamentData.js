
const AWS = require('aws-sdk')
let docClient = new AWS.DynamoDB.DocumentClient()

const Common = require("complete-judging-common/source/backendCommon.js")

module.exports.handler = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    event.body = JSON.parse(event.body) || {}
    let data = event.body

    let tournamentName = event.pathParameters.tournamentName

    let tournamentKey = await Common.getTournamentKey(tournamentName)
    tournamentKey = Object.assign(tournamentKey, data.tournamentKey)

    let putTournamentKeyParams = {
        TableName : process.env.ACTIVE_TOURNAMENT_KEYS,
        Item: tournamentKey
    }
    await docClient.put(putTournamentKeyParams).promise().catch((error) => {
        throw new Error(`Put tournament key. ${error}`)
    })

    // let putTournamentInfoParams = {
    //     TableName : process.env.TOURNAMENT_INFO,
    //     Item: data.tournamentInfo
    // }
    // await docClient.put(putTournamentInfoParams).promise().catch((error) => {
    //     throw new Error(`Put tournament info. ${error}`)
    // })


    let writePoolList = []
    for (let pool in data.poolMap) {
        writePoolList.push({
            PutRequest: {
                Item: data.poolMap[pool]
            }
        })
    }

    let writeResultsList = []
    for (let judgeName in data.resultsMap) {
        let judgeData = data.resultsMap[judgeName]
        for (let time in judgeData) {
            writeResultsList.push({
                PutRequest: {
                    Item: judgeData[time]
                }
            })
        }
    }

    batchWriteList(process.env.ACTIVE_POOLS, writePoolList)
    batchWriteList(process.env.ACTIVE_RESULTS, writeResultsList)
})}

async function batchWriteList(tableName, writeList) {
    const maxWriteCount = 25
    for (let i = 0; i < writeList.length; i += maxWriteCount) {
        let batchWriteParams = {
            RequestItems: {
                [tableName]: writeList.slice(i, i + maxWriteCount)
            }
        }

        await docClient.batchWrite(batchWriteParams).promise().catch((error) => {
            throw new Error(`Write tournament data. ${tableName} ${error}`)
        })
    }
}
