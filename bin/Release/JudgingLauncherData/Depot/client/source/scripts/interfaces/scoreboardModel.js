
const Enums = require("scripts/stores/enumStore.js")
const MainStore = require("scripts/stores/mainStore.js")
const InterfaceModelBase = require("scripts/interfaces/interfaceModelBase.js")
const DataStore = require("scripts/stores/dataStore.js")
const DataAction = require("scripts/actions/dataAction.js")

module.exports = class extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Scoreboard"
        this.type = Enums.EInterface.scoreboard
        this.showFinishOverlay = false
    }

    init() {
        super.init()

        if (MainStore.tournamentName !== undefined) {
            setInterval(() => {
                this.update()
            }, 2000)
        }
    }

    update() {
        this.queryPoolData(MainStore.tournamentName)
    }

    createResultsData() {
        // unused
    }

    fillWithResults() {
        // unused
    }

    updateFromAws(awsData) {
        this.obs.pool = new DataStore.PoolData(awsData.pool)
        this.obs.incremental = awsData.observable.isScoreboardIncremental || false

        return super.updateFromAws(awsData)
    }

    updateResultsFromAws(results) {
        this.obs.pool.results = results
        this.obs.resultsData = DataAction.getFullResultsProcessed(this.obs.pool, this.obs.routineLengthSeconds)
        this.obs.title = DataAction.getFullPoolDescription(this.obs.pool)
    }
}
