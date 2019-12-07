
const React = require("react")
const MobxReact = require("mobx-react")

const Enums = require("scripts/stores/enumStore.js")

require("./resultsView.less")

function judgeSort(a, b) {
    if (a.type === b.type) {
        return a.judgeName > b.judgeName
    } else if (a.type === Enums.EInterface.diff) {
        return -1
    } else if (b.type === Enums.EInterface.diff) {
        return 1
    } else if (a.type === Enums.EInterface.variety) {
        return -1
    } else if (b.type === Enums.EInterface.variety) {
        return 1
    }

    return 0
}

module.exports = @MobxReact.observer class ResultsView extends React.Component {
    constructor(props) {
        super(props)
    }

    getScoreDetails(judgeData) {
        if (judgeData.type === Enums.EInterface.diff) {
            return (
                <div key={judgeData.judgeName} className="detailsContainer">
                    <div className="detailSingle diff">
                        {judgeData.printLabels === true ? `Diff ${judgeData.judgeNumber}` : judgeData.score.toFixed(1)}
                    </div>
                </div>
            )
        } else if (judgeData.type === Enums.EInterface.variety) {
            return (
                <div key={judgeData.judgeName} className="detailsContainer">
                    <div className="detailSingle variety">
                        {judgeData.printLabels === true ? `Vty ${judgeData.judgeNumber}` : judgeData.score.toFixed(1)}
                    </div>
                </div>
            )
        } else if (judgeData.type === Enums.EInterface.exAi) {
            return (
                <div key={judgeData.judgeName} className="detailsContainer">
                    <div className="detailSingle ai">
                        {judgeData.printLabels === true ? `AI ${judgeData.judgeNumber}` : judgeData.score.toFixed(1)}
                    </div>
                    <div className="detailSingle ex">
                        {judgeData.printLabels === true ? `Ex ${judgeData.judgeNumber}` : -judgeData.adjustedEx.toFixed(1)}
                    </div>
                </div>
            )
        }

        return null
    }

    getScoreDetailsContainer(data) {
        let sortedJudgeData = []
        for (let judgeName in data) {
            sortedJudgeData.push(Object.assign({
                judgeName: judgeName
            }, data[judgeName]))
        }

        sortedJudgeData.sort(judgeSort)

        let detailElements = []
        for (let judgeData of sortedJudgeData) {
            detailElements.push(this.getScoreDetails(judgeData))
        }

        if (this.labelData === undefined) {
            this.labelData = {
                data: {}
            }

            let typeCount = {}
            for (let judgeData of sortedJudgeData) {
                typeCount[judgeData.type] = (typeCount[judgeData.type] || 0) + 1
                this.labelData.data[judgeData.judgeName] = {
                    judgeName: judgeData.judgeName,
                    type: judgeData.type,
                    judgeNumber: typeCount[judgeData.type],
                    printLabels: true
                }
            }
        }

        return (
            <div className="allDetailsContainer">
                {detailElements}
                {this.getCategorySumsContainer(data)}
            </div>
        )
    }

    getCategorySumsContainer(data) {
        let sums = {}
        for (let judgeName in data) {
            let judgeData = data[judgeName]
            if (judgeData.score !== undefined) {
                sums[judgeData.type] = (sums[judgeData.type] || 0) + judgeData.score
            }
            if (judgeData.adjustedEx !== undefined) {
                sums.ex = (sums.ex || 0) - judgeData.adjustedEx
            }
        }

        return (
            <div className="categorySumsContainer">
                <div className="categorySum diff">
                    {sums[Enums.EInterface.diff] !== undefined ? sums[Enums.EInterface.diff].toFixed(2) : "Diff"}
                </div>
                <div className="categorySum variety">
                    {sums[Enums.EInterface.variety] !== undefined ? sums[Enums.EInterface.variety].toFixed(2) : "Variety"}
                </div>
                <div className="categorySum ai">
                    {sums[Enums.EInterface.exAi] !== undefined ? sums[Enums.EInterface.exAi].toFixed(2) : "AI"}
                </div>
                <div className="categorySum ex">
                    {sums.ex !== undefined ? sums.ex.toFixed(2) : "Ex"}
                </div>
            </div>
        )
    }

    getTeamRows(teamData) {
        return (
            <div key={teamData.teamNames} className="row">
                <div className="divided">
                    <div className="names">
                        {teamData.teamNames}
                    </div>
                    {this.getScoreDetailsContainer(teamData.data)}
                </div>
                <div className="total">
                    {typeof teamData.totalScore === "number" ? teamData.totalScore.toFixed(2) : teamData.totalScore}
                </div>
                <div className="rank">
                    {teamData.rank}
                </div>
            </div>
        )
    }

    getResults() {
        let results = this.props.resultsData
        let teamRows = []

        // Fill out label row after data since we don't know the data yet
        this.labelData = undefined
        teamRows.push({})

        for (let team of results) {
            team.scoreDetails = "Score numbers"
            teamRows.push(this.getTeamRows(team))
        }

        teamRows[0] = this.getTeamRows(Object.assign(this.labelData, {
            teamNames: "Team",
            scoreDetails: "Score Labels",
            totalScore: "Total",
            rank: "Rank"
        }))

        return teamRows
    }

    getJudgeTeamDetails(teamData) {
        if (teamData.type === Enums.EInterface.diff) {
            return (
                <div className="judgeDetailsContainer">
                    <div className="detailScoreLine bottomBorder">
                        <div className="label">
                            General
                        </div>
                        <div className="detailSingle">
                            {teamData.general}
                        </div>
                    </div>
                    <div className="detailScoreLine bottomBorder">
                        <div className="label">
                            Phrases
                        </div>
                        <div className="detailSingle">
                            {teamData.phraseCount}
                        </div>
                    </div>
                    <div className="detailScoreLine bottomBorder">
                        <div className="label">
                            Marks
                        </div>
                        <div className="detailLong">
                            {teamData.marks}
                        </div>
                    </div>
                </div>
            )
        } else if (teamData.type === Enums.EInterface.variety) {
            return (
                <div className="judgeDetailsContainer">
                    <div className="detailScoreLine bottomBorder">
                        <div className="label">
                            General
                        </div>
                        <div className="detailSingle">
                            {teamData.general}
                        </div>
                    </div>
                    <div className="detailScoreLine bottomBorder">
                        <div className="label">
                            Quantity
                        </div>
                        <div className="detailSingle">
                            {teamData.quantity}
                        </div>
                    </div>
                    <div className="detailScoreLine bottomBorder">
                        <div className="label">
                            Quality
                        </div>
                        <div className="detailSingle">
                            {teamData.quality}
                        </div>
                    </div>
                </div>
            )
        } else if (teamData.type === Enums.EInterface.exAi) {
            return (
                <div className="judgeDetailsContainer">
                    <div className="detailScoreLine bottomBorder">
                        <div className="label">
                            General
                        </div>
                        <div className="detailSingle">
                            {teamData.general}
                        </div>
                    </div>
                    <div className="detailScoreLine bottomBorder">
                        <div className="label">
                            AI
                        </div>
                        <div className="detailSingle">
                            {`Music [${teamData.music}] Teamwork [${teamData.teamwork}] Form [${teamData.form}]`}
                        </div>
                    </div>
                    <div className="detailScoreLine bottomBorder">
                        <div className="label">
                            Ex
                        </div>
                        <div className="detailSingle">
                            {`Point1 [${teamData.point1Count}] Point2 [${teamData.point2Count}] Point3 [${teamData.point3Count}] Point5 [${teamData.point5Count}]`}
                        </div>
                    </div>
                </div>
            )
        }

        return null
    }

    getJudgeTeamRows(judgeData) {
        let rows = []
        for (let team of this.props.resultsData) {
            let teamData = judgeData[team.teamNames]

            rows.push(
                <div key={team.teamNames} className="row">
                    <div className="divided">
                        <div className="names">
                            {team.teamNames}
                        </div>
                        {this.getJudgeTeamDetails(teamData)}
                    </div>
                    <div className="total">
                        {teamData.score.toFixed(2)}
                    </div>
                    <div className="rank">
                        3
                    </div>
                </div>
            )
        }

        return rows
    }

    getJudgeResults(judgeData) {
        return (
            <div key={judgeData.judgeName}>
                <div className="header">
                    {judgeData.judgeName}
                </div>
                <div className="content">
                    {this.getJudgeTeamRows(judgeData)}
                </div>
            </div>
        )
    }

    getJudgeDetails() {
        let judgeTableElements = []
        let results = this.props.resultsData
        let judgeDataArray = []
        for (let team of results) {
            for (let judgeName in team.data) {
                let judgeData = judgeDataArray.find((data) => {
                    return data.judgeName === judgeName
                })

                if (judgeData === undefined) {
                    judgeData = {
                        judgeName: judgeName,
                        type: team.data[judgeName].type
                    }
                    judgeDataArray.push(judgeData)
                }

                judgeData[team.teamNames] = team.data[judgeName]
            }
        }

        judgeDataArray.sort(judgeSort)

        for (let judgeData of judgeDataArray) {
            judgeTableElements.push(this.getJudgeResults(judgeData))
        }

        return judgeTableElements
    }

    render() {
        if (this.props.poolDesc === undefined || this.props.resultsData === undefined) {
            return (
                <div>
                    Set results from Pools tab
                </div>
            )
        }

        return (
            <div className="resultsContainer">
                <div className="header">
                    {this.props.poolDesc}
                </div>
                <div className="content">
                    {this.getResults()}
                </div>
                {this.getJudgeDetails()}
            </div>
        )
    }
}
