
const Mobx = require("mobx")

const DataStore = require("scripts/stores/dataStore.js")
const Enums = require("scripts/stores/enumStore.js")
const DataBase = require("scripts/stores/dataBase.js")

module.exports.getDefaultConstants = function() {
    return {
        name: "oldAi"
    }
}

class TeamOldAiScores extends DataBase.class {
    constructor() {
        super()

        this.music = 0
        this.teamwork = 0
        this.variety = 0
        this.form = 0
        this.flow = 0
        this.general = 0
    }

    getAiData(key) {
        this[key] = this[key] || 0

        return this[key]
    }

    setAiData(key, value) {
        this[key] = value
    }

    getAiScore() {
        return calcAiScore(this)
    }
}

module.exports.DataClass = class extends DataStore.ResultsDataBase {
    constructor(poolData, results) {
        super(Enums.EInterface.oldAi, poolData.divisionIndex, poolData.roundIndex, poolData.poolIndex, poolData.teamList)

        this.teamScoreList = []
        for (let i = 0; i < this.teamList.length; ++i) {
            this.teamScoreList.push(new TeamOldAiScores())
        }

        this.teamScoreList = Mobx.observable(this.teamScoreList)

        if (results !== undefined) {
            for (let i = 0; i < results.teamScoreList.length; ++i) {
                let data = results.teamScoreList[i]

                this.setScores(i, data.music, data.teamwork, data.variety, data.form, data.flow, data.general)
            }
        }
    }

    setScores(teamIndex, music, teamwork, variety, form, flow, general) {
        let team = this.teamScoreList[teamIndex]
        team.music = music
        team.teamwork = teamwork
        team.variety = variety
        team.form = form
        team.flow = flow
        team.general = general
    }
}

module.exports.verify = function(resultsData) {
    return resultsData !== undefined && resultsData.type === Enums.EInterface.oldAi
}

function getMusic(data) {
    return data.music || 0
}

function getTeamwork(data) {
    return data.teamwork || 0
}

function getVariety(data) {
    return data.variety || 0
}

function getForm(data) {
    return data.form || 0
}

function getFlow(data) {
    return data.flow || 0
}

function getGeneral(data) {
    return data.general || 0
}

function calcAiScore(data) {
    return (getMusic(data) + getTeamwork(data) + getVariety(data) + getForm(data) + getFlow(data) + getGeneral(data)) / 6
}

module.exports.getSummary = function(resultsData, teamIndex) {
    if (module.exports.verify(resultsData)) {
        let team = resultsData.teamScoreList[teamIndex]
        let ai = calcAiScore(team).toFixed(2)
        return `A: ${ai}`
    }

    return undefined
}

module.exports.getOverlaySummary = function(data) {
    return ` [M: ${getMusic(data)}, T: ${getTeamwork(data)}, V: ${getVariety(data)}, Fm: ${getForm(data)}, Fl: ${getFlow(data)}, G: ${getGeneral(data)}}]`
}

module.exports.getFullProcessed = function(data, preProcessedData) {
    let processed = []

    processed.push({
        M: data.music
    })

    processed.push({
        T: data.teamwork
    })

    processed.push({
        V: data.variety
    })

    processed.push({
        Fm: data.form
    })

    processed.push({
        Fl: data.flow
    })

    processed.push({
        G: data.general
    })

    processed.push({
        Score: calcAiScore(data)
    })

    return processed
}

module.exports.getIncrementalScoreboardProcessed = function(data, preProcessedData, processedData) {
    return undefined
}

module.exports.getScoreboardProcessed = function(data, preProcessedData, processedData) {
    processedData.ai = calcAiScore(data)

    return undefined
}

module.exports.getCategoryResultsProcessed = function(data, preProcessedData, processedData) {
    processedData.ai = calcAiScore(data)

    return undefined
}
