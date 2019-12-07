
const Enums = require("scripts/stores/enumStore.js")
const InterfaceModelBase = require("scripts/interfaces/interfaceModelBase.js")

module.exports = class extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Scoreboard"
        this.type = Enums.EInterface.scoreboard
    }

    createResultsData() {
        // unused
    }
}
