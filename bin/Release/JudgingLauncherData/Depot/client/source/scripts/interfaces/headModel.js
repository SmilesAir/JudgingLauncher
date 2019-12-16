
const uuid4 = require("uuid/v4")

const Enums = require("scripts/stores/enumStore.js")
const InterfaceModelBase = require("scripts/interfaces/interfaceModelBase.js")
const MainStore = require("scripts/stores/mainStore.js")
const DataStore = require("scripts/stores/dataStore.js")
const DataAction = require("scripts/actions/dataAction.js")
const CommonAction = require("scripts/actions/commonAction.js")

module.exports = class extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Head Judge"
        this.type = Enums.EInterface.head

        this.playingPoolKey = undefined
        this.playPoolHash = undefined
        this.observableHash = undefined

        this.obs.startTime = undefined
        this.obs.isJudging = false
        this.obs.judgingTimeMs = 0
        this.obs.passiveMode = false
        this.obs.playingPool = new Array(2)
        this.obs.playingTeamIndex = new Array(2)
        this.obs.playingAlt = false
        this.obs.adjustedPlayingIndex = undefined

        this.obs.autoUpdateScoreboard = false
        this.obs.autoUpdateTimeRemaining = 0
        this.autoUpdateScoreboardHandle = undefined
        this.autoUpdateTimeRemainingHandle = undefined

        this.awsData = new Array(2)
        this.obs.poolState = new Array(2)
    }

    init() {
        super.init()

        if (MainStore.startupTournamentName !== undefined) {
            this.queryPoolData(MainStore.startupTournamentName)
            setInterval(() => {
                this.update()
            }, 1000)
        }
    }

    getPoolDataForAWS(isAlt) {
        return {
            isAlt: isAlt,
            poolHash: uuid4(),
            pool: this.getPool(isAlt),
            observableHash: uuid4(),
            observable: {
                routineLengthSeconds: this.getPool(isAlt).routineLengthSeconds,
                playingTeamIndex: this.getPlayingIndex(isAlt),
                startTime: this.obs.startTime
            }
        }
    }

    getPool(isAlt) {
        return this.obs.playingPool[isAlt ? 1 : 0]
    }

    setPool(pool, isAlt) {
        this.obs.playingPool[isAlt ? 1 : 0] = pool
    }

    getPlayingIndex(isAlt) {
        return this.obs.playingTeamIndex[isAlt ? 1 : 0] || 0
    }

    setPlayingIndex(index, isAlt) {
        this.obs.playingTeamIndex[isAlt ? 1 : 0] = index
    }

    setupPlayingPool(pool, isAlt) {
        if (this.getPool(isAlt) !== pool) {
            this.setPool(pool, isAlt)
            this.setPlayingIndex(pool.teamList.length > 0 ? 0 : undefined, isAlt)

            this.awsData[isAlt ? 1 : 0] = this.getPoolDataForAWS(isAlt)
        }

        this.sendDataToAWS()
    }

    calcTeamList() {
        let teamList = this.getPool(false).teamList.slice(0)
        let poolAlt = this.getPool(true)
        if (poolAlt !== undefined) {
            let insertIndex = 1
            for (let i = 0; i < poolAlt.teamList.length; ++i) {
                teamList.splice(insertIndex, 0, poolAlt.teamList[i])
                insertIndex = Math.min(teamList.length, insertIndex + 2)
            }
        }

        return teamList
    }

    setPoolPlaying(playing, playingAlt) {
        if (playing !== undefined && this.awsData[0] !== undefined && this.awsData[0].observable.isPlaying !== playing) {
            this.awsData[0].observable.isPlaying = playing
            this.dirtyObs(false)
        }

        if (playingAlt !== undefined && this.awsData[1] !== undefined && this.awsData[1].observable.isPlaying !== playingAlt) {
            this.awsData[1].observable.isPlaying = playingAlt
            this.dirtyObs(true)
        }
    }

    setPlayingTeam(teamData) {
        let index = this.getPool(false) && this.getPool(false).teamList.indexOf(teamData)
        let indexAlt = this.getPool(true) && this.getPool(true).teamList.indexOf(teamData)
        let isAlt = index === -1

        this.setPoolPlaying(!isAlt, isAlt)

        if (index !== undefined && index !== -1) {
            this.setPlayingTeamIndex(index, false)
        }

        if (indexAlt !== undefined && indexAlt !== -1) {
            this.setPlayingTeamIndex(indexAlt, true)
        }

        let teamList = this.calcTeamList()
        this.obs.adjustedPlayingIndex = teamList.indexOf(teamData)
    }

    setPlayingTeamIndex(index, isAlt) {
        this.setPlayingIndex(index, isAlt)
        this.awsData[isAlt ? 1 : 0].observable.playingTeamIndex = index
        this.dirtyObs(isAlt)

        this.sendDataToAWS()

        this.obs.playingAlt = isAlt
    }

    getAdjustPlayingIndex() {
        return this.obs.adjustedPlayingIndex
    }

    moveToNextTeam() {
        let teamList = this.calcTeamList()
        let isLastTeam = this.obs.adjustedPlayingIndex >= teamList.length - 1
        if (isLastTeam) {
            this.obs.adjustedPlayingIndex = undefined
            this.setPoolPlaying(false, false)
            this.setPlayingTeamIndex(undefined, false)
            this.setPlayingTeamIndex(undefined, true)
        } else {
            this.setPlayingTeam(teamList[this.obs.adjustedPlayingIndex + 1])
        }
    }

    dirtyObs(isAlt) {
        this.awsData[isAlt ? 1 : 0].observableHash = uuid4()
        this.awsData[isAlt ? 1 : 0].observable.startTime = this.obs.startTime
    }

    updateFromAws(awsData) {
        const isAlt = awsData.isAlt
        if (this.obs.passiveMode) {
            this.setPool(new DataStore.PoolData(awsData.pool), isAlt)
            this.setPlayingIndex(awsData.observable.playingTeamIndex, isAlt)
            this.obs.routineLengthSeconds = awsData.observable.routineLengthSeconds

            if (this.obs.startTime !== awsData.observable.startTime) {
                this.obs.startTime = awsData.observable.startTime

                this.uploadIncrementalScoreboardData()
            }

            this.awsData[isAlt ? 1 : 0] = awsData
        } else if (DataAction.isSamePool(this.getPool(isAlt), awsData.pool) === false) {
            location.reload(false)
        } else if (this.getPool(isAlt) === undefined) {
            this.setPool(new DataStore.PoolData(awsData.pool), isAlt)
            this.setPlayingIndex(awsData.observable.playingTeamIndex, isAlt)
            this.obs.routineLengthSeconds = awsData.observable.routineLengthSeconds

            this.awsData[isAlt ? 1 : 0] = awsData
        }

        this.obs.poolState[isAlt ? 1 : 0] = awsData.state

        return {
            userIdDirty: false
        }
    }

    updateResultsFromAws() {
        // Do Nothing
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
                data: this.awsData[0],
                dataAlt: this.awsData[1]
            })
        }).then((response) => {
            return response.json()
        }).then((response) => {
            if (response.status < 400) {
                this.playingPoolKey = response.playingPoolKey
            }
        }).catch((error) => {
            console.log("Error: Set Playing Pool", error)
        })
    }

    update() {
        this.queryPoolData(MainStore.tournamentName)
        this.queryPoolData(MainStore.tournamentName, true)

        this.obs.judgingTimeMs = this.obs.startTime !== undefined ? Date.now() - this.obs.startTime : 0
    }

    hasRoutineTimeElapsed() {
        return this.obs.judgingTimeMs / 1000 > this.obs.routineLengthSeconds
    }

    isDuringRoutineTime() {
        return this.obs.isJudging && !this.hasRoutineTimeElapsed()
    }

    onStartClick() {
        if (!this.obs.isJudging) {
            this.obs.isJudging = true

            this.obs.startTime = Date.now()
            this.dirtyObs(this.obs.playingAlt)
            this.sendDataToAWS()

            this.uploadIncrementalScoreboardData()

            this.updateHandle = setInterval(() => {
                this.update()
            }, 100)
        } else if (this.hasRoutineTimeElapsed()) {
            this.onStopClick(true)

            this.moveToNextTeam()
        }
    }

    onStopClick(skipAwsUpdate) {
        this.obs.isJudging = false

        clearInterval(this.updateHandle)

        this.obs.judgingTimeMs = 0
        this.obs.startTime = undefined

        if (!skipAwsUpdate) {
            this.dirtyObs(this.obs.playingAlt)
            this.sendDataToAWS()
        }
    }

    setPassiveMode(enabled) {
        this.obs.passiveMode = enabled
    }

    createResultsData() {
        // unused
    }

    uploadIncrementalScoreboardData() {
        let playingPool = this.getPool(this.obs.playingAlt)
        DataAction.fillPoolResults(playingPool).then(() => {
            let data = DataAction.getScoreboardResultsProcessed(playingPool, this.obs.routineLengthSeconds, true)

            CommonAction.fetchEx("SET_SCOREBOARD_DATA", {
                tournamentName: MainStore.tournamentName
            }, undefined, {
                method: "POST",
                body: JSON.stringify({
                    scoreboardData: {
                        title: DataAction.getFullPoolDescription(playingPool),
                        data: data,
                        incremental: true,
                        startTime: this.obs.startTime,
                        routineLengthSeconds: this.obs.routineLengthSeconds
                    }
                })
            }).catch((error) => {
                console.error(`Can't update scoreboard data. ${error}`)
            })
        })
    }

    finalizeScoreboardData() {
        this.setEnabledAutoUpdateScoreboard(false)
        let playingPool = this.getPool(this.obs.playingAlt)

        DataAction.fillPoolResults(playingPool).then(() => {
            let data = DataAction.getScoreboardResultsProcessed(playingPool, this.obs.routineLengthSeconds)

            CommonAction.fetchEx("SET_SCOREBOARD_DATA", {
                tournamentName: MainStore.tournamentName
            }, undefined, {
                method: "POST",
                body: JSON.stringify({
                    scoreboardData: {
                        title: DataAction.getFullPoolDescription(playingPool),
                        data: data,
                        startTime: this.obs.startTime,
                        routineLengthSeconds: this.obs.routineLengthSeconds
                    }
                })
            }).catch((error) => {
                console.error(`Can't update scoreboard data. ${error}`)
            })
        })
    }

    toggleAutoUpdateScoreboard() {
        this.setEnabledAutoUpdateScoreboard(!this.obs.autoUpdateScoreboard)
    }

    setEnabledAutoUpdateScoreboard(enabled) {
        this.obs.autoUpdateScoreboard = enabled

        if (enabled) {
            const updateIntervalMs = 9 * 1000
            this.obs.autoUpdateTimeRemaining = updateIntervalMs
            this.autoUpdateScoreboardHandle = setInterval(() => {
                this.obs.autoUpdateTimeRemaining = updateIntervalMs
                this.uploadIncrementalScoreboardData()
            }, updateIntervalMs)

            this.autoUpdateTimeRemainingHandle = setInterval(() => {
                this.obs.autoUpdateTimeRemaining -= 100
            }, 100)
        } else {
            clearInterval(this.autoUpdateScoreboardHandle)
            clearInterval(this.autoUpdateTimeRemainingHandle)
        }
    }
}
