const React = require("react")
const MobxReact = require("mobx-react")

const InterfaceViewBase = require("scripts/interfaces/interfaceViewBase.js")
const Interfaces = require("scripts/interfaces/interfaces.js")

require("./oldAiView.less")

module.exports = @MobxReact.observer class extends InterfaceViewBase {
    constructor() {
        super()

        this.name = "Ai Judge"
        this.interface = Interfaces.oldAi
        this.state = {
            music: {
                name: "Music",
                score: 0
            },
            teamwork: {
                name: "Teamwork",
                score: 0
            },
            variety: {
                name: "Variety",
                score: 0
            },
            form: {
                name: "Form",
                score: 0
            },
            flow: {
                name: "Flow",
                score: 0
            },
            general: {
                name: "General",
                score: 0
            }
        }
        this.onMouseMoveCallbackList = []
        this.onMouseUpCallbackList = []
    }

    fillWithResults() {
        let teamResults = this.interface.getActiveResultsData()

        if (teamResults !== undefined) {
            this.state.music.score = teamResults.getAiData("music")
            this.state.teamwork.score = teamResults.getAiData("teamwork")
            this.state.variety.score = teamResults.getAiData("variety")
            this.state.form.score = teamResults.getAiData("form")
            this.state.flow.score = teamResults.getAiData("flow")
            this.state.general.score = teamResults.getAiData("general")

            this.setState(this.state)
        }
    }

    onInputEnd(number) {
        this.interface.setQualityScore(number)

        this.state.qualityScore = number
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
        this.state[key].score = value
        this.setState(this.state)

        this.interface.setAiScore(value, key)
    }

    getAiCounterElements() {
        let counterElements = []
        for (let counterKey in this.state) {
            let counter = this.state[counterKey]
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

    render() {
        if (this.interface.obs.playingPool === undefined || this.interface.obs.results === undefined) {
            return <div className="oldAiContainer">Waiting for Head Judge</div>
        }

        return (
            <div className="oldAiContainer"
                onMouseMove={(event) => this.onMouseMove(event)}
                onMouseUp={() => this.onMouseUp()}
                onMouseLeave={() => this.onMouseUp()}>

                {this.getJudgeHeaderElement()}
                {this.getAiElements()}
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
