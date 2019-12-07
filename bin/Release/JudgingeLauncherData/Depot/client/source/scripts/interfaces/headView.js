const React = require("react")
const MobxReact = require("mobx-react")

const InterfaceViewBase = require("scripts/interfaces/interfaceViewBase.js")
const Interfaces = require("scripts/interfaces/interfaces.js")
const DataAction = require("scripts/actions/dataAction.js")
const Enums = require("scripts/stores/enumStore.js")

require("./headView.less")

module.exports = @MobxReact.observer class extends InterfaceViewBase {
    constructor() {
        super()

        this.interface = Interfaces.head
        this.obs = this.interface.obs
    }

    getTimeElement() {
        let judgingTimeDate = new Date(this.obs.judgingTimeMs)
        let judgingTime = `${judgingTimeDate.getMinutes()}:${("0" + judgingTimeDate.getSeconds()).slice(-2)}`
        let remainingTime = DataAction.getTimeString(Math.max(0, this.obs.routineLengthSeconds * 1000 - this.obs.judgingTimeMs))

        return (
            <div>
                Time judging: {judgingTime}
                {"   /   "}
                Remaining Time: {remainingTime}
            </div>
        )
    }

    getPlayingTeamElement() {
        let teamName = "No Playing Team Set"
        let teamIndex = this.obs.playingTeamIndex
        let teamList = this.interface.calcTeamList()

        if (teamIndex !== undefined && teamIndex < teamList.length) {
            teamName = teamList[teamIndex].getPlayerNamesString()
        }

        return <div>Playing Team: {teamName}</div>
    }

    onTeamClick(teamData) {
        Interfaces.head.setPlayingTeam(teamData)
    }

    getTeamsElement() {
        let teamIndex = -1
        let teamList = this.interface.calcTeamList()
        let teamListElements = teamList.map((teamData) => {
            ++teamIndex
            let playingIndex = this.interface.getAdjustPlayingIndex()
            let className = `teamContainer ${playingIndex === teamIndex ? "playing" : ""}`
            return <div key={teamIndex} className={className}
                onClick={() => this.onTeamClick(teamData)}>{teamData.getPlayerNamesString()}</div>
        })

        return (
            <div className="teamListContainer">
                Teams:
                {teamListElements}
            </div>
        )
    }

    onStartButtonClick() {
        Interfaces.head.onStartClick()
    }

    onStopButtonClick() {
        Interfaces.head.onStopClick()
    }

    getStartButtonText() {
        if (this.obs.playingTeamIndex === undefined) {
            return "Set Playing Team"
        } else if (this.obs.isJudging) {
            if (Interfaces.head.hasRoutineTimeElapsed()) {
                return "Judging Finished. Select Next Team."
            } else {
                return "Judging Active"
            }
        } else {
            return "Click on First Throw"
        }
    }

    onPassiveButtonClick() {
        this.interface.setPassiveMode(!this.obs.passiveMode)
    }

    getJudgeStatusString(status) {
        switch (status) {
        case Enums.EStatus.none:
            return "Unknown"
        case Enums.EStatus.ready:
            return "Ready"
        case Enums.EStatus.finished:
            return "Finished"
        case Enums.EStatus.opened:
            return "Opened"
        }

        return "Unknown"
    }

    getJudgeStatus(judge) {
        let judgeState = this.obs.poolState[0] && this.obs.poolState[0][judge.FullName] ||
        this.obs.poolState[1] && this.obs.poolState[1][judge.FullName]

        return this.getJudgeStatusString(judgeState && judgeState.status || Enums.EStatus.none)
    }

    getJudgeStatusElement(categoryName, judge) {
        let statusString = this.getJudgeStatus(judge)
        return (
            <div key={judge.FullName}>
                {categoryName}: {judge.FullName} {statusString}
            </div>
        )
    }

    parseJudgeElements(judgeData) {
        let exElements = judgeData.judgesEx.map((judge) => {
            return this.getJudgeStatusElement("Ex/Ai", judge)
        })
        let aiElements = judgeData.judgesAi.map((judge) => {
            return this.getJudgeStatusElement("Variety", judge)
        })
        let diffElements = judgeData.judgesDiff.map((judge) => {
            return this.getJudgeStatusElement("Diff", judge)
        })

        return {
            ex: exElements,
            ai: aiElements,
            diff: diffElements
        }
    }

    getJudgesElement() {
        let judgeData = this.interface.getPool(false).judgeData
        if (judgeData !== undefined) {
            let parsedData = this.parseJudgeElements(judgeData)

            let poolAlt = this.interface.getPool(true)
            let judgeDataAlt = poolAlt && poolAlt.judgeData
            let parsedDataAlt = judgeDataAlt && this.parseJudgeElements(judgeDataAlt)

            return (
                <div>
                    Judges:
                    {parsedData.ex}
                    {parsedData.ai}
                    {parsedData.diff}
                    {parsedDataAlt !== undefined ? "Alt Pool Judges:" : ""}
                    {parsedDataAlt !== undefined ? parsedDataAlt.ex : null}
                    {parsedDataAlt !== undefined ? parsedDataAlt.ai : null}
                    {parsedDataAlt !== undefined ? parsedDataAlt.diff : null}
                </div>
            )
        }

        return null
    }

    render() {
        if (this.interface.getPool(false) === undefined) {
            return <div className="headTopContainer">Set playing pool for Head Judge to function</div>
        }

        let altPool = this.interface.getPool(true)
        let altPoolName = altPool !== undefined ? ` / ${DataAction.getFullPoolDescription(altPool)}` : ""

        return (
            <div className="headTopContainer">
                <div className="header">
                    <div>
                        Head Judge
                    </div>
                    <button className="passiveButton" onClick={() => this.onPassiveButtonClick()}>{this.obs.passiveMode ? "Disable Passive Mode" : "Enable Passive Mode"}</button>
                    <button className="uploadScoreboardButton" onClick={() => this.interface.uploadIncrementalScoreboardData()}>Update Incremental Scoreboard</button>
                    <button className="uploadScoreboardButton" onClick={() => this.interface.toggleAutoUpdateScoreboard()}>
                        {this.obs.autoUpdateScoreboard ? `Disable Auto Update (${Math.round(this.obs.autoUpdateTimeRemaining / 1000)})` : "Enable Auto Update"}
                    </button>
                    <button className="uploadScoreboardButton" onClick={() => this.interface.finalizeScoreboardData()}>Finalize Scoreboard</button>
                </div>
                <div className="poolDetailsContainer">{DataAction.getFullPoolDescription(this.interface.getPool(false))}{altPoolName}</div>
                {this.getTimeElement()}
                {this.getPlayingTeamElement()}
                <button disabled={Interfaces.head.isDuringRoutineTime() || this.obs.playingTeamIndex === undefined} className="startButton" onClick={() => this.onStartButtonClick()}>
                    {this.getStartButtonText()}
                </button>
                <button disabled={!this.obs.isJudging} className="startButton" onClick={() => this.onStopButtonClick()}>
                    Stop
                </button>
                <div className="poolInfoContainer">
                    {this.getTeamsElement()}
                    {this.getJudgesElement()}
                </div>
            </div>
        )
    }
}
