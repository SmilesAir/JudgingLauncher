const React = require("react")
const MobxReact = require("mobx-react")

const InterfaceViewBase = require("scripts/interfaces/interfaceViewBase.js")
const Interfaces = require("scripts/interfaces/interfaces.js")
const MainStore = require("scripts/stores/mainStore.js")
const CommonAction = require("scripts/actions/commonAction.js")
const Enums = require("scripts/stores/enumStore.js")

require("./scoreboardView.less")

const fpaLogo = require("images/fpa_logo_black.png")
const fgLogo = require("images/fgLogo.png")

module.exports = @MobxReact.observer class extends InterfaceViewBase {
    constructor() {
        super()

        this.interface = Interfaces.scoreboard
        this.obs = this.interface.obs

        this.obs.incremental = false

        setInterval(() => {
            this.forceUpdate()
        }, 1000)
    }

    queryResultsS3() {
        CommonAction.fetchEx("GET_S3_RESULTS", {
            tournamentName: MainStore.tournamentName.replace(" ", "+")
        }, undefined, {
            method: "GET",
            headers: {
                "Pragma": "no-cache",
                "Cache-Control": "no-cache",
                "Content-Type": "application/json"
            }
        }).then((response) => {
            return response.json()
        }).then((response) => {
            this.resultsData = response.data
            this.title = response.title
            this.obs.incremental = response.incremental
            this.startTime = response.startTime
            this.routineLengthSeconds = response.routineLengthSeconds
        }).catch(() => {
            // Nothing
        })
    }

    getIncrementalHeaderRow() {
        return (
            <div key={0} className="rowContainer headerRow rowContainerIncremental">
                <div className="center">{"#"}</div>
                <div>{"Team"}</div>
                <div className="center">{"Phrases"}</div>
                <div className="center">{"Unique"}</div>
                <div className="center">{"Diff"}</div>
                <div className="center">{"Ex"}</div>
            </div>
        )
    }

    getHeaderRow() {
        return (
            <div key={0} className="rowContainer headerRow">
                <div className="center">{"#"}</div>
                <div>{"Team"}</div>
                <div className="center">{"Diff"}</div>
                <div className="center">{"Variety"}</div>
                <div className="center">{"AI"}</div>
                <div className="center">{"Ex"}</div>
                <div className="center">{"Score"}</div>
            </div>
        )
    }

    getIncrementalRow(rank, teamNames, phraseCount, unique, diff, ex) {
        return (
            <div key={teamNames} className="rowContainer rowContainerIncremental">
                <div className="rank">{rank}</div>
                <div className="teamNames">{teamNames}</div>
                <div className="phraseCount">{phraseCount}</div>
                <div className="unique">{unique}</div>
                <div className="diff">{diff}</div>
                <div className="ex">{ex}</div>
            </div>
        )
    }

    getRow(rank, teamNames, diff, variety, ai, ex, totalScore) {
        return (
            <div key={teamNames} className="rowContainer">
                <div className="rank">{rank}</div>
                <div className="teamNames">{teamNames}</div>
                <div className="diff">{diff}</div>
                <div className="variety">{variety}</div>
                <div className="ai">{ai}</div>
                <div className="ex">{ex}</div>
                <div className="score">{totalScore}</div>
            </div>
        )
    }

    getPrettyDecimalValue(value, negative, decimalPlaces) {
        return value !== undefined && value !== 0 ? (negative ? "-" : "") + value.toFixed(decimalPlaces || 1) : ""
    }

    getJudgeScoreSum(teamData, scoreName, judgeType) {
        let sum = 0
        for (let judgeName in teamData) {
            let judgeData = teamData[judgeName]
            if (judgeType === undefined || judgeData.type === judgeType) {
                sum += judgeData[scoreName] || 0
            }
        }

        return sum
    }

    getBoard(data) {
        let rowList = []

        if (data.length > 0) {
            rowList.push(this.obs.incremental ? this.getIncrementalHeaderRow() : this.getHeaderRow())
        }

        let playNumber = 1
        for (let rowData of data) {
            let teamData = rowData.data
            let diff = this.getJudgeScoreSum(teamData, "score", Enums.EInterface.diff)
            let ex = this.getJudgeScoreSum(teamData, "adjustedEx")

            if (this.obs.incremental) {
                let phrases = this.getJudgeScoreSum(teamData, "phrases")
                let unique = this.getJudgeScoreSum(teamData, "quantity")

                rowList.push(this.getIncrementalRow(playNumber, rowData.teamNames, phrases, unique, this.getPrettyDecimalValue(diff), this.getPrettyDecimalValue(ex, true)))
            } else {
                let variety = this.getJudgeScoreSum(teamData, "score", Enums.EInterface.variety)
                let ai = this.getJudgeScoreSum(teamData, "aI")

                rowList.push(this.getRow(rowData.rank, rowData.teamNames, this.getPrettyDecimalValue(diff),
                    this.getPrettyDecimalValue(variety), this.getPrettyDecimalValue(ai),
                    this.getPrettyDecimalValue(ex, true), this.getPrettyDecimalValue(rowData.totalScore, false, 2)))
            }

            ++playNumber
        }

        return rowList
    }

    getTimeString() {
        let str = new Date().toTimeString().slice(0, 8)
        return str.startsWith("0") ? str.slice(1) : str
    }

    getSecondsSinceRoutineStart() {
        if (this.obs.startTime !== undefined) {
            return (Date.now() - this.obs.startTime) / 1000
        }

        return undefined
    }

    getTitleString() {
        let secondsSinceStart = this.getSecondsSinceRoutineStart()
        let routineTimeStr = ""
        if (secondsSinceStart < this.obs.routineLengthSeconds) {
            let secondsRemaining = Math.round(this.obs.routineLengthSeconds - secondsSinceStart)
            routineTimeStr = ` [${Math.floor(secondsRemaining / 60)}:${`${secondsRemaining % 60}`.padStart(2, "0")}]`
        }

        return (this.obs.incremental ? "[Partial] " : "") + this.obs.title + routineTimeStr
    }

    render() {
        if (this.obs.resultsData === undefined) {
            return <div>No Scoreboard Data</div>
        }

        return (
            <div className="scoreboardTopContainer">
                <div className="header">
                    <img className="fpaLogo" src={fpaLogo}/>
                    <div className="title">
                        {this.getTitleString()}
                    </div>
                    <img className="fgLogo" src={fgLogo}/>
                    <div className="time">
                        {this.getTimeString()}
                    </div>
                </div>
                {this.getBoard(this.obs.resultsData)}
            </div>
        )
    }
}
