
const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("scripts/stores/mainStore.js")
const DataAction = require("scripts/actions/dataAction.js")
const DataStore = require("scripts/stores/dataStore.js")
const NumberLinePickerView = require("scripts/views/numberLinePickerView.js")
const CommonAction = require("scripts/actions/commonAction.js")
const Interfaces = require("scripts/interfaces/interfaces.js")
const Enums = require("scripts/stores/enumStore.js")

require("./finishView.less")

@MobxReact.observer class FinishView extends React.Component {
    constructor() {
        super()

        this.state = {
            editTeamIndex: undefined
        }
    }

    getHeader() {
        return (
            <div className="header">
                <div>
                    {MainStore.tournamentName}
                </div>
                <div>
                    {MainStore.userId}
                </div>
            </div>
        )
    }

    getTeamText(playersList, teamIndex) {
        let scoreString = ""
        let results = MainStore.interfaceObs.results
        if (results !== undefined) {
            scoreString = DataStore.dataModel.getGeneralImpressionSummary(results, teamIndex)
        }

        return DataAction.getTeamPlayersShort(playersList) + scoreString
    }

    onTeamSelected(teamIndex) {
        if (MainStore.interfaceObs.playingTeamIndex === teamIndex) {
            this.state.editTeamIndex = undefined
        } else {
            this.state.editTeamIndex = teamIndex
        }

        this.setState(this.state)
    }

    getInputIndex() {
        return this.state.editTeamIndex || MainStore.interfaceObs.playingTeamIndex
    }

    getInfo() {
        let teamViews = []
        if (MainStore.interfaceObs !== undefined && MainStore.interfaceObs.playingPool !== undefined) {
            let key = 0
            teamViews = MainStore.interfaceObs.playingPool.teamList.map((playersList) => {
                let isInput = this.getInputIndex() === key
                let teamIndex = key
                return (
                    <div
                        key={key++}
                        className={`teamContainer ${isInput ? "playing" : ""}`}
                        onClick={() => this.onTeamSelected(teamIndex)}>
                        {this.getTeamText(playersList, teamIndex)}
                    </div>
                )
            })
        }

        return (
            <div className="info">
                {teamViews}
            </div>
        )
    }

    getInputComponent() {
        return (
            <div className="finishInputContainer" onClick={(event) => this.onPointerDown(event)}>
                Click To Finish
            </div>
        )
    }

    onPointerDown(event) {
        event.preventDefault()

        if (Interfaces.activeInterface.showFinishOverlay) {
            this.state.enabled = !this.state.enabled
            MainStore.isFinishViewShowing = this.state.enabled
            this.setState(this.state)
        } else {
            this.onFinish()
        }
    }

    onInputEnd(number) {
        CommonAction.vibrateSingleMedium()

        DataStore.dataModel.setGeneral(this.getInputIndex(), number)

        Interfaces.activeInterface.reportScores()

        this.forceUpdate()
    }

    onFinish() {
        Interfaces.activeInterface.needShowFinishView = false

        Interfaces.activeInterface.sendState(Enums.EStatus.finished)

        MainStore.isFinishViewShowing = false

        this.forceUpdate()
    }

    render() {
        if (MainStore.isFinishViewShowing) {
            return (
                <div className="finishContainer">
                    {this.getHeader()}
                    {this.getInfo()}
                    <div className="instruction">Enter General Impression Score</div>
                    <NumberLinePickerView className="input" onInputEnd={(event) => this.onInputEnd(event)}/>
                    <button className="finish" onClick={() => this.onFinish()}>Finished</button>
                </div>
            )
        } else if (MainStore.isRoutineTimeElapsed && Interfaces.activeInterface.needShowFinishView) {
            return this.getInputComponent()
        } else {
            return null
        }
    }
}
module.exports = FinishView
