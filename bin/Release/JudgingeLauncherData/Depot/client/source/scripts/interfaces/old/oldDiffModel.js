

const Enums = require("scripts/stores/enumStore.js")
const InterfaceModelBase = require("scripts/interfaces/interfaceModelBase.js")
const MainStore = require("scripts/stores/mainStore.js")
const OldDiffData = require("scripts/interfaces/old/data/oldDiffData.js")
const CommonAction = require("scripts/actions/commonAction.js")

let markSounds = []
for (let i = 1; i <= 20; ++i) {
    markSounds[i] = require(`sounds/Mark${i}.mp3`)
}
const markEnd = require("sounds/End.mp3")

module.exports = class extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Old Diff Judge"
        this.type = Enums.EInterface.oldDiff
        this.showFinishOverlay = false

        this.playPoolHash = undefined
        this.observableHash = undefined

        this.obs.dragTeamIndex = undefined
        this.obs.editIndex = undefined
        this.obs.activeInputIndex = undefined

        this.lastPlayedMarkIndex = undefined
        this.activateInputArray = []
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

        if (this.obs.results !== undefined) {
            this.obs.currentTeamScore = this.obs.results.getDiffScore(this.getActiveTeamIndex())
        }
    }

    createResultsData(results) {
        this.obs.results = new OldDiffData.DataClass(this.obs.playingPool, results, this.obs.routineLengthSeconds)
    }

    setActiveScore(score) {
        if (this.obs.activeInputIndex !== undefined) {
            this.obs.results.setScore(this.getActiveTeamIndex(), this.obs.activeInputIndex, score)

            this.obs.currentTeamScore = this.obs.results.getDiffScore(this.getActiveTeamIndex())

            this.reportScores()

            return true
        } else {
            return false
        }
    }

    setConsec(blockIndex, isConsec) {
        this.obs.results.setConsec(this.getActiveTeamIndex(), blockIndex, isConsec)

        this.activateInputArray[blockIndex] = false

        this.obs.currentTeamScore = this.obs.results.getDiffScore(this.getActiveTeamIndex())

        this.reportScores()
    }

    getConsec(blockIndex) {
        return this.obs.results.getConsec(this.getActiveTeamIndex(), blockIndex)
    }

    startEdit(markIndex) {
        this.obs.editIndex = markIndex
    }

    endEdit(score) {
        if (score !== undefined && this.obs.editIndex !== undefined) {
            this.obs.results.teamScoreList[this.getActiveTeamIndex()].scores[this.obs.editIndex] = score

            CommonAction.vibrateSingleMedium()

            this.obs.currentTeamScore = this.obs.results.getDiffScore(this.getActiveTeamIndex())

            this.reportScores()
        }

        this.obs.editIndex = undefined
    }

    onRoutineStart() {
        super.onRoutineStart()

        this.obs.activeInputIndex = undefined
        this.activateInputArray = []
    }

    onRoutineUpdate() {
        super.onRoutineUpdate()

        this.obs.activeInputIndex = undefined

        let scores = this.obs.results.teamScoreList[this.getActiveTeamIndex()].scores
        let activeIndex = Math.min(Math.floor(MainStore.routineTimeMs / 15000) - 1, scores.length - 1)
        if (activeIndex >= 0) {
            if (this.activateInputArray[activeIndex] === undefined) {
                this.obs.activeInputIndex = activeIndex
            }

            if (activeIndex !== this.lastPlayedMarkIndex) {
                this.lastPlayedMarkIndex = activeIndex

                new Audio(markSounds[activeIndex + 1]).play()

                if (activeIndex === scores.length - 1) {
                    setTimeout(() => {
                        new Audio(markEnd).play()
                    }, 2000)
                }
            }
        }
    }

    onRoutineStop() {
        super.onRoutineStop()

        this.obs.activeInputIndex = undefined
    }
}
