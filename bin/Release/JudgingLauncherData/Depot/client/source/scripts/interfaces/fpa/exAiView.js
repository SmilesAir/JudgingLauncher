const React = require("react")
const MobxReact = require("mobx-react")

const InterfaceViewBase = require("scripts/interfaces/interfaceViewBase.js")
const Interfaces = require("scripts/interfaces/interfaces.js")

require("./exAiView.less")

module.exports = @MobxReact.observer class extends InterfaceViewBase {
    constructor() {
        super()

        this.name = "Ex/Ai Judge"
        this.interface = Interfaces.exAi
        this.state = {
            aiCounters: {
                music: {
                    name: "Music",
                    minorCount: 0,
                    majorCount: 0,
                    score: 0
                },
                teamwork: {
                    name: "Teamwork",
                    minorCount: 0,
                    majorCount: 0,
                    score: 0
                },
                form: {
                    name: "Form",
                    minorCount: 0,
                    majorCount: 0,
                    score: 0
                }
            },
            pointDeductions: {
                "1": 0,
                "2": 0,
                "3": 0,
                "5": 0
            }
        }
        this.onMouseMoveCallbackList = []
        this.onMouseUpCallbackList = []
    }

    fillWithResults() {
        let teamResults = this.interface.getActiveResultsData()

        if (teamResults !== undefined) {
            this.state.aiCounters.music.score = teamResults.getAiData("music").score
            this.state.aiCounters.teamwork.score = teamResults.getAiData("teamwork").score
            this.state.aiCounters.form.score = teamResults.getAiData("form").score

            this.state.pointDeductions["1"] = teamResults.getPointCount(1)
            this.state.pointDeductions["2"] = teamResults.getPointCount(2)
            this.state.pointDeductions["3"] = teamResults.getPointCount(3)
            this.state.pointDeductions["5"] = teamResults.getPointCount(5)

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
        this.state.pointDeductions[point] = newCount
        this.setState(this.state)
    }

    onRemoveClick(point) {
        let newCount = this.interface.decrementDeduction(point)
        this.state.pointDeductions[point] = newCount
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

    onAiSliderChanged(value, key) {
        this.state.aiCounters[key].score = value
        this.setState(this.state)

        this.interface.setAiScore(value, key)
    }

    getAiCounterElements() {
        let counterElements = []
        for (let counterKey in this.state.aiCounters) {
            let counter = this.state.aiCounters[counterKey]
            counterElements.push(
                <div key={counter.name} className="aiCounterContainer">
                    <SuggestionSlider
                        name={counter.name}
                        value={counter.score}
                        onChanged={(value) => this.onAiSliderChanged(value, counterKey)}
                        onMouseMoveCallbackList={this.onMouseMoveCallbackList}
                        onMouseUpCallbackList={this.onMouseUpCallbackList}
                    />
                </div>
            )
        }

        return counterElements
    }

    getAiElements() {
        return (
            <div className="aiContainer">
                {this.getAiCounterElements()}
            </div>
        )
    }

    getExElements() {
        let pointDeductions = [ 1, 2, 3, 5 ]
        let exElements = pointDeductions.map((point) => {
            let pointName = `.${point}`
            return (
                <div key={point} className="exElementContainer">
                    <button className="removeButton" onClick={() => this.onRemoveClick(point)}>Decrement</button>
                    <button className="addButton" onClick={() => this.onAddClick(point)}>{pointName} Deduction</button>
                    <div className="countText">{this.state.pointDeductions[point]}</div>
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
                {this.getAiElements()}
                {this.getExElements()}
            </div>
        )
    }
}

class SuggestionSlider extends React.Component {
    constructor(props) {
        super(props)

        this.name = props.name
        this.state = {}
        this.state.suggestedValue = props.suggestedValue

        props.onMouseMoveCallbackList.push((event) => this.onMouseMove(event))
        props.onMouseUpCallbackList.push(() => this.onMouseUp())

        this.state = {}
        this.state.dragging = false

        this.ref = React.createRef()
        this.scroll = 0
    }

    componentDidMount() {
        this.scroll = this.getSlideHeight() / 2
        this.ref.current.scrollTop = this.scroll
    }

    componentDidUpdate() {
        if (this.state.suggestedValue !== this.props.suggestedValue) {
            this.state.suggestedValue = this.props.suggestedValue
            this.setState(this.state)
        }

        if (this.state.value !== this.props.value) {
            this.state.value = this.props.value
            this.setScroll((this.state.value + .5) * this.getSlideHeight())
            this.setState(this.state)
        }
    }

    onMouseDown() {
        this.state.dragging = true
        this.setState(this.state)
    }

    onMouseMove(event) {
        if (this.state.dragging) {
            this.setScroll(this.scroll - event.movementY)
        }
    }

    onMouseUp() {
        if (this.state.dragging) {
            this.state.dragging = false

            this.state.value = Math.floor(this.scroll / this.getSlideHeight())
            this.props.onChanged(this.state.value)

            this.setState(this.state)
        }
    }

    onTounchEnd() {
        this.momentumUpdate()
    }

    momentumUpdate() {
        if (this.prevScroll !== this.ref.current.scrollTop) {
            this.setScroll(this.ref.current.scrollTop)
            this.state.value = Math.floor(this.scroll / this.getSlideHeight())
            this.props.onChanged(this.state.value)

            this.setState(this.state)

            setTimeout(() => this.momentumUpdate(), 1000)
        }

        this.prevScroll = this.ref.current.scrollTop
    }

    setScroll(y) {
        this.scroll = Math.max(this.getSlideHeight() * .5, Math.min(y, this.getSlideHeight() * 10.5))

        this.ref.current.scrollTop = this.scroll
    }

    getSlideHeight() {
        return this.ref.current.childNodes[0].clientHeight
    }

    getSuggestedComponent() {
        if (this.state.suggestedValue !== undefined) {
            return (
                <div className="suggested">
                    {this.state.suggestedValue}
                </div>
            )
        }

        return undefined
    }

    render() {
        let slideList = []
        for (let i = -1; i <= 11; ++i) {
            let slideClassnames = "slide snap"
            let str = i >= 0 && i <= 10 ? i : ""
            slideList.push(
                <div key={i} className={slideClassnames}>
                    {str}
                </div>
            )
        }

        return (
            <div className="sliderContainer"
                onMouseDown={() => this.onMouseDown()}
                onTouchEnd={() => this.onTounchEnd()}>
                <div className="sliderName">
                    <div>
                        {this.name}
                    </div>
                </div>
                <div className="innerSliderContainer" ref={this.ref}>
                    {slideList}
                </div>
                {this.getSuggestedComponent()}
            </div>
        )
    }
}
