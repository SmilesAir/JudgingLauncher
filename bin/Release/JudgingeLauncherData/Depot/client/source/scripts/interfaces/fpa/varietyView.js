const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("scripts/stores/mainStore.js")
const InterfaceViewBase = require("scripts/interfaces/interfaceViewBase.js")
const Interfaces = require("scripts/interfaces/interfaces.js")
const NumberLinePickerView = require("scripts/views/numberLinePickerView.js")
const CommonAction = require("scripts/actions/commonAction.js")

require("./varietyView.less")

module.exports = @MobxReact.observer class extends InterfaceViewBase {
    constructor() {
        super()

        this.name = "Variety Judge"
        this.interface = Interfaces.variety
        this.state = {
            moveCount: 0
        }
    }

    fillWithResults() {
        let teamResults = this.interface.getActiveResultsData()
        
        if (teamResults !== undefined) {
            this.state.moveCount = teamResults.quantityScore || 0
            this.state.qualityScore = teamResults.qualityScore || 0
            this.setState(this.state)
        }
    }

    onInputEnd(number) {
        if (!MainStore.isFinishViewShowing) {
            CommonAction.vibrateSingleMedium()

            this.interface.setQualityScore(number)

            this.state.qualityScore = number
            this.setState(this.state)
        }
    }

    onKeyDown(event) {
        this.incrementEvent(event)
    }

    onIncrementButtonKeyDown(event) {
        event.stopPropagation()
        event.preventDefault()

        this.incrementEvent(event)
    }

    onDecrementButtonKeyDown(event) {
        event.stopPropagation()
        event.preventDefault()
    }

    incrementEvent(event) {
        if (event.key === " ") {
            this.incrementMoveCount()
        }
    }

    incrementMoveCount() {
        CommonAction.vibrateSingleShort()

        ++this.state.moveCount
        this.setState(this.state)


        this.interface.setQuantityScore(this.state.moveCount)
    }

    decrementMoveCount() {
        CommonAction.vibrateDoubleShort()

        this.state.moveCount = Math.max(0, this.state.moveCount - 1)
        this.setState(this.state)

        this.interface.setQuantityScore(this.state.moveCount)
    }

    render() {
        if (this.interface.obs.playingPool === undefined) {
            return <div className="varietyContainer">Waiting for Head Judge</div>
        }

        return (
            <div className="varietyContainer" tabIndex="0" onKeyDown={(event) => this.onKeyDown(event)}>
                {this.getJudgeHeaderElement()}
                <div className="scoresContainer">
                    <div>Unique Move Count: {this.state.moveCount}</div>
                    <div>Quality Score: {this.state.qualityScore}</div>
                </div>
                <div className="quantityContainer">
                    <button className="quantityButton" onClick={() => this.decrementMoveCount()} onKeyDown={(event) => this.onDecrementButtonKeyDown(event)}>Decrement</button>
                    <button className="quantityButton" onClick={() => this.incrementMoveCount()} onKeyDown={(event) => this.onIncrementButtonKeyDown(event)}>Increment</button>
                </div>
                <NumberLinePickerView onInputEnd={(event) => this.onInputEnd(event)}/>
            </div>
        )
    }
}
