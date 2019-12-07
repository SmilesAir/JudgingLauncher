
const Enums = require("scripts/stores/enumStore.js")
const InterfaceModelBase = require("scripts/interfaces/interfaceModelBase.js")
const MainStore = require("scripts/stores/mainStore.js")
const DataStore = require("scripts/stores/dataStore.js")
const DataAction = require("scripts/actions/dataAction.js")

module.exports = class extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Diff Results Inspector"
        this.type = Enums.EInterface.diffInspector

        this.playPoolHash = undefined
        this.observableHash = undefined

        this.obs.dragTeamIndex = undefined
        this.obs.editIndex = undefined
    }

    init() {
        super.init()

        if (MainStore.startupTournamentName !== undefined) {
            this.queryIntervalHandle = setInterval(() => {
                if (MainStore.saveData !== undefined) {
                    this.queryPoolData(MainStore.tournamentName)

                    clearInterval(this.queryIntervalHandle)
                }
            }, 200)
        }
    }

    updateFromAws(awsData) {
        if (MainStore.saveData === undefined) {
            return
        }

        if (this.playPoolHash !== awsData.poolHash) {
            this.playPoolHash = awsData.poolHash
            this.obs.playingPool = new DataStore.PoolData(awsData.pool)

            DataAction.fillPoolResults(this.obs.playingPool).then(() => {
                this.obs.results = this.obs.playingPool.results
            })
        }

        if (this.observableHash !== awsData.observableHash) {
            this.observableHash = awsData.observableHash
            this.obs.routineLengthSeconds = awsData.observable.routineLengthSeconds
            this.obs.playingTeamIndex = awsData.observable.playingTeamIndex
        }
    }
}

