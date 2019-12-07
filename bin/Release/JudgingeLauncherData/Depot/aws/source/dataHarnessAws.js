
const AWS = require('aws-sdk')
let docClient = new AWS.DynamoDB.DocumentClient()

const Common = require("complete-judging-common/source/backendCommon.js")


module.exports.getTournamentInfo = function(key) {
    let getParams = {
        TableName: process.env.TOURNAMENT_INFO,
        Key: {
            key: key
        }
    }
    return docClient.get(getParams).promise().then((response) => {
        return response.Item
    }).catch((error) => {
        console.log("Get Tournament Info Error", error)

        return undefined
    })
}

module.exports.getTournamentKey = function(tournamentName) {
    let getParams = {
        TableName: process.env.ACTIVE_TOURNAMENT_KEYS,
        Key: {"key": tournamentName}
    }
    return docClient.get(getParams).promise().then((response) => {
        if (!Common.isItemEmpty(response)) {
            return response.Item
        } else {
            throw new Error(`Can't find tournament with name: ${tournamentName}`)
        }
    }).catch((error) => {
        throw new Error(`Can't find tournament with name: ${tournamentName}`)
    })
}

module.exports.getPoolItem = async function(poolKey) {
    let getParams = {
        TableName: process.env.ACTIVE_POOLS,
        Key: {"key": poolKey}
    }
    let getResp = await docClient.get(getParams).promise()
    if (!Common.isItemEmpty(getResp)) {
        return getResp.Item
    } else {
        console.log("No active pool data found")
    }
}

module.exports.setPoolItem = function(pool) {
    let putPlayingPoolParams = {
        TableName : process.env.ACTIVE_POOLS,
        Item: pool
    }

    return docClient.put(putPlayingPoolParams).promise().catch((error) => {
        throw new Error(`Put new playing pool for ${tournamentName}. ${error}`)
    })
}

module.exports.getResultItem = function(resultsKey) {
    let getParams = {
        TableName : process.env.ACTIVE_RESULTS,
        Key: resultsKey
    }
    return docClient.get(getParams).promise().then((response) => {
        return response.Item
    }).catch((error) => {
        throw new Error(`Get from active results. ${error}`)
    })
}

module.exports.updateActivePoolAttribute = async function(tournamentName, attributeName, attributeValue, isAlt) {
    let tournamentKey = await module.exports.getTournamentKey(tournamentName)
    let poolKey = isAlt ? tournamentKey.playingPoolKeyAlt : tournamentKey.playingPoolKey
    if (poolKey !== undefined) {
        let updatePoolParams = {
            TableName: process.env.ACTIVE_POOLS,
            Key: { "key": poolKey },
            UpdateExpression: "set #attributeName = :value",
            ExpressionAttributeNames: { "#attributeName": attributeName },
            ExpressionAttributeValues: { ":value": attributeValue }
        }
        return docClient.update(updatePoolParams).promise().catch((error) => {
            throw new Error(`Update active pool for ${tournamentName}. ${error}`)
        })
    } else {
        throw new Error(`${tournamentName} doesn't have a playing pool`)
    }
}

module.exports.updatePoolAttribute = async function(tournamentName, poolKey, attributeName, attributeValue) {
    let updatePoolParams = {
        TableName: process.env.ACTIVE_POOLS,
        Key: { "key": poolKey },
        UpdateExpression: "set #attributeName = :value",
        ExpressionAttributeNames: { "#attributeName": attributeName },
        ExpressionAttributeValues: { ":value": attributeValue }
    }
    return docClient.update(updatePoolParams).promise().catch((error) => {
        throw new Error(`Update pool ${poolKey} for ${tournamentName}. ${error}`)
    })
}

module.exports.updateTournamentKeyWithObject = async function(tournamentName, newObject) {
    let expresssions = []
    let names = {}
    let values = {}
    for (let key in newObject) {
        let safeKey = key.replace(/-/g, '_')
        let attrName = `#${safeKey} = :${safeKey}`
        expresssions.push(attrName)
        names[`#${safeKey}`] = key
        values[`:${safeKey}`] = newObject[key]
    }

    const updateExp = "set " + expresssions.join(", ")
    let updatePoolParams = {
        TableName: process.env.ACTIVE_TOURNAMENT_KEYS,
        Key: { "key": tournamentName },
        UpdateExpression: updateExp,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values
    }
    return docClient.update(updatePoolParams).promise().catch((error) => {
        throw new Error(`Update active pool for ${tournamentName}. ${error}`)
    })
}

module.exports.updateTournamentKeyPlayingPool = async function(tournamentName, playingPoolKey) {
    let updatePoolParams = {
        TableName: process.env.ACTIVE_TOURNAMENT_KEYS,
        Key: { "key": tournamentName },
        UpdateExpression: `set playingPoolKey = :playingPoolKey`,
        ExpressionAttributeValues: { ":playingPoolKey": playingPoolKey }
    }
    return docClient.update(updatePoolParams).promise().catch((error) => {
        throw new Error(`Update active pool for ${tournamentName}. ${error}`)
    })
}

module.exports.getResultsHistory = function(judgeName, startTime) {
    let queryStartTime = startTime === 0 ? Date.now() : startTime - 1
    let params = {
        TableName: process.env.ACTIVE_RESULTS,
        ProjectionExpression: "judgeName, #time, #data",
        KeyConditionExpression: "judgeName = :judgeName and #time between :startTime and :endTime",
        ExpressionAttributeNames: {
            "#time": "time",
            "#data": "data"
        },
        ExpressionAttributeValues: {
            ":judgeName": judgeName,
            ":startTime": queryStartTime - 60 * 60 * 1000,
            ":endTime": queryStartTime
        }
    }

    return docClient.query(params).promise().then((response) => {
        return response
    }).catch((error) => {
        throw new Error(`${tournamentName}. Can't query backup results. ${error}`)
    })
}

module.exports.setResults = function(judgeName, time, results) {
    let putParams = {
        TableName : process.env.ACTIVE_RESULTS,
        Item: {
            judgeName: judgeName,
            time: time,
            data: results
        }
    }
    return docClient.put(putParams).promise().catch((error) => {
        throw new Error(`Put into active results. ${error}`)
    })
}

module.exports.setJudgeState = async function(tournamentName, judgeId, status, isAlt) {
    let activePool = undefined
    try {
        activePool = await Common.getActivePool(tournamentName, isAlt)
    } catch(error) {
        console.log(`No active pool currenty set. ${tournamentName}`)
    }

    let tournamentKey = await Common.getTournamentKey(tournamentName)

    // Probably don't even need to query activePool, just update the sub object state inside data
    if (activePool !== undefined) {
        let newState = activePool.state || {}
        newState[judgeId] = {
            status: status
        }
        let newData = activePool
        newData.state = newState

        let updateParams = {
            TableName : process.env.ACTIVE_POOLS,
            Key: {
                key: isAlt ? tournamentKey.playingPoolKeyAlt : tournamentKey.playingPoolKey
            },
            UpdateExpression: "set #data = :data",
            ExpressionAttributeNames: {
                "#data": "data"
            },
            ExpressionAttributeValues: {
                ":data": newData
            }
        }

        return docClient.update(updateParams).promise().catch((error) => {
            throw new Error(`Update observable data for ${tournamentName}. ${error}`)
        })
    }
}
