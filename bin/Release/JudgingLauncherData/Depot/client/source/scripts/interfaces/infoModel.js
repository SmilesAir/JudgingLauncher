
const Enums = require("scripts/stores/enumStore.js")
const InterfaceModelBase = require("scripts/interfaces/interfaceModelBase.js")
const MainStore = require("scripts/stores/mainStore.js")
const DataAction = require("scripts/actions/dataAction.js")
const CommonAction = require("scripts/actions/commonAction.js")
const EndpointStore = require("complete-judging-common/source/endpoints.js")

const xmlNS = "http://freestyledisc.org/FPAScoresheets.xsd"

module.exports = class extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Tournament Info"
        this.type = Enums.EInterface.info

        let ipParam = MainStore.url.searchParams.get("serverIp")
        if (ipParam) {
            MainStore.overrideServerIp = ipParam.split("_").join(".")
            EndpointStore.overrideServerPath(`http://${MainStore.overrideServerIp}:3000`)
        }
    }

    async init() {
        if (!MainStore.lanMode) {
            this.refreshTournamentInfoList().then(() => {
                if (MainStore.startupTournamentName !== undefined) {
                    for (let info of MainStore.tournamentInfoList) {
                        let tournamentName = info.tournamentName || info.TournamentName
                        if (tournamentName === MainStore.startupTournamentName) {
                            this.setInfo(info)
                            break
                        }
                    }

                    MainStore.startupTournamentName = undefined
                }
            })
        } else if (MainStore.startupTournamentName !== undefined) {
            let info = await this.getTournamentInfoFromServer(MainStore.startupTournamentName)
            this.setInfo(info)

            MainStore.startupTournamentName = undefined
        }
    }

    setInfo(info) {
        let saveData = DataAction.loadDataFromPoolCreator(info)
        if (saveData !== undefined) {
            MainStore.tournamentName = info.tournamentName
            MainStore.saveData = saveData
        }
    }

    refreshTournamentInfoList() {
        return CommonAction.fetchEx("GET_ACTIVE_TOURNAMENTS", undefined, undefined, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            return response.json()
        }).then((response) => {
            this.setTournamentInfoList(response.tournamentInfos)
        }).catch((error) => {
            console.log("Refresh Tournament Info Error", error)
        })
    }

    setTournamentInfoList(infos) {
        MainStore.tournamentInfoList = infos
    }

    importTournamentDataFromAWS(info) {
        return CommonAction.fetchEx("REQUEST_IMPORT_TOURNAMENT_DATA", {
            tournamentName: info.tournamentName
        }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            return response.json()
        }).then((response) => {
            console.log(response)
        }).catch((error) => {
            console.log("Import Tournament Data Error", error)
        })
    }

    getTournamentInfoFromServer(tournamentName) {
        return CommonAction.fetchEx("REQUEST_TOURNAMENT_INFO", {
            tournamentName: tournamentName
        }, undefined, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            return response.json()
        }).then((response) => {
            return response
        }).catch((error) => {
            console.log("Import Tournament Data Error", error)
        })
    }

    stopPlayingPools() {
        return CommonAction.fetchEx("STOP_PLAYING_POOLS", {
            tournamentName: MainStore.tournamentName
        }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        }).catch((error) => {
            console.log("Stop Playing Pools Error", error)
        })
    }

    appendChild(parent, tagName) {
        let newNode = document.createElementNS(xmlNS, tagName)

        parent.appendChild(newNode)

        return newNode
    }

    appendChildValue(parent, tagName, value) {
        let newNode = this.appendChild(parent, tagName)
        newNode.innerHTML = value

        return newNode
    }

    getTypeName(type) {
        switch (type) {
        case Enums.EInterface.oldEx:
            return "Ex"
        case Enums.EInterface.oldAi:
            return "Ai"
        case Enums.EInterface.oldDiff:
            return "Diff"
        }

        return "Invalid"
    }

    getFpaResultsXml(pool) {
        let xmlDoc = document.implementation.createDocument(xmlNS, "ns2:ScoreSheet")

        let roundSettings = this.appendChild(xmlDoc.documentElement, "ns2:RoundSettings")
        this.appendChildValue(roundSettings, "ns2:EventTitle", MainStore.tournamentName || "Missing Tournament Name")
        this.appendChildValue(roundSettings, "ns2:EventSubtitle", MainStore.saveData.TournamentSubtitle || "")
        this.appendChildValue(roundSettings, "ns2:Division", DataAction.getDivisionNameFromIndex(pool.divisionIndex))
        this.appendChildValue(roundSettings, "ns2:Round", DataAction.getRoundNameFromIndex(pool.roundIndex))
        this.appendChildValue(roundSettings, "ns2:Pool", DataAction.getPoolNameFromIndex(pool.poolIndex))
        this.appendChildValue(roundSettings, "ns2:Minutes", (pool.routineLengthSeconds / 60).toFixed(1))

        let players = this.appendChild(xmlDoc.documentElement, "ns2:Players")
        let teamNumber = 1
        for (let team of pool.teamList) {
            let playerNumber = 1
            for (let playerId of team.playerList) {
                this.appendChildValue(players, `ns2:Team${teamNumber}Player${playerNumber}`, DataAction.getFullPlayerName(playerId))

                ++playerNumber
            }

            ++teamNumber
        }

        let judges = this.appendChild(xmlDoc.documentElement, "ns2:Judges")
        let typeCount = {}
        for (let judgeData of pool.results) {
            let type = judgeData.data.type
            let count = typeCount[type] = typeCount[type] === undefined ? 1 : typeCount[type] + 1
            let typeName = this.getTypeName(type)

            this.appendChildValue(judges, `ns2:${typeName}${count}`, judgeData.judgeName)

            let results = this.appendChild(xmlDoc.documentElement, `ns2:${typeName}${count}`)
            switch (type) {
            case Enums.EInterface.oldEx:
                this.appendExScores(results, judgeData.data.teamScoreList)
                break
            case Enums.EInterface.oldAi:
                this.appendAiScores(results, judgeData.data.teamScoreList)
                break
            case Enums.EInterface.oldDiff:
                this.appendDiffScores(results, judgeData.data.teamScoreList)
                break
            }
        }

        let serializer = new XMLSerializer()
        serializer.serializeToString(xmlDoc)

        let str = serializer.serializeToString(xmlDoc)

        return str
    }

    appendExScores(parent, teamScoreList) {
        let teamNumber = 1
        for (let teamData of teamScoreList) {
            this.appendChildValue(parent, `ns2:Team${teamNumber}Point1`, teamData.point1Count || 0)
            this.appendChildValue(parent, `ns2:Team${teamNumber}Point2`, teamData.point2Count || 0)
            this.appendChildValue(parent, `ns2:Team${teamNumber}Point3`, teamData.point3Count || 0)
            this.appendChildValue(parent, `ns2:Team${teamNumber}Point5`, teamData.point5Count || 0)

            ++teamNumber
        }
    }

    appendAiScores(parent, teamScoreList) {
        let teamNumber = 1
        for (let teamData of teamScoreList) {
            this.appendChildValue(parent, `ns2:Team${teamNumber}Variety`, teamData.variety || 0)
            this.appendChildValue(parent, `ns2:Team${teamNumber}Teamwork`, teamData.teamwork || 0)
            this.appendChildValue(parent, `ns2:Team${teamNumber}Music`, teamData.music || 0)
            this.appendChildValue(parent, `ns2:Team${teamNumber}Flow`, teamData.flow || 0)
            this.appendChildValue(parent, `ns2:Team${teamNumber}Form`, teamData.form || 0)
            this.appendChildValue(parent, `ns2:Team${teamNumber}General`, teamData.general || 0)

            ++teamNumber
        }
    }

    appendDiffScores(parent, teamScoreList) {
        let teamNumber = 1
        for (let teamData of teamScoreList) {
            for (let i = 0; i < teamData.scores.length; ++i) {
                this.appendChildValue(parent, `ns2:Team${teamNumber}Diff${i + 1}`, teamData.scores[i] || 0)
                this.appendChildValue(parent, `ns2:Team${teamNumber}Consec${i + 1}`, teamData.consecs[i] ? "+" : "")
            }

            ++teamNumber
        }
    }
}
