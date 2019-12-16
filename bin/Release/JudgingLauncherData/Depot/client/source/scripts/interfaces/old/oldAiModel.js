
const Enums = require("scripts/stores/enumStore.js")
const InterfaceModelBase = require("scripts/interfaces/interfaceModelBase.js")
const MainStore = require("scripts/stores/mainStore.js")
const OldAiData = require("scripts/interfaces/old/data/oldAiData.js")

module.exports = class extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Ai Judge"
        this.type = Enums.EInterface.oldAi
        this.showFinishOverlay = false

        this.playPoolHash = undefined
        this.observableHash = undefined
    }

    init() {
        super.init()

        if (MainStore.startupTournamentName !== undefined) {
            this.queryPoolData(MainStore.startupTournamentName)
        }

        setInterval(() => {
            this.queryPoolData(MainStore.tournamentName)
        }, this.updateIntervalMs)
    }

    fillWithResults() {
        super.fillWithResults()

        let teamResults = this.getActiveResultsData()
        if (teamResults !== undefined) {
            this.obs.currentTeamScore = teamResults.getAiScore()
        }
    }

    createResultsData(results) {
        this.obs.results = new OldAiData.DataClass(this.obs.playingPool, results)
    }

    setAiScore(value, key) {
        let teamResults = this.getActiveResultsData()
        teamResults.setAiData(key, value)

        this.obs.currentTeamScore = teamResults.getAiScore()

        this.reportScores()
    }
}

