
const MainStore = require("scripts/stores/mainStore.js")
const DataAction = require("scripts/actions/dataAction.js")
const CommonAction = require("scripts/actions/commonAction.js")

module.exports = class {
    constructor() {
        const DiffData = require("scripts/interfaces/fpa/data/diffData.js")
        const VarietyData = require("scripts/interfaces/fpa/data/varietyData.js")
        const ExAiData = require("scripts/interfaces/fpa/data/exAiData.js")

        const OldExData = require("scripts/interfaces/old/data/oldExData.js")
        const OldAiData = require("scripts/interfaces/old/data/oldAiData.js")
        const OldDiffData = require("scripts/interfaces/old/data/oldDiffData.js")

        this.dataModelList = [
            DiffData,
            VarietyData,
            ExAiData,
            OldExData,
            OldAiData,
            OldDiffData
        ]

        for (let dataModel of this.dataModelList) {
            if (!DataAction.verifyDataModel(dataModel)) {
                console.error("Failed to verify data model")
            } else {
                let constants = dataModel.getDefaultConstants()
                if (DataAction.verifyDataConstants(constants)) {
                    MainStore.constants[constants.name] = constants
                } else {
                    console.error("Missing required constants for data model")
                }
            }
        }

        this.getConstantsFromCloud()
    }

    async getConstantsFromCloud() {
        await CommonAction.fetchEx("GET_CONSTANTS", undefined, undefined, {
            method: "GET",
            headers: {
                "Pragma": "no-cache",
                "Cache-Control": "no-cache",
                "Content-Type": "application/json"
            }
        }).then((response) => {
            return response.json()
        }).then((response) => {
            for (let key in response) {
                MainStore.constants[key] = Object.assign(MainStore.constants[key], response[key])
            }
        }).catch(() => {
            console.error("Can't query constants from s3")
        })
    }

    getModel(data) {
        for (let model of this.dataModelList) {
            if (model.verify(data)) {
                return model
            }
        }

        return undefined
    }

    getResultsSummary(results) {
        if (results !== undefined && results.length > 0) {
            let firstData = results[0].data
            for (let data of results) {
                if (!DataAction.isTeamListEqual(data.data.teamList, firstData.teamList)) {
                    console.error("Team list missmatch when generate results summary")
                    return undefined
                }
            }

            let ret = ""
            for (let i = 0; i < firstData.teamList.length; ++i) {
                let templateTeam = firstData.teamList[i]
                ret += `${DataAction.getTeamPlayers(templateTeam)} <> `

                let summaryList = []
                for (let data of results) {
                    let dataModel = this.getModel(data.data)
                    if (dataModel !== undefined) {
                        summaryList.push(dataModel.getSummary(data.data, i))
                    }
                }

                ret += summaryList.join(", ")

                ret += "\r\n"
            }

            return ret
        }

        return undefined
    }

    getOverlaySummary(data, teamIndex) {
        let model = this.getModel(data)
        if (model !== undefined) {
            if (model.getOverlaySummary !== undefined) {
                return model.getOverlaySummary(data.teamScoreList[teamIndex])
            }
        }

        return undefined
    }

    getGeneralImpressionSummary(data, teamIndex) {
        let model = this.getModel(data)
        if (model !== undefined) {
            if (model.getOverlaySummary !== undefined) {
                return ` [General Impression: ${data.teamScoreList[teamIndex].general}]`
            }
        }

        return undefined
    }

    setCurrentTeamGeneral(score) {
        this.setGeneral(MainStore.interfaceObs.playingTeamIndex, score)
    }

    setGeneral(teamIndex, score) {
        let model = this.getModel(MainStore.interfaceObs.results)
        if (model !== undefined && teamIndex !== undefined) {
            MainStore.interfaceObs.results.teamScoreList[teamIndex].general = score
        }
    }

    getResultsInspected(resultData, teamIndex) {
        let model = this.getModel(resultData.data)
        if (model !== undefined) {
            return model.getInspected(resultData, teamIndex)
        }

        return undefined
    }

    getFullResultsProcessed(data, teamIndex, preProcessedData) {
        let model = this.getModel(data)
        if (model !== undefined) {
            if (model.getFullProcessed !== undefined) {
                return model.getFullProcessed(data.teamScoreList[teamIndex], preProcessedData)
            } else {
                console.error(`No getFullProcessed for ${model}`)
            }
        }

        return undefined
    }

    getIncrementalScoreboardResultsProcessed(data, teamIndex, preProcessedData, processedData) {
        let model = this.getModel(data)
        if (model !== undefined) {
            if (model.getIncrementalScoreboardProcessed !== undefined) {
                return model.getIncrementalScoreboardProcessed(data.teamScoreList[teamIndex], preProcessedData, processedData)
            } else {
                console.error(`No getIncrementalScoreboardProcessed for ${model}`)
            }
        }

        return undefined
    }

    getCategoryResultsProcessed(data, teamIndex, preProcessedData, processedData) {
        let model = this.getModel(data)
        if (model !== undefined) {
            if (model.getCategoryResultsProcessed !== undefined) {
                return model.getCategoryResultsProcessed(data.teamScoreList[teamIndex], preProcessedData, processedData)
            } else {
                console.error(`No getCategoryResultsProcessed for ${model}`)
            }
        }

        return undefined
    }

    getScoreboardResultsProcessed(data, teamIndex, preProcessedData, processedData) {
        let model = this.getModel(data)
        if (model !== undefined) {
            if (model.getScoreboardProcessed !== undefined) {
                return model.getScoreboardProcessed(data.teamScoreList[teamIndex], preProcessedData, processedData)
            } else {
                console.error(`No getScoreboardProcessed for ${model}`)
            }
        }

        return undefined
    }

    getDiffDetailedResultsProcessed(data, teamIndex, preProcessedData) {
        let model = this.getModel(data)
        if (model !== undefined) {
            if (model.getDiffDetailedProcessed !== undefined) {
                return model.getDiffDetailedProcessed(data.teamScoreList[teamIndex], preProcessedData)
            }
        }

        return undefined
    }

    getExAiDetailedResultsProcessed(data, teamIndex, preProcessedData) {
        let model = this.getModel(data)
        if (model !== undefined) {
            if (model.getExAiDetailedProcessed !== undefined) {
                return model.getExAiDetailedProcessed(data.teamScoreList[teamIndex], preProcessedData)
            }
        }

        return undefined
    }

    getHudProcessed(data, teamIndex, preProcessedData, processedData) {
        let model = this.getModel(data)
        if (model !== undefined) {
            if (model.getHudProcessed !== undefined) {
                return model.getHudProcessed(data.teamScoreList[teamIndex], preProcessedData, processedData)
            }
        }

        return undefined
    }

    preProcessedData(data, teamIndex, preProcessedData) {
        let model = this.getModel(data)
        if (model !== undefined) {
            if (model.getPreProcessed !== undefined) {
                return model.getPreProcessed(data.teamScoreList[teamIndex], preProcessedData)
            }
        }

        return undefined
    }
}

