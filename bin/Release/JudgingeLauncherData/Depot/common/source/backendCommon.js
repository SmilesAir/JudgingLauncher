
// Load specific platforms data harness
let DataHarness = undefined
try {
    DataHarness = require("source/dataHarnessAws.js")
    console.log("Found Aws data harness")
} catch (e) { }

if (DataHarness === undefined) {
    try {
        DataHarness = require("../../server/source/dataHarnessServer.js")
        console.log("Found Server data harness")
    } catch (e) { }
}

if (DataHarness === undefined) {
    throw new Error("No Data Harness Loaded")
}

module.exports.handler = async function(event, context, callback, func) {
    try {
        let result = await func(event, context)

        let successResponse = {
            statusCode: 200,
            headers: {
            "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
            "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS 
            },
            body: JSON.stringify(result)
        }

        callback(null, successResponse)
    } catch (error) {
        console.log(`Handler Catch: ${error}`)

        let failResponse = {
            statusCode: 500,
            headers: {
              "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
              "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
            },
            body: error
        }

        callback(failResponse)
    }
}

module.exports.isItemEmpty = function(item) {
    return Object.keys(item).length === 0 && item.constructor === Object
}

module.exports.getActivePool = async function(tournamentName, isAlt) {
    let tournamentKey = await DataHarness.getTournamentKey(tournamentName)
    let poolKey = isAlt === true ? tournamentKey.playingPoolKeyAlt : tournamentKey.playingPoolKey
    if (poolKey !== undefined && poolKey !== null) {
        let pool = await Common.getPoolData(poolKey)
        pool.serverTime = Date.now()
        return pool
    } else {
        console.log("getactivepool error")
    }
}

module.exports.getPoolData = async function(poolKey) {
    let poolItem = await DataHarness.getPoolItem(poolKey)
    return poolItem.data
}

module.exports.getPoolNamePrefix = function() {
    return "pool-"
}

module.exports.getResultsKeyPrefix = function() {
    return "resultsKey-"
}

module.exports.getPoolNameFromData = function(poolData) {
    return Common.getPoolName(poolData.pool.divisionIndex, poolData.pool.roundIndex, poolData.pool.poolIndex)
}

module.exports.getPoolName = function(divisionIndex, roundIndex, poolIndex) {
    return `${Common.getPoolNamePrefix()}${divisionIndex}-${roundIndex}-${poolIndex}`
}

module.exports.getExisitingPoolItem = function(tournamentKey, poolName) {
    let oldPoolDataKey = tournamentKey[poolName]
    if (oldPoolDataKey !== undefined) {
        return DataHarness.getPoolItem(oldPoolDataKey)
    }

    return undefined
}

module.exports.getPoolResults = async function(tournamentName, divisionIndex, roundIndex, poolIndex) {
    let tournamentKey = await DataHarness.getTournamentKey(tournamentName)
    let poolName = Common.getPoolName(divisionIndex, roundIndex, poolIndex)
    let poolItem = await Common.getExisitingPoolItem(tournamentKey, poolName)

    let getPromises = []
    for (let resultsAttributeName in poolItem) {
        if (resultsAttributeName.startsWith(Common.getResultsKeyPrefix())) {
            getPromises.push(Common.getResultData(poolItem[resultsAttributeName]))
        }
    }

    return Promise.all(getPromises)
}

module.exports.getBackupResults = async function(judgeName, startTime) {
    let resultsList = await DataHarness.getResultsHistory(judgeName, startTime)
    let ret = []
    for (let result of resultsList) {
        ret.push({
            time: result.time,
            data: result.data
        })
    }

    ret.sort((a, b) => {
        return b.time - a.time
    })

    return {
        resultsList: ret
    }
}

module.exports.getResultData = async function(resultsKey) {
    let item = await DataHarness.getResultItem(resultsKey)
    return {
        judgeName: resultsKey.judgeName,
        data: item && item.data
    }
}

module.exports.reportJudgeScore = async function(tournamentName, judgeId, results) {
    let resultsKey = {
        judgeName: judgeId,
        time: Date.now()
    }

    let tournamentKey = await Common.getTournamentKey(tournamentName)
    let poolKey = tournamentKey[Common.getPoolName(results.divisionIndex, results.roundIndex, results.poolIndex)]
    await Common.updatePoolAttribute(tournamentName, poolKey, `${Common.getResultsKeyPrefix()}${judgeId}`, resultsKey)

    return DataHarness.setResults(judgeId, resultsKey.time, results)
}

module.exports.setPlayingPool = async function(tournamentName, data) {
    let activePool = undefined
    try {
        activePool = await Common.getActivePool(tournamentName, data.isAlt)
    } catch(error) {
        console.log(`No active pool currenty set. ${tournamentName}`)
    }

    let tournamentKey = await Common.getTournamentKey(tournamentName)

    if (activePool !== undefined && activePool.poolHash === data.poolHash) {
        if (activePool.observableHash !== data.observableHash) {
            console.log("Update data", data)
            return DataHarness.updateActivePoolAttribute(tournamentName, "data", data, data.isAlt)
        }
    } else {
        let now = Date.now()
        let playingPoolKey = now.toString()
        let newPoolItem = {
            key: playingPoolKey,
            data: data
        }
        let poolName = Common.getPoolNameFromData(data)

        // Carry over results from previous pool data
        let existingPoolItem = await Common.getExisitingPoolItem(tournamentKey, poolName)
        if (existingPoolItem !== undefined) {
            for (let resultName in existingPoolItem) {
                if (resultName.startsWith(Common.getResultsKeyPrefix())) {
                    newPoolItem[resultName] = existingPoolItem[resultName]
                }
            }
        }

        let playingPoolAttr = data.isAlt ? "playingPoolKeyAlt" : "playingPoolKey"

        let attributeValues = {
            [playingPoolAttr]: playingPoolKey,
            [poolName]: playingPoolKey
        }

        await Common.updateTournamentKeyWithObject(tournamentName, attributeValues)

        return DataHarness.setPoolItem(newPoolItem)
    }
}

module.exports.setJudgeState = function(tournamentName, judgeId, status, isAlt) {
    DataHarness.setJudgeState(tournamentName, judgeId, status, isAlt)
}

module.exports.clearPoolResults = async function(tournamentName, divisionIndex, roundIndex, poolIndex) {
    let tournamentKey = await DataHarness.getTournamentKey(tournamentName)
    let poolName = Common.getPoolName(divisionIndex, roundIndex, poolIndex)
    let poolItem = await Common.getExisitingPoolItem(tournamentKey, poolName)

    for (let propName in poolItem) {
        if (propName.startsWith(Common.getResultsKeyPrefix())) {
            delete poolItem[propName]
        }
    }

    DataHarness.setPoolItem(poolItem)
}

module.exports.stopPlayingPools = async function(tournamentName) {
    await Common.updateTournamentKeyWithObject(tournamentName, {
        playingPoolKey: null,
        playingPoolKeyAlt: null
    })
}

///////////////////////// Harness Passthrough /////////////////////////
module.exports.getTournamentInfo = function(key) {
    return DataHarness.getTournamentInfo(key)
}

module.exports.getTournamentKey = function(tournamentName) {
    return DataHarness.getTournamentKey(tournamentName)
}

module.exports.getPoolItem = async function(poolKey) {
    return DataHarness.getPoolItem(poolKey)
}

module.exports.getResultItem = function(resultsKey) {
    return DataHarness.getResultItem(resultsKey)
}

module.exports.updateActivePoolAttribute = async function(tournamentName, attributeName, attributeValue, isAlt) {
    return DataHarness.updateActivePoolAttribute(tournamentName, attributeName, attributeValue, isAlt)
}

module.exports.updatePoolAttribute = async function(tournamentName, poolKey, attributeName, attributeValue) {
    return DataHarness.updatePoolAttribute(tournamentName, poolKey, attributeName, attributeValue)
}

module.exports.updateTournamentKeyWithObject = async function(tournamentName, newObject) {
    return DataHarness.updateTournamentKeyWithObject(tournamentName, newObject)
}

module.exports.updateTournamentKeyPlayingPool = async function(tournamentName, playingPoolKey) {
    return DataHarness.updateTournamentKeyPlayingPool(tournamentName, playingPoolKey)
}

const Common = module.exports
