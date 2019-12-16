
const Mobx = require("mobx")

const MainStore = require("scripts/stores/mainStore.js")
const DataStore = require("scripts/stores/dataStore.js")
const Enums = require("scripts/stores/enumStore.js")
const DataBase = require("scripts/stores/dataBase.js")

module.exports.getDefaultConstants = function() {
    return {
        name: "oldEx"
    }
}

class TeamOldExScores extends DataBase.class {
    constructor() {
        super()

        this.point1Count = 0
        this.point2Count = 0
        this.point3Count = 0
        this.point5Count = 0
    }

    getPointCount(number) {
        switch (number) {
        case 1:
            return this.point1Count
        case 2:
            return this.point2Count
        case 3:
            return this.point3Count
        case 5:
            return this.point5Count
        }

        return undefined
    }

    setPointCount(number, count) {
        switch (number) {
        case 1:
            this.point1Count = count
            break
        case 2:
            this.point2Count = count
            break
        case 3:
            this.point3Count = count
            break
        case 5:
            this.point5Count = count
            break
        }
    }

    getExScore() {
        return 10 - calcDeductions(this)
    }
}

module.exports.DataClass = class extends DataStore.ResultsDataBase {
    constructor(poolData, results) {
        super(Enums.EInterface.oldEx, poolData.divisionIndex, poolData.roundIndex, poolData.poolIndex, poolData.teamList)

        this.teamScoreList = []
        for (let i = 0; i < this.teamList.length; ++i) {
            this.teamScoreList.push(new TeamOldExScores())
        }

        this.teamScoreList = Mobx.observable(this.teamScoreList)

        if (results !== undefined) {
            for (let i = 0; i < results.teamScoreList.length; ++i) {
                let data = results.teamScoreList[i]

                this.setGeneral(i, data.general)
                this.setScores(i, data.point1Count, data.point2Count, data.point3Count, data.point5Count)
            }
        }
    }

    setScores(teamIndex, p1, p2, p3, p5) {
        let team = this.teamScoreList[teamIndex]
        team.point1Count = p1
        team.point2Count = p2
        team.point3Count = p3
        team.point5Count = p5
    }
}

module.exports.verify = function(resultsData) {
    return resultsData !== undefined && resultsData.type === Enums.EInterface.oldEx
}

module.exports.getTotalDeductions = function(resultsData, teamIndex) {
    let team = resultsData.teamScoreList[teamIndex]
    return calcDeductions(team)
}

function calcDeductions(data) {
    return data.point1Count * .1 + data.point2Count * .2 + data.point3Count * .3 + data.point5Count * .5
}

module.exports.getSummary = function(resultsData, teamIndex) {
    if (module.exports.verify(resultsData)) {
        let ex = module.exports.getTotalDeductions(resultsData, teamIndex).toFixed(2)
        return `E: ${ex}`
    }

    return undefined
}

module.exports.getOverlaySummary = function(data) {
    return ` [Ex: ${calcDeductions(data).toFixed(2)}]`
}

module.exports.getFullProcessed = function(data, preProcessedData) {
    let processed = []

    processed.push({
        Score: 10 - calcDeductions(data)
    })

    return processed
}

module.exports.getIncrementalScoreboardProcessed = function(data, preProcessedData, processedData) {
    processedData.ex = 10 - calcDeductions(data)

    return undefined
}

module.exports.getScoreboardProcessed = function(data, preProcessedData, processedData) {
    processedData.ex = 10 - calcDeductions(data)

    return undefined
}

module.exports.getCategoryResultsProcessed = function(data, preProcessedData, processedData) {
    processedData.ex = calcDeductions(data)

    return undefined
}

module.exports.getOldExDetailedProcessed = function(data, preProcessedData) {
    let processed = []

    processed.push({
        ".1": data.point1Count
    })
    processed.push({
        ".2": data.point2Count
    })
    processed.push({
        ".3": data.point3Count
    })
    processed.push({
        ".5": data.point5Count
    })

    processed.push({
        Ex: -calcDeductions(data)
    })

    return processed
}

module.exports.getHudProcessed = function(data, preProcessedData, processedData) {
    processedData.ex = calcDeductions(data)
}
