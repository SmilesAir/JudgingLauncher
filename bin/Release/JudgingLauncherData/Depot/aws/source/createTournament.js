
const AWS = require('aws-sdk')
let docClient = new AWS.DynamoDB.DocumentClient()

const Common = require("complete-judging-common/source/backendCommon.js")

module.exports.handler = function(event, context, callback) {

    event.body = JSON.parse(event.body) || {}

    let isPoolCreatorUpload = event.body.TournamentName !== undefined
    let tournamentName = event.body.tournamentName || event.body.TournamentName
    let now = Date.now()
    let tournamentInfoKey = tournamentName + now
    let tournamentVersion = 1
    let oldPoolKeys = {}

    let getParams = {
        TableName: process.env.ACTIVE_TOURNAMENT_KEYS,
        Key: {"key": tournamentName}
    }
    docClient.get(getParams).promise().then((response) => {
        if (Object.keys(response).length !== 0 || response.constructor !== Object) {
            tournamentVersion = response.Item.version + 1

            for (let poolKey in response.Item) {
                if (poolKey.startsWith(Common.getPoolNamePrefix())) {
                    oldPoolKeys[poolKey] = response.Item[poolKey]
                }
            }
        }

        tournamentInfoKey += "-" + tournamentVersion

        cleanData(event.body)

        let putParams = {
            TableName : process.env.TOURNAMENT_INFO,
            Item: {
                key: tournamentInfoKey,
                tournamentName: tournamentName,
                createdTime: now,
                isPoolCreatorData: isPoolCreatorUpload,
                data: isPoolCreatorUpload ? event.body : undefined
            }
        }
        console.log("put info", JSON.stringify(putParams))
        return docClient.put(putParams).promise()
    }).then(() => {
        let item = Object.assign({
            key: tournamentName,
            tournamentName: tournamentName,
            tournamentInfoKey: tournamentInfoKey,
            version: tournamentVersion
        }, oldPoolKeys)
        let putParams = {
            TableName : process.env.ACTIVE_TOURNAMENT_KEYS,
            Item: item
        }
        console.log("put key", putParams)
        return docClient.put(putParams).promise()
    }).then((response) => {
        let successResponse = {
            statusCode: 200,
            headers: {
              "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
              "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
            },
            body: "Success, Created Table"
        }
        callback(null, successResponse)
    }).catch((error) => {
        console.log("catch", error)

        let failResponse = {
            statusCode: error.status,
            headers: {
              "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
              "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
            },
            body: "Success, Created Table"
        }

        callback(failResponse)
    })
}

function cleanData(data) {
    for (let a in data) {
        if (typeof data[a] === "object") {
            cleanData(data[a])
        } else if (data[a] === "") {
            data[a] = null
        }
    }
}
