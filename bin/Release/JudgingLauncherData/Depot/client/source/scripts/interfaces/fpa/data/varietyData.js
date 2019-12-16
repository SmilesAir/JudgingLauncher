
const Mobx = require("mobx")

const MainStore = require("scripts/stores/mainStore.js")
const DataStore = require("scripts/stores/dataStore.js")
const Enums = require("scripts/stores/enumStore.js")
const DataBase = require("scripts/stores/dataBase.js")

module.exports.getDefaultConstants = function() {
    return {
        name: "variety",
        basePerSecond: 0.25
    }
}

class TeamVarietyScores extends DataBase.class {
    constructor() {
        super()
        
        this.quantityScore = 0
        this.qualityScore = 0
    }
}

module.exports.DataClass = class extends DataStore.ResultsDataBase {
    constructor(poolData, results) {
        super(Enums.EInterface.variety, poolData.divisionIndex, poolData.roundIndex, poolData.poolIndex, poolData.teamList)

        this.teamScoreList = []
        for (let i = 0; i < this.teamList.length; ++i) {
            this.teamScoreList.push(new TeamVarietyScores())
        }

        this.teamScoreList = Mobx.observable(this.teamScoreList)

        if (results !== undefined) {
            for (let resultIndex = 0; resultIndex < results.teamScoreList.length; ++resultIndex) {
                let data = results.teamScoreList[resultIndex]

                this.setGeneral(resultIndex, data.general)
                this.setScores(resultIndex, data.quantityScore, data.qualityScore)
            }
        }
    }

    setScores(teamIndex, quantity, quality) {
        this.setQuantityScore(teamIndex, quantity)
        this.setQualityScore(teamIndex, quality)
    }

    setQuantityScore(teamIndex, quantity) {
        this.teamScoreList[teamIndex].quantityScore = quantity
    }

    setQualityScore(teamIndex, quality) {
        this.teamScoreList[teamIndex].qualityScore = quality
    }
}

module.exports.verify = function(resultsData) {
    return resultsData !== undefined && resultsData.type === Enums.EInterface.variety
}

module.exports.getSummary = function(resultsData, teamIndex) {
    if (module.exports.verify(resultsData)) {
        let team = resultsData.teamScoreList[teamIndex]
        return `V: ${team.quantityScore}/${team.qualityScore}`
    }

    return undefined
}

module.exports.getOverlaySummary = function(data) {
    return ` [Quantity: ${data.quantityScore}, Quality: ${data.qualityScore}, G: ${data.general}]`
}

function calcScore(data, preProcessedData) {
    let constants = MainStore.constants.variety
    let base = preProcessedData.routineLengthSeconds * constants.basePerSecond
    return data.qualityScore * data.quantityScore / base + DataBase.calcCommonScore(data)
}

module.exports.getFullProcessed = function(data, preProcessedData) {
    return {
        type: Enums.EInterface.variety,
        quantity: data.quantityScore,
        quality: data.qualityScore,
        general: data.general,
        score: calcScore(data, preProcessedData)
    }
}

module.exports.getIncrementalScoreboardProcessed = function(data, preProcessedData, processedData) {
    processedData.unique = Math.round(preProcessedData.totalQuantityCount / preProcessedData.varietyJudgeCount)
}

module.exports.getScoreboardProcessed = function(data, preProcessedData, processedData) {
    processedData.unique = Math.round(preProcessedData.totalQuantityCount / preProcessedData.varietyJudgeCount)
    processedData.variety = (processedData.variety || 0) + calcScore(data, preProcessedData)

    return undefined
}

module.exports.getCategoryResultsProcessed = function(data, preProcessedData, processedData) {
    processedData.variety = (processedData.variety || 0) + calcScore(data, preProcessedData)

    return undefined
}

module.exports.getPreProcessed = function(data, preProcessedData) {
    preProcessedData.totalQuantityCount = (preProcessedData.totalQuantityCount || 0) + data.quantityScore
    preProcessedData.varietyJudgeCount = (preProcessedData.varietyJudgeCount || 0) + 1
}
