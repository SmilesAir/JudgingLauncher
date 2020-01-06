
const uuid4 = require("uuid/v4")

const Enums = require("scripts/stores/enumStore.js")
const InterfaceModelBase = require("scripts/interfaces/interfaceModelBase.js")
const MainStore = require("scripts/stores/mainStore.js")
const DataStore = require("scripts/stores/dataStore.js")
const CommonAction = require("scripts/actions/commonAction.js")

module.exports = class extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Announcer"
        this.type = Enums.EInterface.announcer

        this.playingPoolKey = undefined
        this.playPoolHash = undefined
        this.observableHash = undefined

        this.obs.startTime = undefined
        this.obs.isJudging = false
        this.obs.judgingTimeMs = 0
        this.obs.passiveMode = true

        this.awsData = undefined
    }

    init() {
        super.init()

        if (MainStore.startupTournamentName !== undefined) {
            this.queryPoolData(MainStore.startupTournamentName)
        }
    }

    getPoolDataForAWS() {
        return {
            poolHash: uuid4(),
            pool: this.obs.playingPool,
            observableHash: uuid4(),
            observable: {
                routineLengthSeconds: this.obs.routineLengthSeconds,
                playingTeamIndex: this.obs.playingTeamIndex,
                startTime: this.obs.startTime
            }
        }
    }

    setPlayingTeam(teamData) {
        let index = this.obs.playingPool.teamList.indexOf(teamData)
        if (index !== -1) {
            this.setPlayingTeamIndex(index)
        }
    }

    setPlayingTeamIndex(index) {
        if (this.obs.playingTeamIndex !== index) {
            this.obs.playingTeamIndex = index
            this.awsData.observable.playingTeamIndex = index
            this.dirtyObs()

            this.sendDataToAWS()
        }
    }

    moveToNextTeam() {
        let isLastTeam = this.obs.playingTeamIndex >= this.obs.playingPool.teamList.length - 1
        this.setPlayingTeamIndex(isLastTeam ? undefined : this.obs.playingTeamIndex + 1)
    }

    dirtyObs() {
        this.awsData.observableHash = uuid4()
        this.awsData.observable.startTime = this.obs.startTime
    }

    updateFromAws(awsData) {
        this.obs.playingPool = new DataStore.PoolData(awsData.pool)
        this.obs.playingTeamIndex = awsData.observable.playingTeamIndex
        this.obs.routineLengthSeconds = awsData.observable.routineLengthSeconds
        if (this.obs.showScoreboard === undefined) {
            this.obs.showScoreboard = awsData.state.streamOverlay && awsData.state.streamOverlay.showScoreboard === true
        }

        if (this.obs.passiveMode) {
            this.obs.startTime = awsData.observable.startTime
        }

        this.awsData = awsData

        return {
            userIdDirty: false
        }
    }

    sendDataToAWS() {
        CommonAction.fetchEx("SET_PLAYING_POOL", {
            tournamentName: MainStore.tournamentName
        }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                data: this.awsData
            })
        }).catch((error) => {
            console.log("Error: Set Playing Pool", error)
        })
    }

    update() {
        this.obs.judgingTimeMs = this.obs.startTime !== undefined ? Date.now() - this.obs.startTime : 0
    }

    passiveUpdate() {
        this.queryPoolData(MainStore.tournamentName)

        this.update()
    }

    hasRoutineTimeElapsed() {
        return this.obs.judgingTimeMs / 1000 > this.obs.routineLengthSeconds
    }

    isDuringRoutineTime() {
        return this.obs.isJudging && !this.hasRoutineTimeElapsed()
    }

    startRoutine() {
        if (!this.obs.isJudging) {
            this.obs.isJudging = true

            this.obs.startTime = Date.now()
            this.dirtyObs()
            this.sendDataToAWS()

            this.updateHandle = setInterval(() => {
                this.update()
            }, 100)
        }
    }

    stopRoutine() {
        this.obs.isJudging = false

        clearInterval(this.updateHandle)

        this.obs.judgingTimeMs = 0
        this.obs.startTime = undefined

        this.dirtyObs()
        this.sendDataToAWS()
    }

    setPassiveMode(enabled) {
        this.obs.passiveMode = enabled

        if (enabled) {
            this.passiveUpdateHandle = setInterval(() => {
                this.passiveUpdate()
            }, 1000)
        } else {
            clearInterval(this.passiveUpdateHandle)
        }
    }

    createResultsData() {
        // unused
    }

    toggleShowScoreboard() {
        this.obs.showScoreboard = !this.obs.showScoreboard

        this.awsData.state = this.awsData.state || {}

        this.awsData.state.streamOverlay = this.awsData.state.streamOverlay || {}
        this.awsData.state.streamOverlay.showScoreboard = this.obs.showScoreboard
        this.dirtyObs()

        this.sendDataToAWS()
    }
}
