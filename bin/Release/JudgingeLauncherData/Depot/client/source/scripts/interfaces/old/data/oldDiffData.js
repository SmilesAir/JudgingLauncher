
const Mobx = require("mobx")

const DataStore = require("scripts/stores/dataStore.js")
const Enums = require("scripts/stores/enumStore.js")
const DataBase = require("scripts/stores/dataBase.js")

module.exports.getDefaultConstants = function() {
    return {
        name: "oldDiff"
    }
}

class TeamDiffScores extends DataBase.class {
    constructor(blockCount) {
        super()

        this.scores = Mobx.observable(new Array(blockCount))
        this.consecs = Mobx.observable(new Array(blockCount))
    }

    setScore(blockIndex, score) {
        this.scores[blockIndex] = score
    }

    setConsec(blockIndex, isConsec) {
        this.consecs[blockIndex] = isConsec
    }

    getConsec(blockIndex) {
        return this.consecs[blockIndex]
    }

    getDiffScore() {
        return getDiffScore(this)
    }
}

module.exports.DataClass = class extends DataStore.ResultsDataBase {
    constructor(poolData, results, routineLengthSeconds) {
        super(Enums.EInterface.oldDiff, poolData.divisionIndex, poolData.roundIndex, poolData.poolIndex, poolData.teamList)

        this.teamScoreList = []
        for (let i = 0; i < this.teamList.length; ++i) {
            this.teamScoreList.push(new TeamDiffScores(Math.floor(routineLengthSeconds / 15)))
        }

        this.teamScoreList = Mobx.observable(this.teamScoreList)

        if (results !== undefined) {
            for (let resultIndex = 0; resultIndex < results.teamScoreList.length; ++resultIndex) {
                let data = results.teamScoreList[resultIndex]

                for (let blockIndex = 0; blockIndex < data.scores.length; ++blockIndex) {
                    this.setScore(resultIndex, blockIndex, data.scores[blockIndex])
                    this.setConsec(resultIndex, blockIndex, data.consecs && data.consecs[blockIndex] || false)
                }
            }
        }
    }

    setScore(teamIndex, blockIndex, score) {
        this.teamScoreList[teamIndex].setScore(blockIndex, score)
    }

    setConsec(teamIndex, blockIndex, isConsec) {
        this.teamScoreList[teamIndex].setConsec(blockIndex, isConsec)
    }

    getConsec(teamIndex, blockIndex) {
        return this.teamScoreList[teamIndex].getConsec(blockIndex)
    }

    getDiffScore(teamIndex) {
        return this.teamScoreList[teamIndex].getDiffScore()
    }
}

module.exports.verify = function(resultsData) {
    return resultsData !== undefined && resultsData.type === Enums.EInterface.oldDiff
}

function getDiffScore(data) {
    if (data === undefined || data.scores === undefined || data.scores.length === 0) {
        return 0
    }

    let scores = data.scores.slice(0)
    scores.sort((a, b) => {
        return a - b
    })

    scores.splice(0, 1)

    let total = 0
    for (let score of scores) {
        total += score || 0
    }

    let consecTotal = 0
    for (let consec of data.consecs) {
        consecTotal += consec ? 1 : 0
    }

    return (total / scores.length + consecTotal / data.consecs.length) * 1.5
}

module.exports.getSummary = function(resultsData, teamIndex) {
    if (module.exports.verify(resultsData)) {
        let data = resultsData.teamScoreList[teamIndex]
        return `D: ${getDiffScore(data).toFixed(2)}`
    }

    return undefined
}

module.exports.getOverlaySummary = function(data) {
    return ` [Difficulty: ${getDiffScore(data).toFixed(2)}]`
}

module.exports.getFullProcessed = function(data, preProcessedData) {
    let processed = []

    processed.push({
        Score: getDiffScore(data)
    })

    return processed
}

module.exports.getIncrementalScoreboardProcessed = function(data, preProcessedData, processedData) {
    return undefined
}

module.exports.getScoreboardProcessed = function(data, preProcessedData, processedData) {
    processedData.diff = getDiffScore(data)

    return undefined
}

module.exports.getCategoryResultsProcessed = function(data, preProcessedData, processedData) {
    processedData.diff = getDiffScore(data)

    return undefined
}

module.exports.getDiffDetailedProcessed = function(data, preProcessedData) {
    let processed = []

    processed.push({
        Marks: data.scores.join(" ")
    })
    processed.push({
        Score: getDiffScore(data)
    })

    return processed
}

module.exports.getHudProcessed = function(data, preProcessedData, processedData) {
    processedData.diff = getDiffScore(data)
}
