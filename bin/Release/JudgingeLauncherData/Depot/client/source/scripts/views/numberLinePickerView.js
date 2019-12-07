
const React = require("react")
const MobxReact = require("mobx-react")

require("./numberLinePickerView.less")

@MobxReact.observer class NumberLinePickerView extends React.Component {
    constructor(props) {
        super(props)

        this.state = {}
        this.touchAreaRef = React.createRef()
    }

    getIsEditing() {
        return this.props.getIsEditingFunc !== undefined ? this.getIsEditingFunc() : false
    }

    onInputEnd() {
        if (this.props.onInputEnd !== undefined) {
            let number = this.getStateNumberOut()
            if (number !== undefined) {
                this.props.onInputEnd(number)
            }
        }

        this.state.numberOut = undefined
        this.setState(this.state)
    }

    updateNumberOut(posX) {
        let rect = this.touchAreaRef.current.getBoundingClientRect()
        let inputX = Math.max(0, Math.min(1, (posX - rect.left) / (rect.width * .92)))

        this.state.numberOut = inputX * 10
        this.setState(this.state)
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
            let popupClassnames = `popupContainer ${this.getIsEditing() ? "editing" : ""}`

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

    onTouchStart(event) {
        this.updateNumberOut(event.targetTouches[0].clientX)
    }

    onTouchMove(event) {
        this.updateNumberOut(event.targetTouches[0].clientX)
    }

    onTouchEnd(event) {
        this.onInputEnd(event)
    }

    onMouseDown(event) {
        this.updateNumberOut(event.clientX)
    }

    onMouseMove(event) {
        if (event.buttons === 1 || this.getIsEditing()) {
            this.updateNumberOut(event.clientX)
        }
    }

    onMouseUp(event) {
        this.onInputEnd(event)
    }
    
    render() {
        return <div className="numberLinePickerContainer">
            <div id="inputContainer" className="inputContainer"
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
            {this.getNumberOutView()}
        </div>
    }
}
module.exports = NumberLinePickerView
