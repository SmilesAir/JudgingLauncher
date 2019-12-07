
const Enums = require("scripts/stores/enumStore.js")
const InterfaceModelBase = require("scripts/interfaces/interfaceModelBase.js")
const MainStore = require("scripts/stores/mainStore.js")
const VarietyData = require("scripts/interfaces/fpa/data/varietyData.js")

module.exports = class extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Variety Judge"
        this.type = Enums.EInterface.variety

        this.playPoolHash = undefined
        this.observableHash = undefined

        this.obs.dragTeamIndex = undefined
        this.obs.editIndex = undefined
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

    createResultsData(results) {
        this.obs.results = new VarietyData.DataClass(this.obs.playingPool, results)
    }

    setQualityScore(score) {
        this.obs.results.setQualityScore(this.getActiveTeamIndex(), score)

        this.reportScores()
    }

    setQuantityScore(score) {
        this.obs.results.setQuantityScore(this.getActiveTeamIndex(), score)

        this.reportScores()
    }
}

