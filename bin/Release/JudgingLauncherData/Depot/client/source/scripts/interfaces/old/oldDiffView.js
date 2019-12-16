const React = require("react")
const MobxReact = require("mobx-react")

const InterfaceViewBase = require("scripts/interfaces/interfaceViewBase.js")
const Interfaces = require("scripts/interfaces/interfaces.js")
const CommonAction = require("scripts/actions/commonAction.js")

require("./oldDiffView.less")

module.exports = @MobxReact.observer class extends InterfaceViewBase {
    constructor() {
        super()

        this.startTime = undefined
        this.state = {}
        this.touchAreaRef = React.createRef()
        this.name = "Old Difficulty Judge"
        this.interface = Interfaces.oldDiff
    }

    fillWithResults() {
        // Not needed
    }

    getNumbers() {
        let numberList = []
        for (let i = 0; i <= 10; ++i) {
            numberList.push(
                <div key={i} className="number">
                    {i}
                </div>
            )
        }

        return numberList
    }

    getStateNumberOut() {
        return this.state.numberOut !== undefined ? Math.round(this.state.numberOut * 2) / 2 : undefined
    }

    getNumberOutView() {
        if (this.getStateNumberOut() !== undefined) {
            let popupClassnames = `popupContainer ${this.interface.obs.editIndex === undefined ? "" : "editing"}`

            return (
                <div className="overlay">
                    <div className={popupClassnames}>
                        <div className="numberOut">
                            {this.getStateNumberOut()}
                        </div>
                    </div>
                </div>
            )
        } else {
            return undefined
        }
    }

    updateNumberOut(posX) {
        let parent = this.touchAreaRef.current
        let inputX = Math.max(0, Math.min(1, (posX - parent.offsetLeft * 1.15) / (parent.offsetWidth * .92)))

        this.state.numberOut = inputX * 10
        this.setState(this.state)
    }

    onTouchStart(event) {
        this.updateNumberOut(event.targetTouches[0].clientX)
    }

    onTouchMove(event) {
        this.updateNumberOut(event.targetTouches[0].clientX)
    }

    onTouchEnd(event) {
        this.onParentInputEnd(event)
    }

    onMouseDown(event) {
        this.updateNumberOut(event.clientX)
        this.inputNumberDown = true
    }

    onMouseMove(event) {
        if (this.inputNumberDown || this.interface.obs.editIndex !== undefined) {
            this.updateNumberOut(event.clientX)
        }
    }

    onMouseUp(event) {
        this.onParentInputEnd(event)
        this.inputNumberDown = false
    }

    onParentTouchMove(event) {
        if (this.interface.obs.editIndex !== undefined) {
            let inputContainer = document.getElementById("inputContainer")
            if (inputContainer !== undefined) {
                let bounds = inputContainer.getBoundingClientRect()

                let x = event.targetTouches[0].clientX
                let y = event.targetTouches[0].clientY

                if (x >= bounds.left &&
                    x <= bounds.right &&
                    y >= bounds.top &&
                    y <= bounds.bottom) {

                    this.updateNumberOut(x)
                }
            }
        }
    }

    onParentInputEnd(event) {
        if (this.interface.obs.editIndex === undefined) {
            let score = this.getStateNumberOut()
            if (score !== undefined) {
                let setScore = this.interface.setActiveScore(score)

                this.setConsecInputEnable(setScore, this.interface.obs.activeInputIndex)

                CommonAction.vibrateSingleMedium()

                this.isInputCooldown = true
                setTimeout(() => {
                    this.isInputCooldown = false
                }, 200)
            }
        } else {
            this.setConsecInputEnable(true, this.interface.obs.editIndex)

            this.interface.endEdit(this.getStateNumberOut())
        }

        this.state.numberOut = undefined
        this.setState(this.state)
    }

    onParentInputStart(event) {

    }

    onConsecInput(isConsec) {
        if (this.isInputCooldown) {
            return
        }

        this.interface.setConsec(this.state.consecInputIndex, isConsec)

        this.setConsecInputEnable(false)
    }

    setConsecInputEnable(enable, blockIndex) {
        this.state.isConsecInputEnable = enable
        this.state.consecInputIndex = blockIndex

        if (enable) {
            this.state.consecTimeoutHandle = setTimeout(() => {
                this.trySetNoneConsec()
            }, 6000)
        }

        this.setState(this.state)
    }

    trySetNoneConsec() {
        clearInterval(this.setState(this.state))

        if (this.state.isConsecInputEnable) {
            let prevConsec = this.interface.getConsec(this.state.consecInputIndex)
            this.interface.setConsec(this.state.consecInputIndex, prevConsec === true)

            this.setConsecInputEnable(false)
        }
    }

    render() {
        if (this.interface.obs.playingPool === undefined) {
            return <div className="diffTopContainer">Waiting for Head Judge</div>
        }

        let inputClassName = `numberInputContainer ${this.interface.obs.activeInputIndex !== undefined ? "outlineActive" : ""}`
        let inputElement = null
        if (this.state.isConsecInputEnable) {
            inputElement =
                <div className="consecInputContainer">
                    <button onClick={() => this.onConsecInput(false)}>None</button>
                    <button onClick={() => this.onConsecInput(true)}>+</button>
                </div>
        } else {
            inputElement =
                <div id="inputContainer" className={inputClassName}
                    onTouchStart={(event) => this.onTouchStart(event)}
                    onTouchMove={(event) => this.onTouchMove(event)}
                    onTouchEnd={(event) => this.onTouchEnd(event)}
                    onMouseDown={(event) => this.onMouseDown(event)}
                    onMouseMove={(event) => this.onMouseMove(event)}
                    onMouseUp={(event) => this.onMouseUp(event)}
                    onMouseLeave={(event) => this.onMouseUp(event)}>
                    <div className="touchArea" ref={this.touchAreaRef}>
                        {this.getNumbers()}
                    </div>
                </div>
        }

        return (
            <div className="diffTopContainer"
                onTouchStart={(event) => this.onParentInputStart(event)}
                onMouseUp={(event) => this.onParentInputEnd(event)}
                onTouchMove={(event) => this.onParentTouchMove(event)}
                onTouchEnd={(event) => this.onParentInputEnd(event)}>
                {this.getJudgeHeaderElement()}
                <TimeMarksView />
                {inputElement}
                {this.getNumberOutView()}
            </div>
        )
    }
}

@MobxReact.observer class MarkView extends React.Component {
    constructor(props) {
        super(props)

        this.markIndex = props.markIndex
        this.interface = Interfaces.oldDiff
    }

    onTouchStart() {
        this.onEditStart()
    }

    onMouseDown() {
        this.onEditStart()
    }

    onEditStart() {
        this.interface.startEdit(this.markIndex)
    }

    render() {
        let data = this.interface.obs.results.teamScoreList[this.interface.getActiveTeamIndex()]
        let score = data.scores[this.markIndex]
        let isConsec = data.consecs[this.markIndex]
        let classname = `markContainer ${this.interface.obs.activeInputIndex === this.markIndex ? "outlineActive" : ""} ${isConsec ? "markConsec" : ""}`

        return (
            <div className={classname}
                onTouchStart={(event) => this.onTouchStart(event)}
                onMouseDown={(event) => this.onMouseDown(event)}>
                {score}
            </div>
        )
    }
}

@MobxReact.observer class TimeMarksView extends React.Component {
    constructor() {
        super()

        this.marksPerGroup = 4
        this.interface = Interfaces.oldDiff
    }

    getGroupViews() {
        if (this.interface.obs.results === undefined) {
            return undefined
        }

        let teamScores = this.interface.obs.results.teamScoreList[this.interface.getActiveTeamIndex()]
        if (teamScores === undefined) {
            return undefined
        }

        let diffScoreList = teamScores.scores

        let markCount = diffScoreList.length
        let groupCount = Math.ceil(markCount / this.marksPerGroup)

        let ret = []
        for (let groupIndex = 0; groupIndex < groupCount; ++groupIndex) {

            let markList = []
            let markOffset = groupIndex * this.marksPerGroup
            let groupMarkCount = Math.min(this.marksPerGroup, markCount - markOffset)
            for (let i = 0; i < groupMarkCount; ++i) {
                let markIndex = i + markOffset
                markList.push(<MarkView key={markIndex} markIndex={markIndex} />)
            }

            ret.push(
                <div key={groupIndex} className="groupContainer">
                    {markList}
                </div>
            )
        }

        return ret
    }

    render() {
        return (
            <div id="asdf" className="timeMarksContainer">
                {this.getGroupViews()}
            </div>
        )
    }
}
