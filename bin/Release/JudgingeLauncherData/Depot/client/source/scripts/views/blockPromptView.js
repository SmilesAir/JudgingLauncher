
const React = require("react")

require("./blockPromptView.less")

module.exports = class BlockPrompt extends React.Component {
    constructor(props) {
        super(props)

        this.promptText = props.promptText
        this.onClick = props.onClick
    }

    render() {
        return (
            <div className="blockPromptContainer">
                <button className="promptButton" onClick={this.onClick}>{this.promptText}</button>
            </div>
        )
    }
}
