
const DataManager = require("../source/dataManager.js")

module.exports.getTournamentKey = function(tournamentName) {
    return DataManager.getTournamentKey(tournamentName)
}

module.exports.getPoolItem = function(poolKey) {
    return DataManager.getPoolItem(poolKey)
}

module.exports.getResultItem = function(resultsKey) {
    return DataManager.getResultItem(resultsKey)
}

module.exports.setPoolItem = function(pool) {
    DataManager.setPoolItem(pool)
}

module.exports.updateActivePoolAttribute = async function(tournamentName, attributeName, attributeValue, isAlt) {
    await DataManager.updateActivePoolAttribute(tournamentName, attributeName, attributeValue, isAlt)
}

module.exports.updatePoolAttribute = async function(tournamentName, poolKey, attributeName, attributeValue) {
    await DataManager.updatePoolAttribute(tournamentName, poolKey, attributeName, attributeValue)
}

module.exports.updateTournamentKeyWithObject = async function(tournamentName, newObject) {
    await DataManager.updateTournamentKeyWithObject(tournamentName, newObject)
}

module.exports.updateTournamentKeyPlayingPool = async function(tournamentName, playingPoolKey) {
    await DataManager.updateTournamentKeyPlayingPool(tournamentName, playingPoolKey)
}

module.exports.getResultsHistory = function(judgeName, startTime) {
    // Todo
}

module.exports.setResults = function(judgeName, time, results) {
    DataManager.setResults(judgeName, time, results)
}

module.exports.setJudgeState = async function(tournamentName, judgeId, status, isAlt) {
    await DataManager.setJudgeState(tournamentName, judgeId, status, isAlt)
}
