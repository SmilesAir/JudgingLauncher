
const InterfaceModelBase = require("scripts/interfaces/interfaceModelBase.js")
const Enums = require("scripts/stores/enumStore.js")

module.exports.DefaultModel = class extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Welcome"
        this.type = Enums.EInterface.default
    }
}

class AiJudgeModel extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Artistic Impression Judge"
        this.type = Enums.EInterface.ai
    }
}
module.exports.AiJudgeModel = AiJudgeModel

class ExJudgeModel extends InterfaceModelBase {
    constructor() {
        super()

        this.name = "Execution Judge"
        this.type = Enums.EInterface.ex
    }
}
module.exports.ExJudgeModel = ExJudgeModel
