"use strict"

const React = require("react")
const ReactDOM = require("react-dom")
const MobxReact = require("mobx-react")
require("favicon.ico")
//const fpaLogo = require("images/fpa_logo.png")

const MainStore = require("scripts/stores/mainStore.js")
MainStore.url = new URL(window.location.href)

const Enums = require("scripts/stores/enumStore.js")
const InfoView = require("scripts/interfaces/infoView.js")
const Interfaces = require("scripts/interfaces/interfaces.js")
const HeadJudgeInterface = require("scripts/interfaces/headView.js")
const RankView = require("scripts/interfaces/simpleRank/judgeView.js")
const DiffView = require("scripts/interfaces/fpa/diffView.js")
const VarietyView = require("scripts/interfaces/fpa/varietyView.js")
const DataAction = require("scripts/actions/dataAction.js")
const OverlayView = require("scripts/views/overlayView.js")
const FinishView = require("scripts/views/finishView.js")
const DiffInspectorView = require("scripts/interfaces/fpa/diffInspectorView.js")
const ExAiView = require("scripts/interfaces/fpa/exAiView.js")
const AnnouncerView = require("scripts/interfaces/announcerView.js")
const ScoreboardView = require("scripts/interfaces/scoreboardView.js")
const OldExView = require("scripts/interfaces/old/oldExView.js")
const OldAiView = require("scripts/interfaces/old/oldAiView.js")
const OldDiffView = require("scripts/interfaces/old/oldDiffView.js")
const StreamView = require("scripts/interfaces/streamView.js")
const BlockPromptView = require("scripts/views/blockPromptView.js")
const CommonAction = require("scripts/actions/commonAction.js")

require("./index.less")

@MobxReact.observer class Main extends React.Component {
    constructor() {
        super()

        MainStore.activeInterface = Enums.EInterface.default

        let startupParam = MainStore.url.searchParams.get("startup")
        for (let interfaceName in Enums.EInterface) {
            if (interfaceName === startupParam) {
                MainStore.activeInterface = Enums.EInterface[interfaceName]
                break
            }
        }

        MainStore.startupTournamentName = MainStore.url.searchParams.get("tournamentName")
        MainStore.tournamentName = MainStore.startupTournamentName
        MainStore.userId = MainStore.url.searchParams.get("userId")
        MainStore.judgeIndex = MainStore.url.searchParams.get("judgeIndex")
        MainStore.judgeIndex = MainStore.judgeIndex !== undefined && parseInt(MainStore.judgeIndex, 10)
        let headerParam = MainStore.url.searchParams.get("header")
        MainStore.showControlsHeader = headerParam !== null && headerParam === "true"
        let lanModeParam = MainStore.url.searchParams.get("lanMode")
        MainStore.lanMode = MainStore.forceLanMode || lanModeParam !== null && lanModeParam === "true"

        DataAction.init()
        Interfaces.init()

        this.state = {
            showFullscreenPrompt: CommonAction.isMobile() && !CommonAction.isiOS()
        }
    }

    isAlertState() {
        return Interfaces.activeInterface.isEditing() || Interfaces.activeInterface.isBackupModeEnabled() ||
            Interfaces.head && Interfaces.head.obs.passiveMode || Interfaces.announcer && !Interfaces.announcer.obs.passiveMode
    }

    render() {
        if (MainStore.activeInterface === Enums.EInterface.stream) {
            return <InterfaceView />
        } else {
            let classname = `mainContainer ${MainStore.showControlsHeader ? "" : "noHeader"} ${this.isAlertState() ? "alertState" : ""}`
            return (
                <div className={classname}>
                    <HeaderView />
                    <InterfaceView />
                    <OverlayView />
                    <FinishView />
                    {
                        this.state.showFullscreenPrompt ? <BlockPromptView promptText="Go Fullscreen" onClick={() => {
                            document.body.requestFullscreen()
                            this.state.showFullscreenPrompt = false
                            this.setState(this.state)
                        }}/> : undefined
                    }
                </div>
            )
        }
    }
}

@MobxReact.observer class HeaderView extends React.Component {
    getInterfaceButtons() {
        let buttons = []
        for (let interfaceName in Enums.EInterface) {
            let interfaceValue = Enums.EInterface[interfaceName]
            if (interfaceValue !== Enums.EInterface.invalid) {
                buttons.push((
                    <button key={interfaceName} onClick={ () => {
                        MainStore.activeInterface = interfaceValue
                    }}>{interfaceName}</button>
                ))
            }
        }

        return buttons
    }

    render() {
        let title = MainStore.tournamentName !== undefined ? MainStore.tournamentName : "Freestyle Players Association Judging System"
        if (MainStore.showControlsHeader) {
            return (
                <div className="headerContainer">
                    {title}
                    {this.getInterfaceButtons()}
                </div>
            )
        } else {
            return <div/>
        }
    }
}

@MobxReact.observer class InterfaceView extends React.Component {
    render() {
        let activeInterface = undefined

        switch (MainStore.activeInterface) {
        case Enums.EInterface.default:
            activeInterface = <DefaultInterface />
            break
        case Enums.EInterface.head:
            activeInterface = <HeadJudgeInterface />
            break
        case Enums.EInterface.ai:
            activeInterface = <AiJudgeInterface />
            break
        case Enums.EInterface.diff:
            activeInterface = <DiffView />
            break
        case Enums.EInterface.ex:
            activeInterface = <ExJudgeInterface />
            break
        case Enums.EInterface.info:
            activeInterface = <InfoView />
            break
        case Enums.EInterface.rank:
            activeInterface = <RankView />
            break
        case Enums.EInterface.variety:
            activeInterface = <VarietyView />
            break
        case Enums.EInterface.diffInspector:
            activeInterface = <DiffInspectorView />
            break
        case Enums.EInterface.exAi:
            activeInterface = <ExAiView />
            break
        case Enums.EInterface.announcer:
            activeInterface = <AnnouncerView />
            break
        case Enums.EInterface.scoreboard:
            activeInterface = <ScoreboardView />
            break
        case Enums.EInterface.oldEx:
            activeInterface = <OldExView />
            break
        case Enums.EInterface.oldAi:
            activeInterface = <OldAiView />
            break
        case Enums.EInterface.oldDiff:
            activeInterface = <OldDiffView />
            break
        case Enums.EInterface.stream:
            activeInterface = <StreamView />
            break
        }

        return activeInterface
    }
}

class DefaultInterface extends React.Component {
    click(newInterface) {
        MainStore.activeInterface = newInterface
    }

    render() {
        let buttons = Interfaces.list.map((model) => {
            return model.type !== MainStore.activeInterface ?
                <button className="interfaceSelectButton" key={model.type} onClick={() => {this.click(model.type)}}>{model.name}</button> : undefined
        })
        return (
            <div className="defaultInterfaceContainer">
                {buttons}
            </div>
        )
    }
}

class AiJudgeInterface extends React.Component {
    constructor() {
        super()

        this.name = "Artistic Impression Judge"
        this.type = Enums.EInterface.head
    }

    render() {
        return <div>Artistic Impression Judge</div>
    }
}

class ExJudgeInterface extends React.Component {
    constructor() {
        super()

        this.name = "Execution Judge"
        this.type = Enums.EInterface.head
    }

    render() {
        return <div>Execution Judge</div>
    }
}

ReactDOM.render(
    <Main />,
    document.getElementById("mount")
)
