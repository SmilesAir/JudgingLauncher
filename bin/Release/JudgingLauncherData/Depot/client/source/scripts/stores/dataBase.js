
module.exports.class = class DataBase {
    constructor() {
        this.general = 0
    }
}

module.exports.calcCommonScore = function(data) {
    return data.general !== undefined ? data.general / 4 : 0
}
