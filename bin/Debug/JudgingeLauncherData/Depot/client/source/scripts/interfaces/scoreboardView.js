const React = require("react")
const MobxReact = require("mobx-react")

const InterfaceViewBase = require("scripts/interfaces/interfaceViewBase.js")
const Interfaces = require("scripts/interfaces/interfaces.js")
const MainStore = require("scripts/stores/mainStore.js")
const CommonAction = require("scripts/actions/commonAction.js")

require("./scoreboardView.less")

const fpaLogo = require("images/fpa_logo_black.png")
const fgLogo = require("images/fgLogo.png")

module.exports = @MobxReact.observer class extends InterfaceViewBase {
    constructor() {
        super()

        this.interface = Interfaces.scoreboard
        this.obs = this.interface.obs

        this.alwaysUpdate = MainStore.url.searchParams.get("alwaysUpdate") === "true"

        this.queryResults()

        setInterval(() => {
            this.update()
        }, 100)
    }

    update() {
        if (this.nextQueryHandle === undefined) {
            let timeoutMs = undefined
            let secondsSinceStart = this.getSecondsSinceRoutineStart()
            if (this.alwaysUpdate || secondsSinceStart < this.routineLengthSeconds + 600) {
                timeoutMs = 1000
            } else {
                timeoutMs = 1000 * 60 * 5
            }

            this.nextQueryHandle = setTimeout(() => {
                this.queryResults()

                this.nextQueryHandle = undefined
            }, timeoutMs)
        }

        this.forceUpdate()
    }

    queryResults() {
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
            this.incremental = response.incremental
            this.startTime = response.startTime
            this.routineLengthSeconds = response.routineLengthSeconds
        }).catch(() => {
            // Nothing
        })
    }

    getIncrementalHeaderRow() {
        return (
            <div key={0} className="rowContainer headerRow rowContainerIncremental">
                <div>{"#"}</div>
                <div>{"Team"}</div>
                <div>{"Phrases"}</div>
                <div>{"Unique"}</div>
                <div>{"Diff"}</div>
                <div>{"Ex"}</div>
                <div>{"Score"}</div>
            </div>
        )
    }

    getHeaderRow() {
        return (
            <div key={0} className="rowContainer headerRow">
                <div>{"#"}</div>
                <div>{"Team"}</div>
                <div>{"Phrases"}</div>
                <div>{"Unique"}</div>
                <div>{"Diff"}</div>
                <div>{"Variety"}</div>
                <div>{"AI"}</div>
                <div>{"Ex"}</div>
                <div>{"Score"}</div>
            </div>
        )
    }

    getIncrementalRow(rank, teamNames, phraseCount, unique, diff, ex, totalScore) {
        return (
            <div key={teamNames} className="rowContainer rowContainerIncremental">
                <div className="rank">{rank}</div>
                <div className="teamNames">{teamNames}</div>
                <div className="phraseCount">{phraseCount}</div>
                <div className="unique">{unique}</div>
                <div className="diff">{diff}</div>
                <div className="ex">{ex}</div>
                <div className="score">{totalScore}</div>
            </div>
        )
    }

    getRow(rank, teamNames, phraseCount, unique, diff, variety, ai, ex, totalScore) {
        return (
            <div key={teamNames} className="rowContainer">
                <div className="rank">{rank}</div>
                <div className="teamNames">{teamNames}</div>
                <div className="phraseCount">{phraseCount}</div>
                <div className="unique">{unique}</div>
                <div className="diff">{diff}</div>
                <div className="variety">{variety}</div>
                <div className="ai">{ai}</div>
                <div className="ex">{ex}</div>
                <div className="score">{totalScore}</div>
            </div>
        )
    }

    getOldIncrementalHeaderRow() {
        return (
            <div key={0} className="rowOldContainer headerRow rowContainerOldIncremental">
                <div>{"#"}</div>
                <div>{"Team"}</div>
                <div>{"Ex"}</div>
            </div>
        )
    }

    getOldHeaderRow() {
        return (
            <div key={0} className="rowOldContainer headerRow">
                <div>{"#"}</div>
                <div>{"Team"}</div>
                <div>{"Diff"}</div>
                <div>{"AI"}</div>
                <div>{"Ex"}</div>
                <div>{"Score"}</div>
            </div>
        )
    }

    getOldIncrementalRow(rank, teamNames, ex) {
        return (
            <div key={teamNames} className="rowOldContainer rowContainerOldIncremental">
                <div className="rank">{rank}</div>
                <div className="teamNames">{teamNames}</div>
                <div className="ex">{ex}</div>
            </div>
        )
    }

    getOldRow(rank, teamNames, diff, ai, ex, totalScore) {
        return (
            <div key={teamNames} className="rowOldContainer">
                <div className="rank">{rank}</div>
                <div className="teamNames">{teamNames}</div>
                <div className="diff">{diff}</div>
                <div className="ai">{ai}</div>
                <div className="ex">{ex}</div>
                <div className="score">{totalScore}</div>
            </div>
        )
    }

    getPrettyDecimalValue(value, negative) {
        return value !== undefined && value !== 0 ? (negative ? "-" : "") + value.toFixed(2) : ""
    }

    getBoard(data) {
        let rowList = []

        if (data.length > 0 && data[0].data.unique !== undefined) {
            rowList.push(this.incremental ? this.getIncrementalHeaderRow() : this.getHeaderRow())
        } else {
            rowList.push(this.incremental ? this.getOldIncrementalHeaderRow() : this.getOldHeaderRow())
        }

        for (let rowData of data) {
            let teamData = rowData.data
            if (teamData.unique !== undefined) {
                rowList.push(this.incremental ?
                    this.getIncrementalRow(rowData.data.rank, rowData.teamNames, teamData.phrases, teamData.unique, this.getPrettyDecimalValue(teamData.diff), this.getPrettyDecimalValue(teamData.ex, true), this.getPrettyDecimalValue(teamData.totalScore)) :
                    this.getRow(rowData.data.rank, rowData.teamNames, teamData.phrases, teamData.unique, this.getPrettyDecimalValue(teamData.diff), this.getPrettyDecimalValue(teamData.variety), this.getPrettyDecimalValue(teamData.ai), this.getPrettyDecimalValue(teamData.ex, true), this.getPrettyDecimalValue(teamData.totalScore)))
            } else {
                rowList.push(this.incremental ?
                    this.getOldIncrementalRow(rowData.data.rank, rowData.teamNames, this.getPrettyDecimalValue(teamData.ex)) :
                    this.getOldRow(rowData.data.rank, rowData.teamNames, this.getPrettyDecimalValue(teamData.diff), this.getPrettyDecimalValue(teamData.ai), this.getPrettyDecimalValue(teamData.ex), this.getPrettyDecimalValue(teamData.totalScore)))
            }
        }

        return rowList
    }

    getTimeString() {
        let str = new Date().toTimeString().slice(0, 8)
        return str.startsWith("0") ? str.slice(1) : str
    }

    getSecondsSinceRoutineStart() {
        if (this.startTime !== undefined) {
            return (Date.now() - this.startTime) / 1000
        }

        return undefined
    }

    getTitleString() {
        let secondsSinceStart = this.getSecondsSinceRoutineStart()
        let routineTimeStr = ""
        if (secondsSinceStart < this.routineLengthSeconds) {
            let secondsRemaining = Math.round(this.routineLengthSeconds - secondsSinceStart)
            routineTimeStr = ` [${Math.floor(secondsRemaining / 60)}:${`${secondsRemaining % 60}`.padStart(2, "0")}]`
        }

        return (this.incremental ? "[Ex Only] " : "") + this.title + routineTimeStr
    }

    render() {
        if (this.resultsData === undefined) {
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
                {this.getBoard(this.resultsData)}
            </div>
        )
    }
}
