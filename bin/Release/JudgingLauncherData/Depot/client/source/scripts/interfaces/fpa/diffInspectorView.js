const React = require("react")
const MobxReact = require("mobx-react")

const Enums = require("scripts/stores/enumStore.js")
const InterfaceViewBase = require("scripts/interfaces/interfaceViewBase.js")
const Interfaces = require("scripts/interfaces/interfaces.js")
const DataAction = require("scripts/actions/dataAction.js")
const MainStore = require("scripts/stores/mainStore.js")
const DiffData = require("scripts/interfaces/fpa/data/diffData.js")

require("./diffInspectorView.less")

module.exports = @MobxReact.observer class extends InterfaceViewBase {
    constructor(props) {
        super(props)

        this.constants = MainStore.constants.diff

        this.state = {
            moveCount: 0,
            topCount: this.constants.topPerSecond * 180,
            topCountValid: true,
            offset: this.constants.offset,
            offsetValid: true,
            power: this.constants.power,
            powerValid: true,
            scale: this.constants.scale,
            scaleValid: true
        }
    }

    getScoresElement() {
        let teamElements = []
        let pool = Interfaces.diffInspector.obs.playingPool
        if (pool !== undefined) {
            for (let i = 0; i < pool.teamList.length; ++i) {
                teamElements.push(<TeamScoresView key={i} teamIndex={i} />)
            }
        }

        return (
            <div className="scores">
                {teamElements}
            </div>
        )
    }

    topCountChanged(event) {
        let newNumber = parseInt(event.target.value, 10)
        this.state.topCount = event.target.value
        this.state.topCountValid = !isNaN(newNumber)
        this.setState(this.state)

        this.constants.topPerSecond = !this.state.topCountValid ? this.constants.topPerSecond : newNumber
    }

    offsetChanged(event) {
        let newNumber = parseFloat(event.target.value, 10)
        this.state.offset = event.target.value
        this.state.offsetValid = !isNaN(newNumber)
        this.setState(this.state)

        this.constants.offset = !this.state.offsetValid ? this.constants.offset : newNumber
    }

    powerChanged(event) {
        let newNumber = parseFloat(event.target.value, 10)
        this.state.power = event.target.value
        this.state.powerValid = !isNaN(newNumber)
        this.setState(this.state)

        this.constants.power = !this.state.powerValid ? this.constants.power : newNumber
    }

    scaleChanged(event) {
        let newNumber = parseFloat(event.target.value, 10)
        this.state.scale = event.target.value
        this.state.scaleValid = !isNaN(newNumber)
        this.setState(this.state)

        this.constants.scale = !this.state.scaleValid ? this.constants.scale : newNumber
    }

    resetEquation() {
        Object.assign(MainStore.constants.diff, DiffData.getDefaultConstants())

        this.state.topCount = this.constants.topPerSecond * 180
        this.state.offset = this.constants.offset
        this.state.power = this.constants.power
        this.state.scale = this.constants.scale
        this.setState(this.state)
    }

    getControlsElement() {
        return (
            <div className="controls">
                <div>
                    Top # of scores:
                    <input className={`numberInput ${this.state.topCountValid ? "" : "invalid"}`}
                        type="text" value={this.state.topCount} onChange={(event) => this.topCountChanged(event)} />
                </div>
                <div>
                    Non-linear equation
                </div>
                <div>
                    {"Output = ((score + "}
                    <input className={`numberInput ${this.state.offsetValid ? "" : "invalid"}`}
                        type="text" value={this.state.offset} onChange={(event) => this.offsetChanged(event)} />
                    {") ^ "}
                    <input className={`numberInput ${this.state.powerValid ? "" : "invalid"}`}
                        type="text" value={this.state.power} onChange={(event) => this.powerChanged(event)} />
                    {") * "}
                    <input className={`numberInput ${this.state.scaleValid ? "" : "invalid"}`}
                        style={{ width: "12em" }} type="text" value={this.state.scale} onChange={(event) => this.scaleChanged(event)} />
                    <button style={{ "marginLeft": "1em" }} onClick={() => this.resetEquation()}>Reset</button>
                </div>
            </div>
        )
    }

    render() {
        return (
            <div className="diffInspectorContainer">
                {this.getScoresElement()}
                {this.getControlsElement()}
            </div>
        )
    }
}

@MobxReact.observer class TeamScoresView extends React.Component {
    constructor(props) {
        super(props)

        this.teamIndex = props.teamIndex
        this.team = Interfaces.diffInspector.obs.playingPool.teamList[this.teamIndex]
        this.playersNames = DataAction.getTeamPlayers(this.team)
    }

    getResults() {
        if (Interfaces.diffInspector.obs.results !== undefined) {
            return Interfaces.diffInspector.obs.results.map((judgeResult) => {
                return judgeResult.data.type === Enums.EInterface.diff ? DataAction.getResultsInspected(judgeResult, this.teamIndex) : undefined
            })
        }

        return undefined
    }

    render() {
        return (
            <div className="teamContainer">
                <div className="teamNames">
                    {this.playersNames}
                </div>
                {this.getResults()}
            </div>
        )
    }
}
