
const Enums = require("scripts/stores/enumStore.js")
const InterfaceModelBase = require("scripts/interfaces/interfaceModelBase.js")
const MainStore = require("scripts/stores/mainStore.js")
const OldExData = require("scripts/interfaces/old/data/oldExData.js")
const CommonAction = require("scripts/actions/commonAction.js")

module.exports = class extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Old Ex Judge"
        this.type = Enums.EInterface.oldEx
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
    }

    createResultsData(results) {
        this.obs.results = new OldExData.DataClass(this.obs.playingPool, results)
    }

    incrementDeduction(point) {
        CommonAction.vibrateSingleShort()

        let teamResults = this.getActiveResultsData()
        let newCount = teamResults.getPointCount(point) + 1
        teamResults.setPointCount(point, newCount)

        this.reportScores()

        return newCount
    }

    decrementDeduction(point) {
        CommonAction.vibrateDoubleShort()

        let teamResults = this.getActiveResultsData()
        let newCount = Math.max(0, teamResults.getPointCount(point) - 1)
        teamResults.setPointCount(point, newCount)

        this.reportScores()

        return newCount
    }
}

