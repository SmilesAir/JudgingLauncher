
const Mobx = require("mobx")

const Enums = require("scripts/stores/enumStore.js")
const MainStore = require("scripts/stores/mainStore.js")
const DataStore = require("scripts/stores/dataStore.js")
const DataAction = require("scripts/actions/dataAction.js")
const CommonAction = require("scripts/actions/commonAction.js")

class InterfaceModelBase {
    constructor() {
        this.name = "No Model Name"
        this.type = Enums.EInterface.invalid
        this.updateIntervalMs = 3000
        this.needShowFinishView = false
        this.showFinishOverlay = true

        this.obs = Mobx.observable({
            routineLengthSeconds: 60,
            playingPool: undefined,
            playingTeamIndex: undefined,
            editTeamIndex: undefined,
            backupModeEnabled: false,
            results: undefined,
            currentTeamScore: 0
        })
    }

    init() {
        this.isAlt = MainStore.url.searchParams.get("alt") === "true"

        if (this.obs !== undefined) {
            this.setObs(this.obs)
        }
    }

    setObs(obs) {
        MainStore.interfaceObs = obs
    }

    reportScores() {
        CommonAction.fetchEx("REPORT_JUDGE_SCORE", undefined, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                tournamentName: MainStore.tournamentName,
                judgeId: MainStore.userId,
                results: this.obs.results
            })
        }).catch((error) => {
            console.log("Report Scores Error:", error)
        })
    }

    updateFromAws(awsData) {
        let poolDirty = this.playPoolHash !== awsData.poolHash
        let obsDirty = this.observableHash !== awsData.observableHash
        if (poolDirty) {
            this.playPoolHash = awsData.poolHash
            this.obs.playingPool = new DataStore.PoolData(awsData.pool)
        }

        if (obsDirty) {
            this.observableHash = awsData.observableHash
            this.obs.routineLengthSeconds = awsData.observable.routineLengthSeconds
            if (this.obs.playingTeamIndex !== awsData.observable.playingTeamIndex) {
                this.obs.playingTeamIndex = awsData.observable.playingTeamIndex

                this.sendState(Enums.EStatus.ready)

                this.fillWithResults()
            }

            if (this.obs.startTime === undefined && awsData.observable.startTime !== undefined) {
                this.obs.startTime = awsData.observable.startTime
                this.onRoutineStart()
            } else if (this.obs.startTime !== undefined && awsData.observable.startTime === undefined) {
                this.obs.startTime = undefined
                this.onRoutineStop()
            } else {
                this.obs.startTime = awsData.observable.startTime
            }
        }

        let userIdDirty = false
        if (MainStore.judgeIndex !== undefined) {
            let judgeIndex = 0
            let judgeData = awsData.pool.judgeData
            if (judgeData !== undefined) {
                let newJudgeName = undefined
                for (let judge of judgeData.judgesEx) {
                    if (judgeIndex === MainStore.judgeIndex) {
                        newJudgeName = judge.FullName
                    }

                    ++judgeIndex
                }
                for (let judge of judgeData.judgesAi) {
                    if (judgeIndex === MainStore.judgeIndex) {
                        newJudgeName = judge.FullName
                    }

                    ++judgeIndex
                }
                for (let judge of judgeData.judgesDiff) {
                    if (judgeIndex === MainStore.judgeIndex) {
                        newJudgeName = judge.FullName
                    }

                    ++judgeIndex
                }

                if (newJudgeName !== MainStore.userId) {
                    MainStore.userId = newJudgeName

                    this.sendState(Enums.EStatus.opened)

                    userIdDirty = true
                }
            }
        }

        return {
            poolDirty: poolDirty,
            obsDirty: obsDirty,
            userIdDirty: userIdDirty
        }
    }

    updateResultsFromAws(results, forceFill) {
        if (this.obs.results === undefined || forceFill) {
            let foundResults = false
            for (let result of results) {
                if (result.judgeName === MainStore.userId) {
                    foundResults = true

                    this.createResultsData(result.data)
                }
            }

            if (foundResults) {
                this.fillWithResults()
            } else {
                this.createResultsData()
            }
        }
    }

    queryPoolData(tournamentName, forceAlt) {
        let awsData = undefined
        CommonAction.fetchEx("GET_PLAYING_POOL", {
            tournamentName: tournamentName
        }, {
            isAlt: forceAlt || this.isAlt
        }, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }).then(async(response) => {
            if (response.status < 400) {
                try {
                    return await response.json()
                } catch(error) {
                    throw new Error("")
                }
            } else {
                throw new Error(response.statusText)
            }
        }).then((response) => {
            awsData = response
            let pool = awsData.pool
            return DataAction.getPoolResults(pool.divisionIndex, pool.roundIndex, pool.poolIndex)
        }).then((results) => {
            let userIdDirty = this.updateFromAws(awsData).userIdDirty || false
            this.updateResultsFromAws(results, userIdDirty)
        }).catch((error) => {
            if (error.message.length > 0) {
                console.log("Error: Set Playing Pool", error)
            }
        })
    }

    getRoutineTimeMs() {
        return MainStore.routineTimeMs
    }

    onRoutineStart() {
        if (this.routineUpdateHandle !== undefined) {
            clearInterval(this.routineUpdateHandle)
        }

        this.needShowFinishView = true
        MainStore.isRoutineTimeElapsed = false

        this.sendState(Enums.EStatus.ready)

        this.routineUpdateHandle = setInterval(() => {
            this.onRoutineUpdate()
        }, 200)
    }

    onRoutineUpdate() {
        MainStore.routineTimeMs = this.obs.startTime !== undefined ? Date.now() - this.obs.startTime : undefined

        MainStore.isRoutineTimeElapsed = this.hasRoutineTimeElapsed()
    }

    onRoutineStop() {
        clearInterval(this.routineUpdateHandle)

        this.onRoutineUpdate()

        MainStore.isRoutineTimeElapsed = false
    }

    hasRoutineTimeElapsed() {
        return MainStore.routineTimeMs / 1000 > this.obs.routineLengthSeconds
    }

    isEditing() {
        return this.obs.editTeamIndex !== undefined
    }

    isBackupModeEnabled() {
        return this.obs.backupModeEnabled
    }

    getCurrentTeamString() {
        let teamIndex = this.getActiveTeamIndex()
        if (this.obs.playingPool !== undefined && teamIndex !== undefined) {
            return `${DataAction.getTeamPlayers(this.obs.playingPool.teamList[teamIndex], ", ")}`
        }

        return undefined
    }

    getCurrentTeamScore() {
        return this.obs.currentTeamScore
    }

    fillWithResults() {
        if (this.fillWithResultsFunc !== undefined) {
            this.fillWithResultsFunc()
        } else {
            console.error(`${this.name} view missing fillWithResultsFunc`)
        }
    }

    createResultsData() {
        console.error(`${this.name} view missing override createResultsData`)
    }

    getActiveResultsData() {
        return this.obs.results && this.obs.results.teamScoreList[this.getActiveTeamIndex()]
    }

    getActiveTeamIndex() {
        return this.isEditing() ? this.obs.editTeamIndex : this.obs.playingTeamIndex
    }

    initBackupMode() {
        this.backupResultsList = []
        this.backupIndex = undefined

        this.queryBackupResults()
    }

    queryBackupResults() {
        let startTime = this.backupResultsList.length > 0 ? this.backupResultsList[this.backupResultsList.length - 1].time : 0
        CommonAction.fetchEx("GET_BACKUP_RESULTS", {
            judge: MainStore.userId,
            time: startTime
        }, undefined, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            if (response.status < 400) {
                return response.json()
            } else {
                throw new Error(response.statusText)
            }
        }).then((response) => {
            if (response.resultsList !== undefined) {
                this.backupResultsList = this.backupResultsList.concat(response.resultsList)

                this.backupIndex = this.backupIndex || 0
            }
        }).catch((error) => {
            console.error(error)
        })
    }

    moveToOlderBackup() {
        if (this.backupIndex < this.backupResultsList.length - 1) {
            ++this.backupIndex

            this.obs.results = this.backupResultsList[this.backupIndex].data

            this.fillWithResults()
        }
    }

    moveToNewerBackup() {
        if (this.backupIndex > 0) {
            --this.backupIndex

            this.obs.results = this.backupResultsList[this.backupIndex].data

            this.fillWithResults()
        }
    }

    sendState(status) {
        CommonAction.fetchEx("SET_JUDGE_STATE", {
            tournamentName: MainStore.tournamentName
        }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                judgeId: MainStore.userId,
                status: status,
                isAlt: this.isAlt
            })
        }).catch((error) => {
            console.log("Send state Error:", error)
        })
    }
}
module.exports = InterfaceModelBase
