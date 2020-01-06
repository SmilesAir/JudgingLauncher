
const Mobx = require("mobx")

const MainStore = require("scripts/stores/mainStore.js")
const DataStore = require("scripts/stores/dataStore.js")
const Enums = require("scripts/stores/enumStore.js")
const DataBase = require("scripts/stores/dataBase.js")

module.exports.getDefaultConstants = function() {
    return {
        name: "exAi",
        startCountPerSecond: 0.08,
        endCountPerSecond: 0.333,
        xScaler: 0.5,
        baseScaler: 1.5
    }
}

class TeamExAiScores extends DataBase.class {
    constructor() {
        super()

        this.music = {
            score: 0
        }
        this.teamwork = {
            score: 0
        }
        this.form = {
            score: 0
        }
        this.point1Count = 0
        this.point2Count = 0
        this.point3Count = 0
        this.point5Count = 0
    }

    getAiData(key) {
        this[key] = this[key] || {
            score: 0
        }

        return this[key]
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
}

module.exports.DataClass = class extends DataStore.ResultsDataBase {
    constructor(poolData, results) {
        super(Enums.EInterface.exAi, poolData.divisionIndex, poolData.roundIndex, poolData.poolIndex, poolData.teamList)

        this.teamScoreList = []
        for (let i = 0; i < this.teamList.length; ++i) {
            this.teamScoreList.push(new TeamExAiScores())
        }

        this.teamScoreList = Mobx.observable(this.teamScoreList)

        if (results !== undefined) {
            for (let i = 0; i < results.teamScoreList.length; ++i) {
                let data = results.teamScoreList[i]

                this.setGeneral(i, data.general)
                this.setScores(i, data.music, data.teamwork, data.form, data.point1Count, data.point2Count, data.point3Count, data.point5Count)
            }
        }
    }

    setScores(teamIndex, music, teamwork, form, p1, p2, p3, p5) {
        let team = this.teamScoreList[teamIndex]
        team.music = music
        team.teamwork = teamwork
        team.form = form
        team.point1Count = p1
        team.point2Count = p2
        team.point3Count = p3
        team.point5Count = p5
    }
}

module.exports.verify = function(resultsData) {
    return resultsData !== undefined && resultsData.type === Enums.EInterface.exAi
}

module.exports.getTotalDeductions = function(resultsData, teamIndex) {
    let team = resultsData.teamScoreList[teamIndex]
    return calcDeductions(team)
}

function getMusic(data) {
    return data.music !== undefined ? data.music.score : 0
}

function getTeamwork(data) {
    return data.teamwork !== undefined ? data.teamwork.score : 0
}

function getForm(data) {
    return data.form !== undefined ? data.form.score : 0
}

function calcAiScore(data) {
    return (getMusic(data) + getTeamwork(data) + getForm(data)) / 4 + DataBase.calcCommonScore(data)
}

// https://www.wolframalpha.com/input/?i=y+%3D+(((50+-+x+%2F+2)+%2F+50)+%5E+2),+x+from+0+to+50
function getExScaler(phraseCount, routineLengthSeconds) {
    if (phraseCount !== undefined && routineLengthSeconds !== undefined) {
        let constants = MainStore.constants.exAi
        let start = routineLengthSeconds * constants.startCountPerSecond
        let end = routineLengthSeconds * constants.endCountPerSecond
        let delta = end - start

        if (phraseCount > start) {
            return Math.pow((delta - Math.max(0, Math.min(end, phraseCount - start) / constants.xScaler)) / delta, 2)
        }
    }

    return 1
}

function calcDeductions(data, phraseCount, routineLengthSeconds) {
    let raw = data.point1Count * .1 + data.point2Count * .2 + data.point3Count * .3 + data.point5Count * .5

    raw *= MainStore.constants.exAi.baseScaler

    return raw * getExScaler(phraseCount, routineLengthSeconds)
}

module.exports.getSummary = function(resultsData, teamIndex) {
    if (module.exports.verify(resultsData)) {
        let team = resultsData.teamScoreList[teamIndex]
        let ai = calcAiScore(team).toFixed(1)
        let ex = module.exports.getTotalDeductions(resultsData, teamIndex).toFixed(1)
        return `A: ${ai} E: ${ex}`
    }

    return undefined
}

module.exports.getOverlaySummary = function(data) {
    return ` [M: ${getMusic(data)}, T: ${getTeamwork(data)}, F: ${getForm(data)}, G: ${data.general}, Total: ${calcAiScore(data).toFixed(1)}, Ex: ${calcDeductions(data).toFixed(1)}]`
}

module.exports.getHeaderSummary = function(data) {
    return `[${calcDeductions(data).toFixed(1)}/${calcAiScore(data).toFixed(1)}]`
}

module.exports.getFullProcessed = function(data, preProcessedData) {
    return {
        type: Enums.EInterface.exAi,
        aI: calcAiScore(data),
        ex: calcDeductions(data),
        adjustedEx: calcDeductions(data, preProcessedData.totalPhraseCount / Math.max(1, preProcessedData.diffJudgeCount), preProcessedData.routineLengthSeconds),
        general: data.general,
        music: getMusic(data),
        teamwork: getTeamwork(data),
        form: getForm(data),
        point1Count: data.point1Count,
        point2Count: data.point2Count,
        point3Count: data.point3Count,
        point5Count: data.point5Count,
        score: calcAiScore(data)
    }
}

module.exports.getIncrementalScoreboardProcessed = function(data, preProcessedData) {
    return {
        rawEx: calcDeductions(data),
        ex: calcDeductions(data)
    }
}

module.exports.getScoreboardProcessed = function(data, preProcessedData) {
    return {
        rawEx: calcDeductions(data),
        ex: calcDeductions(data)
    }
}

module.exports.getCategoryResultsProcessed = function(data, preProcessedData, processedData) {
    processedData.ai = (processedData.ai || 0) + calcAiScore(data)
    processedData.ex = (processedData.ex || 0) + calcDeductions(data, preProcessedData.totalPhraseCount / Math.max(1, preProcessedData.diffJudgeCount), preProcessedData.routineLengthSeconds)

    return undefined
}

module.exports.getExAiDetailedProcessed = function(data, preProcessedData) {
    let processed = []

    processed.push({
        Music: getMusic(data)
    })
    processed.push({
        Team: getTeamwork(data)
    })
    processed.push({
        Form: getForm(data)
    })
    processed.push({
        General: data.general
    })
    processed.push({
        Score: calcAiScore(data)
    })

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

    let phraseCount = preProcessedData.totalPhraseCount / Math.max(1, preProcessedData.diffJudgeCount)
    processed.push({
        Scaler: getExScaler(phraseCount, preProcessedData.routineLengthSeconds)
    })

    processed.push({
        Raw: calcDeductions(data)
    })

    let adjusted = calcDeductions(data, phraseCount, preProcessedData.routineLengthSeconds)
    processed.push({
        Adj: adjusted
    })

    return processed
}

module.exports.getHudProcessed = function(data, preProcessedData, processedData) {
    processedData.ex = calcDeductions(data)
}
