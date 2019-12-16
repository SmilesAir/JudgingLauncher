
const Mobx = require("mobx")

const Enums = require("scripts/stores/enumStore.js")
const InterfaceModelBase = require("scripts/interfaces/interfaceModelBase.js")
const MainStore = require("scripts/stores/mainStore.js")
const DataStore = require("scripts/stores/dataStore.js")

module.exports = class extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Rank Judge"
        this.type = Enums.EInterface.rank

        this.playPoolHash = undefined
        this.observableHash = undefined

        this.obs.dragTeamIndex = undefined
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

    updateFromAws(awsData) {
        let dirty = super.updateFromAws(awsData)
        
        if (dirty.poolDirty) {
            this.obs.results = this.obs.results || new ResultsDataRank(this.obs.playingPool)
        }
    }

    startScoreDrag(teamIndex) {
        this.obs.dragTeamIndex = teamIndex
    }

    endScoreDrag() {
        this.obs.dragTeamIndex = undefined

        this.updateTeamListOrder()

        this.reportScores()
    }

    onScoreDrag(event) {
        if (this.obs.dragTeamIndex !== undefined) {
            this.obs.results.rawPointsList[this.obs.dragTeamIndex] += event.movementX / event.currentTarget.clientWidth * 100
        }
    }

    updateTeamListOrder() {
        let newTeamList = []
        let newPointsList = []
        let teamList = this.obs.playingPool.teamList
        let pointsList = this.obs.results.rawPointsList
        let playingTeam = teamList[this.getActiveTeamIndex()]
        for (let teamIndex = 0; teamIndex < teamList.length; ++teamIndex) {
            let team = teamList[teamIndex]
            let points = pointsList[teamIndex]
            if (teamIndex === this.getActiveTeamIndex() || team.played === true) {
                let inserted = false
                for (let sortedIndex = 0; sortedIndex < newPointsList.length; ++sortedIndex) {
                    let sortedPoints = newPointsList[sortedIndex]
                    if (points > sortedPoints) {
                        newTeamList.splice(sortedIndex, 0, team)
                        newPointsList.splice(sortedIndex, 0, points)

                        inserted = true
                        break
                    }
                }

                if (!inserted) {
                    newTeamList.push(team)
                    newPointsList.push(points)
                }
            } else {
                newTeamList.push(team)
                newPointsList.push(points)
            }
        }

        teamList.length = 0
        for (let newTeam of newTeamList) {
            teamList.push(newTeam)
        }
        pointsList.length = 0
        for (let points of newPointsList) {
            pointsList.push(points)
        }

        this.obs.playingTeamIndex = teamList.indexOf(playingTeam)
    }
}

class ResultsDataRank extends DataStore.ResultsDataBase {
    constructor(poolData) {
        super(Enums.EInterface.rank, poolData.divisionIndex, poolData.roundIndex, poolData.poolIndex, poolData.teamList)

        this.rawPointsList = Mobx.observable([])
        for (let i = 0; i < this.teamList.length; ++i) {
            this.rawPointsList.push(0)
        }
    }
}
