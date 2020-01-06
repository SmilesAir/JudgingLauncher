const React = require("react")
const MobxReact = require("mobx-react")
const qrCode = require("qrcode")
const JSZip = require("jszip")
const saveAs = require("file-saver").saveAs
const JSZipUtils = require("jszip-utils")

const MainStore = require("scripts/stores/mainStore.js")
const InterfaceViewBase = require("scripts/interfaces/interfaceViewBase.js")
const Interfaces = require("scripts/interfaces/interfaces.js")
const DataAction = require("scripts/actions/dataAction.js")
const ResultsView = require("scripts/views/resultsView.js")
const CommonAction = require("scripts/actions/commonAction.js")
const EndpointStore = require("complete-judging-common/source/endpoints.js")
const StarterListView = require("scripts/views/starterListView.js")

require("./infoView.less")

const backupAutoImportSpreadsheet = require("data/AutoImportScoresheets.xlsm")

function getJudgeUrl(judgeIndex, interfaceName, isAlt) {
    let serverAddress = undefined
    if (MainStore.overrideServerIp !== undefined) {
        serverAddress = `http://${MainStore.overrideServerIp}:8080`
    } else if (__STAGE__ === "PRODUCTION") {
        serverAddress = "https://d5rsjgoyn07f8.cloudfront.net"
    } else {
        serverAddress = "https://d27wqtus28jqqk.cloudfront.net"
    }

    let url = `${serverAddress}/index.html`
    url += `?startup=${interfaceName}`
    url += `&tournamentName=${encodeURIComponent(MainStore.tournamentName)}`
    url += `&judgeIndex=${judgeIndex}`
    url += `&alt=${isAlt ? "true" : "false"}`
    url += `&lanMode=${MainStore.lanMode ? "true" : "false"}`
    url += MainStore.overrideServerIp !== undefined ? `&serverIp=${MainStore.url.searchParams.get("serverIp")}` : ""

    return url
}

module.exports = @MobxReact.observer class extends InterfaceViewBase {
    constructor() {
        super()

        this.state = {
            resultsPool: undefined,
            starterListPool: undefined
        }

        this.canvasRefs = []

        let showResultsPool = MainStore.url.searchParams.get("results")
        if (showResultsPool !== null) {
            this.showResultsIntervalHandle = setInterval(() => {
                if (MainStore.saveData !== undefined) {
                    clearInterval(this.showResultsIntervalHandle)

                    let pool = MainStore.saveData.poolList.find((inPool) => {
                        return `${inPool.divisionIndex}_${inPool.roundIndex}_${inPool.poolIndex}` === showResultsPool
                    })

                    if (pool !== undefined) {
                        DataAction.fillPoolResults(pool).then(() => {
                            this.gotoResultsTabActive(pool)
                        })
                    }
                }
            }, 100)
        }
    }

    gotoStarterListTabActive(pool) {
        this.starterListTabRef.checked = true

        this.state.starterListPool = pool
        this.setState(this.state)
    }

    gotoResultsTabActive(pool) {
        this.resultsTabRef.checked = true

        this.state.resultsPool = pool
        this.setState(this.state)
    }

    gotoQRCodesTabActive(pool, isAlt) {
        // Because QrCode is latent, generate the QR Codes next frame
        setTimeout(() => {
            for (let ref of this.canvasRefs) {
                qrCode.toCanvas(ref.ref, ref.url)
            }
        }, 1)

        this.qrCodesTabRef.checked = true

        this.state.qrCodesPool = pool
        this.state.isQrCodesAlt = isAlt
        this.setState(this.state)
    }

    printResults() {
        window.print()
    }

    getStarterListElements() {
        if (this.state.starterListPool !== undefined) {
            return (
                <div>
                    <button id="noPrint" onClick={() => this.printResults()}>Print</button>
                    <StarterListView
                        poolData={this.state.starterListPool}
                        poolDesc={DataAction.getFullPoolDescription(this.state.starterListPool)}/>
                </div>
            )
        }

        return null
    }

    getFullResultsElements() {
        if (this.state.resultsPool !== undefined && this.state.resultsPool.results !== undefined) {
            return (
                <div>
                    <button id="noPrint" onClick={() => this.printResults()}>Print</button>
                    <ResultsView
                        resultsData={DataAction.getFullResultsProcessed(this.state.resultsPool, this.state.resultsPool.routineLengthSeconds)}
                        poolDesc={DataAction.getFullPoolDescription(this.state.resultsPool)}/>
                </div>
            )
        }

        return null
    }

    addQRCodeCanvas(rows, judgeIndex, url, fullName) {
        let rowIndex = Math.floor(judgeIndex / 3)

        rows[rowIndex] = rows[rowIndex] || []
        this.canvasRefs[judgeIndex] = {
            url: url,
            ref: undefined
        }
        rows[rowIndex].push(
            <div key={judgeIndex} className="codeContainer">
                <div className="judgeLabel">
                    {judgeIndex + 1}. {fullName}
                </div>
                <canvas className="code" ref={(ref) => this.canvasRefs[judgeIndex].ref = ref}/>
            </div>
        )
    }

    getQRCodesView() {
        let rows = []
        if (this.state.qrCodesPool !== undefined) {
            let judgeData = this.state.qrCodesPool.judgeData
            if (judgeData !== undefined) {
                let judgeIndex = 0
                judgeData.judgesEx.forEach((judge) => {
                    this.addQRCodeCanvas(rows, judgeIndex, getJudgeUrl(judgeIndex++, "oldEx", this.state.isQrCodesAlt), judge.FullName)
                })
                judgeData.judgesAi.forEach((judge) => {
                    this.addQRCodeCanvas(rows, judgeIndex, getJudgeUrl(judgeIndex++, "oldAi", this.state.isQrCodesAlt), judge.FullName)
                })
                judgeData.judgesDiff.forEach((judge) => {
                    this.addQRCodeCanvas(rows, judgeIndex, getJudgeUrl(judgeIndex++, "oldDiff", this.state.isQrCodesAlt), judge.FullName)
                })
            }
        }

        let key = 0
        let rowElements = rows.map((rowList) => {
            ++key
            return (
                <div key={key} className="qrCodeRowContainer">
                    {rowList}
                </div>
            )
        })

        return (
            <div>
                <button id="noPrint" onClick={() => this.printResults()}>Print</button>
                {rowElements}
            </div>
        )
    }

    render() {
        return (
            <div className="infoContainer">
                <input className="infoTab" id="tab1" type="radio" name="tabs" />
                <label className="infoLabel" htmlFor="tab1">Select</label>
                <input className="infoTab" id="tab2" type="radio" name="tabs" />
                <label className="infoLabel" htmlFor="tab2">Players and Teams</label>
                <input className="infoTab" id="tab3" type="radio" name="tabs" defaultChecked />
                <label className="infoLabel" htmlFor="tab3">Pools</label>
                <input ref={ (ref) => this.starterListTabRef = ref } className="infoTab" id="tab4" type="radio" name="tabs" />
                <label className="infoLabel" htmlFor="tab4">Starter List</label>
                <input ref={ (ref) => this.resultsTabRef = ref } className="infoTab" id="tab5" type="radio" name="tabs" />
                <label className="infoLabel" htmlFor="tab5">Results</label>
                <input ref={ (ref) => this.qrCodesTabRef = ref } className="infoTab" id="tab6" type="radio" name="tabs" />
                <label className="infoLabel" htmlFor="tab6">QR Codes</label>
                <TournamentSelection/>
                <PlayerAndTeams/>
                <PoolsView gotoStarterListTabActive={(pool) => this.gotoStarterListTabActive(pool)} gotoResultsTabActive={(pool) => this.gotoResultsTabActive(pool)} gotoQRCodesTabActive={(pool, isAlt) => this.gotoQRCodesTabActive(pool, isAlt)} />
                <div id="content4" className="infoTabContent">
                    {this.getStarterListElements()}
                </div>
                <div id="content5" className="infoTabContent">
                    {this.getFullResultsElements()}
                </div>
                <div id="content6" className="infoTabContent">
                    {this.getQRCodesView()}
                </div>
            </div>
        )
    }
}

@MobxReact.observer class PlayersView extends React.Component {
    getPlayerComponents() {
        if (MainStore.saveData !== undefined) {
            let playerNumber = 1
            return MainStore.saveData.playerList.map((player) => {
                return (
                    <div key={playerNumber}>
                        {playerNumber++}. {player.firstName} {player.lastName} - {player.rank}
                    </div>
                )
            })
        } else {
            return undefined
        }
    }
    render() {
        return (
            <div className="playerListContainer">
                {this.getPlayerComponents()}
            </div>
        )
    }
}

@MobxReact.observer class PoolsView extends React.Component {
    constructor(props) {
        super(props)
    }

    getTeamComponents(pool) {
        let key = 0
        return pool.teamList.map((team) => {
            let teamNames = DataAction.getTeamPlayers(team)
            return <div key={key++}>{teamNames}</div>
        })
    }

    onSetPool(pool, isAlt) {
        Interfaces.head.setupPlayingPool(pool, isAlt)
    }

    onFullResultsClick(pool) {
        DataAction.fillPoolResults(pool).then(() => {
            this.props.gotoResultsTabActive(pool)
        })
    }

    onStarterListClick(pool) {
        this.props.gotoStarterListTabActive(pool)
    }

    onClearResultsClick(pool) {
        if (window.confirm(`Attention!\nDo you really want to delete results for ${DataAction.getFullPoolDescription(pool)}?`)) {
            DataAction.clearPoolResults(pool)
        }
    }

    onDownloadFpaResultsSheet(pool) {
        DataAction.fillPoolResults(pool).then(() => {
            let xmlData = Interfaces.info.getFpaResultsXml(pool)

            JSZipUtils.getBinaryContent(EndpointStore.buildUrl(MainStore.lanMode, "GET_FPA_SPREADSHEET"), (error, data) => {
                if (error) {
                    JSZipUtils.getBinaryContent(backupAutoImportSpreadsheet, (secondError, secondData) => {
                        if (secondError) {
                            console.error(secondError)
                        } else {
                            const zip = new JSZip()
                            let resultsName = DataAction.getResultsFilename(pool)

                            zip.file(resultsName + ".xlsm", secondData, { binary: true })
                            zip.file("ExportData.xml", xmlData)

                            zip.generateAsync({ type: "blob" }).then((content) => {
                                saveAs(content, `${resultsName}.zip`)
                            })
                        }
                    })
                } else {
                    const zip = new JSZip()
                    let resultsName = DataAction.getResultsFilename(pool)

                    zip.file(resultsName + ".xlsm", data, { binary: true })
                    zip.file("ExportData.xml", xmlData)

                    zip.generateAsync({ type: "blob" }).then((content) => {
                        saveAs(content, `${resultsName}.zip`)
                    })
                }
            })
        })
    }

    getOptions(pool) {
        let errorStr = this.getPoolErrors(pool)
        let errorClassname = `${errorStr !== undefined ? "error" : ""}`

        return (
            <div className="results">
                <div>
                    {"Pool Options   "}
                    <button onClick={() => this.onStarterListClick(pool)}>Starter List</button>
                    <button onClick={() => this.onFullResultsClick(pool)}>Full Results</button>
                    <button className="clearResultsButton" onClick={() => this.onClearResultsClick(pool)}>Clear Results</button>
                </div>
                <div className={errorClassname}>
                    {errorStr}
                </div>
            </div>
        )
    }

    getPoolErrors(pool) {
        let retStr = ""
        if (pool.routineLengthSeconds === 0) {
            retStr += "Routine Length is 0 minutes. Please set the routine length time in the PoolCreator and re upload.\r\n"
        }

        return retStr.length > 0 ? "Error!\r\n" + retStr : undefined
    }

    setLinksInClipboard(pool) {
        let linkList = []
        let judgeData = pool.judgeData
        if (judgeData !== undefined) {
            let judgeIndex = 0
            judgeData.judgesEx.forEach(() => {
                linkList.push(`${judgeIndex}: ${getJudgeUrl(judgeIndex++, "exAi")}`)
            })
            judgeData.judgesAi.forEach(() => {
                linkList.push(`${judgeIndex}: ${getJudgeUrl(judgeIndex++, "variety")}`)
            })
            judgeData.judgesDiff.forEach(() => {
                linkList.push(`${judgeIndex}: ${getJudgeUrl(judgeIndex++, "diff")}`)
            })
        }

        this.copyArea.value = linkList.join("\n")
        this.copyArea.select()
        document.execCommand("copy")
    }

    generateQRCodes(pool, isAlt) {
        this.props.gotoQRCodesTabActive(pool, isAlt)
    }

    getPoolComponents() {
        if (MainStore.saveData !== undefined) {
            return MainStore.saveData.poolList.map((pool) => {
                let key = `${pool.divisionIndex}${pool.roundIndex}${pool.poolIndex}`
                let setPoolClassname = this.getPoolErrors(pool) !== undefined ? "error" : ""
                return (
                    <div key={key} className="poolContainer">
                        <div className="description">
                            {DataAction.getFullPoolDescription(pool)}
                        </div>
                        <div className="controls">
                            <button className={setPoolClassname} onClick={() => this.onSetPool(pool)}>Set Pool</button>
                            <button className={setPoolClassname} onClick={() => this.onSetPool(pool, true)}>Set Pool Alt</button>
                            <button onClick={() => this.setLinksInClipboard(pool)}>Copy Links</button>
                            <button onClick={() => this.generateQRCodes(pool, false)}>QR Codes</button>
                            <button onClick={() => this.generateQRCodes(pool, true)}>QR Codes Alt</button>
                        </div>
                        <div className="teams">
                            {this.getTeamComponents(pool)}
                        </div>
                        {this.getOptions(pool)}
                        <textarea className="copyArea" ref={(ref) => this.copyArea = ref} />
                    </div>
                )
            })
        } else {
            return undefined
        }
    }

    render() {
        return (
            <div id="content3" className="infoTabContent">
                <div className="poolsContainer">
                    <button onClick={() => Interfaces.info.stopPlayingPools()}>Stop Playing Pools</button>
                    {this.getPoolComponents()}
                </div>
            </div>
        )
    }
}

class PlayerAndTeams extends React.Component {
    render() {
        return (
            <div id="content2" className="infoTabContent">
                <div className="content2Container">
                    <PlayersView/>
                </div>
            </div>
        )
    }
}

@MobxReact.observer class TournamentSelection extends React.Component {
    constructor() {
        super()

        this.state = { newTournamentName: "" }
    }

    selectTournament(info) {
        Interfaces.info.setInfo(info)
    }

    getActiveTournamentInfoComponents() {
        return MainStore.tournamentInfoList.map((info) => {
            let dateString = new Date(info.createdTime).toString()

            return (
                <label className="infoSummary" key={info.tournamentName} onClick={() => {
                    Interfaces.info.importTournamentDataFromAWS(info)
                }}>
                    Name: {info.tournamentName} Created: {dateString}
                </label>
            )
        })
    }

    onSubmit(event) {
        event.preventDefault()

        CommonAction.fetchEx("CREATE_TOURNAMENT", undefined, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ tournamentName: this.state.newTournamentName })
        }).then((response) => {
            if (response.status < 400) {
                Interfaces.info.refreshTournamentInfoList()
            }
        }).catch((error) => {
            console.log("Create Tournament Error", error)
        })
    }

    onChange(event) {
        this.setState({ newTournamentName: event.target.value })
    }

    render() {
        return (
            <div id="content1" className="infoTabContent">
                <button onClick={() => DataAction.exportTournamentData()}>Export Tournament Data to AWS</button>
                <form onSubmit={(event) => this.onSubmit(event)}>
                    <label>
                        New Tournament Name:
                        <input type="text" value={this.state.value} onChange={(event) => {this.onChange(event)}}/>
                    </label>
                    <input type="submit" value="Submit" />
                </form>
                <button onClick={() => {Interfaces.info.refreshTournamentInfoList()}}>Refresh Active Tournament List</button>
                {this.getActiveTournamentInfoComponents()}
            </div>
        )
    }
}


