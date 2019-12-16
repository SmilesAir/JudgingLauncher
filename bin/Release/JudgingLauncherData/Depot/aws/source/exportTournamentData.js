
const Common = require("complete-judging-common/source/backendCommon.js")

module.exports.handler = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let tournamentName = event.pathParameters.tournamentName

    let tournamentKey = await Common.getTournamentKey(tournamentName)

    let poolMap = {}
    for (let poolKey in tournamentKey) {
        if (poolKey.startsWith(Common.getPoolNamePrefix())) {
            let key = tournamentKey[poolKey]
            poolMap[key] = await Common.getPoolItem(key)
        }
    }

    let resultsMap = {}
    for (let poolDataKey in poolMap) {
        let poolData = poolMap[poolDataKey]
        for (let resultsKey in poolData) {
            if (resultsKey.startsWith(Common.getResultsKeyPrefix())) {
                let resultsItem = await Common.getResultItem(poolData[resultsKey])

                resultsMap[resultsItem.judgeName] = resultsMap[resultsItem.judgeName] || {}
                resultsMap[resultsItem.judgeName][resultsItem.time] = resultsItem
            }
        }
    }

    return {
        tournamentKey: tournamentKey,
        tournamentInfo: await Common.getTournamentInfo(tournamentKey.tournamentInfoKey),
        poolMap: poolMap,
        resultsMap: resultsMap
    }
})}


