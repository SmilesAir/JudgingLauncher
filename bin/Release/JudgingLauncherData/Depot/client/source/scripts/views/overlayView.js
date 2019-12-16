
const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("scripts/stores/mainStore.js")
const DataAction = require("scripts/actions/dataAction.js")
const Interfaces = require("scripts/interfaces/interfaces.js")
const DataStore = require("scripts/stores/dataStore.js")

require("./overlayView.less")

@MobxReact.observer class OverlayView extends React.Component {
    constructor() {
        super()

        this.state = {
            enabled: false
        }
    }

    getHeader() {
        return (
            <div className="header">
                <div>
                    {MainStore.tournamentName}
                </div>
                <div>
                    {MainStore.userId}
                    <button onClick={() => this.onOpenGeneralClick()}>Open General Impression</button>
                </div>
                <div className="headerControlsContainer">
                    <button onClick={() => this.onBackupModeEnableClick()}>{MainStore.interfaceObs.backupModeEnabled ? "Disable Backup Mode" : "Enabled Backup Mode"}</button>
                    <button disabled={!MainStore.interfaceObs.backupModeEnabled} onClick={() => Interfaces.activeInterface.moveToNewerBackup()}>Newer</button>
                    <button disabled={!MainStore.interfaceObs.backupModeEnabled} onClick={() => Interfaces.activeInterface.moveToOlderBackup()}>Older</button>
                </div>
            </div>
        )
    }

    onOpenGeneralClick() {
        this.state.enabled = false
        this.setState(this.state)

        MainStore.isFinishViewShowing = true
    }

    onBackupModeEnableClick() {
        MainStore.interfaceObs.backupModeEnabled = !MainStore.interfaceObs.backupModeEnabled

        if (MainStore.interfaceObs.backupModeEnabled) {
            Interfaces.activeInterface.initBackupMode()
        }
    }

    onTeamSelected(teamIndex) {
        if (teamIndex === MainStore.interfaceObs.playingTeamIndex) {
            MainStore.interfaceObs.editTeamIndex = undefined
        } else {
            MainStore.interfaceObs.editTeamIndex = teamIndex
        }

        Interfaces.activeInterface.fillWithResults()
    }

    getTeamText(playersList, teamIndex) {
        let scoreString = ""
        let results = MainStore.interfaceObs.results
        if (results !== undefined) {
            scoreString = DataStore.dataModel.getOverlaySummary(results, teamIndex)
        }

        return DataAction.getTeamPlayersShort(playersList) + scoreString
    }

    getInfo() {
        let teamViews = []
        if (MainStore.interfaceObs !== undefined && MainStore.interfaceObs.playingPool !== undefined) {
            let key = 0
            teamViews = MainStore.interfaceObs.playingPool.teamList.map((playersList) => {
                let isEditing = MainStore.interfaceObs.editTeamIndex === key
                let isPlaying = MainStore.interfaceObs.playingTeamIndex === key
                let teamIndex = key
                return (
                    <div
                        key={key++}
                        className={`teamContainer ${isPlaying ? "playing" : ""}`}
                        onClick={() => this.onTeamSelected(teamIndex)}>
                        {this.getTeamText(playersList, teamIndex)}{isEditing ? " - EDITING" : ""}
                    </div>
                )
            })
        }

        return (
            <div className="info">
                {teamViews}
            </div>
        )
    }

    getInputComponent() {
        return <div className="overlayInputContainer"
            onClick={(event) => this.onPointerDown(event)}/>
    }

    onPointerDown() {
        if (Interfaces.activeInterface.needShowFinishView) {
            if (this.state.enabled) {
                this.state.enabled = false
                this.setState(this.state)
            } else {
                // Do nothing
            }
        } else {
            this.state.enabled = !this.state.enabled
            this.setState(this.state)
        }
    }

    render() {
        if (this.state.enabled) {
            return (
                <div className="overlayContainer">
                    {this.getInputComponent()}
                    {this.getHeader()}
                    {this.getInfo()}
                </div>
            )
        } else {
            return this.getInputComponent()
        }
    }
}
module.exports = OverlayView
