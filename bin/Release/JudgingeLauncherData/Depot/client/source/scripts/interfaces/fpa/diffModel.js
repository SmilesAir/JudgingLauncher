

const Enums = require("scripts/stores/enumStore.js")
const InterfaceModelBase = require("scripts/interfaces/interfaceModelBase.js")
const MainStore = require("scripts/stores/mainStore.js")
const DiffData = require("scripts/interfaces/fpa/data/diffData.js")
const CommonAction = require("scripts/actions/commonAction.js")

module.exports = class extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Diff Judge"
        this.type = Enums.EInterface.diff

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
        this.obs.results = new DiffData.DataClass(this.obs.playingPool, results)
    }

    addScore(score) {
        this.obs.results.addScore(this.getActiveTeamIndex(), score)

        this.reportScores()
    }

    startEdit(markIndex) {
        this.obs.editIndex = markIndex
    }

    endEdit(score) {
        if (score !== undefined && this.obs.editIndex !== undefined) {
            if (score === 0) {
                this.obs.results.teamScoreList[this.getActiveTeamIndex()].scores.splice(this.obs.editIndex, 1)
            } else {
                this.obs.results.teamScoreList[this.getActiveTeamIndex()].scores[this.obs.editIndex] = score
            }

            CommonAction.vibrateSingleMedium()

            this.reportScores()
        }

        this.obs.editIndex = undefined
    }
}
