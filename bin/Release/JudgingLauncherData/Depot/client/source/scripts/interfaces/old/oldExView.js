const React = require("react")
const MobxReact = require("mobx-react")

const InterfaceViewBase = require("scripts/interfaces/interfaceViewBase.js")
const Interfaces = require("scripts/interfaces/interfaces.js")

require("./oldExView.less")

module.exports = @MobxReact.observer class extends InterfaceViewBase {
    constructor() {
        super()

        this.name = "Old Ex Judge"
        this.interface = Interfaces.oldEx
        this.state = {
            "1": 0,
            "2": 0,
            "3": 0,
            "5": 0
        }
        this.onMouseMoveCallbackList = []
        this.onMouseUpCallbackList = []
    }

    fillWithResults() {
        let teamResults = this.interface.getActiveResultsData()
        
        if (teamResults !== undefined) {

            this.state["1"] = teamResults.getPointCount(1)
            this.state["2"] = teamResults.getPointCount(2)
            this.state["3"] = teamResults.getPointCount(3)
            this.state["5"] = teamResults.getPointCount(5)

            this.setState(this.state)
        }
    }

    onInputEnd(number) {
        this.interface.setQualityScore(number)

        this.state.qualityScore = number
        this.setState(this.state)
    }

    onMinorClick(counterKey) {
        this.state.aiCounters[counterKey].minorCount = this.interface.incrementMinor(counterKey)

        this.setState(this.state)
    }

    onMajorClick(counterKey) {
        this.state.aiCounters[counterKey].majorCount = this.interface.incrementMajor(counterKey)

        this.setState(this.state)
    }

    onAddClick(point) {
        let newCount = this.interface.incrementDeduction(point)
        this.state[point] = newCount
        this.setState(this.state)
    }

    onRemoveClick(point) {
        let newCount = this.interface.decrementDeduction(point)
        this.state[point] = newCount
        this.setState(this.state)
    }

    onMouseMove(event) {
        this.onMouseMoveCallbackList.forEach((callback) => {
            callback(event)
        })
    }

    onMouseUp(event) {
        this.onMouseUpCallbackList.forEach((callback) => {
            callback(event)
        })
    }

    getExElements() {
        let pointDeductions = [ 1, 2, 3, 5 ]
        let exElements = pointDeductions.map((point) => {
            let pointName = `.${point}`
            return (
                <div key={point} className="exElementContainer">
                    <button className="removeButton" onClick={() => this.onRemoveClick(point)}>Decrement</button>
                    <button className="addButton" onClick={() => this.onAddClick(point)}>{pointName} Deduction</button>
                    <div className="countText">{this.state[point]}</div>
                </div>
            )
        })

        return (
            <div className="exContainer">
                {exElements}
            </div>
        )
    }

    render() {
        if (this.interface.obs.playingPool === undefined || this.interface.obs.results === undefined) {
            return <div className="exAiContainer">Waiting for Head Judge</div>
        }

        return (
            <div className="exAiContainer"
                onMouseMove={(event) => this.onMouseMove(event)}
                onMouseUp={() => this.onMouseUp()}
                onMouseLeave={() => this.onMouseUp()}>

                {this.getJudgeHeaderElement()}
                {this.getExElements()}
            </div>
        )
    }
}
