
const React = require("react")
const MobxReact = require("mobx-react")

const DataAction = require("scripts/actions/dataAction.js")

require("./starterListView.less")

module.exports = @MobxReact.observer class StarterListView extends React.Component {
    constructor(props) {
        super(props)
    }

    getTeamsElement() {
        let teamNumber = 0
        let teamsElements = this.props.poolData.teamList.map((teamData) => {
            let playerElements = []
            for (let playerId of teamData.playerList) {
                playerElements.push(
                    <div key={playerId}>
                        {DataAction.getFullPlayerNameRankAndCountry(playerId)}
                    </div>
                )
            }

            ++teamNumber

            return (
                <div className="teamContainer" key={teamNumber}>
                    <div className="teamNumber">
                        {teamNumber}
                    </div>
                    <div className="teamNamesContainer">
                        {playerElements}
                    </div>
                </div>
            )
        })

        return (
            <div className="teamsContainer">
                {teamsElements}
            </div>
        )
    }

    getJudgesElement() {
        let diffElements = []
        diffElements.push(this.props.poolData.judgeData.judgesDiff.map((judgeData) => {
            let judgeName = `${judgeData.firstName} ${judgeData.lastName}`
            return (
                <div key={judgeName}>
                    {judgeName}
                </div>
            )
        }))

        let varietyElements = []
        varietyElements.push(this.props.poolData.judgeData.judgesAi.map((judgeData) => {
            let judgeName = `${judgeData.firstName} ${judgeData.lastName}`
            return (
                <div key={judgeName}>
                    {judgeName}
                </div>
            )
        }))

        let exAiElements = []
        exAiElements.push(this.props.poolData.judgeData.judgesEx.map((judgeData) => {
            let judgeName = `${judgeData.firstName} ${judgeData.lastName}`
            return (
                <div key={judgeName}>
                    {judgeName}
                </div>
            )
        }))

        return (
            <div className="judgesContainer">
                <div className="categoryContainer">
                    <div className="category">
                        Difficulty
                    </div>
                    <div className="judgeNamesContainer">
                        {diffElements}
                    </div>
                </div>
                <div className="categoryContainer">
                    <div className="category">
                        Variety
                    </div>
                    <div className="judgeNamesContainer">
                        {varietyElements}
                    </div>
                </div>
                <div className="categoryContainer bottom">
                    <div className="category">
                        Artistic Expression
                    </div>
                    <div className="judgeNamesContainer">
                        {exAiElements}
                    </div>
                </div>
            </div>
        )
    }

    getContentElement() {
        return (
            <div className="content">
                <div className="teamsHeader">
                    Player Order
                </div>
                <div className="spacer"/>
                <div className="judgesHeader">
                    Judges
                </div>
                {this.getTeamsElement()}
                <div className="spacer"/>
                {this.getJudgesElement()}
            </div>
        )
    }

    render() {
        if (this.props.poolDesc === undefined || this.props.poolData === undefined) {
            return (
                <div>
                    Set pool from Pools tab
                </div>
            )
        }

        return (
            <div className="starterListContainer">
                <div className="header">
                    {this.props.poolDesc}
                </div>
                {this.getContentElement()}
            </div>
        )
    }
}
