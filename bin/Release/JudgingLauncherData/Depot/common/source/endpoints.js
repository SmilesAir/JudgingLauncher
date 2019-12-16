

let serverPath = "http://localhost:3000"
let urls = undefined

module.exports.overrideServerPath = function(newPath) {
    urls = {
        CLEAR_POOL_RESULTS: "<path>/tournamentName/<tournamentName>/divisionIndex/<divisionIndex>/roundIndex/<roundIndex>/poolIndex/<poolIndex>/clearPoolResults",
        CREATE_TOURNAMENT: "<path>/createTournament",
        EXPORT_TOURNAMENT_DATA: "<path>/tournamentName/<tournamentName>/importTournamentData",
        GET_ACTIVE_TOURNAMENTS: "<path>/getActiveTournaments",
        GET_BACKUP_RESULTS: "<path>/judge/<judge>/time/<time>/getBackupResults",
        GET_CONSTANTS: "https://s3-us-west-2.amazonaws.com/<stage>-completejudging-constants/base-constants.json",
        GET_FPA_SPREADSHEET: "https://s3-us-west-2.amazonaws.com/completejudging-<stage>/AutoImportScoresheets.xlsm",
        GET_PLAYING_POOL: "<path>/tournamentName/<tournamentName>/getPlayingPool",
        GET_POOL_RESULTS: "<path>/tournamentName/<tournamentName>/divisionIndex/<divisionIndex>/roundIndex/<roundIndex>/poolIndex/<poolIndex>/getPoolResults",
        GET_S3_RESULTS: "https://s3-us-west-2.amazonaws.com/<stage>-completejudging-results/<tournamentName>-results.json",
        IMPORT_TOURNAMENT_DATA: "<path>/tournamentName/<tournamentName>/exportTournamentData",
        REQUEST_EXPORT_TOURNAMENT_DATA: newPath + "/tournamentName/<tournamentName>/exportTournamentDataToAWS",
        REQUEST_IMPORT_TOURNAMENT_DATA: newPath + "/tournamentName/<tournamentName>/importTournamentDataFromAWS",
        REQUEST_TOURNAMENT_INFO: newPath + "/tournamentName/<tournamentName>/requestTournamentInfoFromServer",
        REPORT_JUDGE_SCORE: "<path>/reportJudgeScore",
        SET_JUDGE_STATE: "<path>/tournamentName/<tournamentName>/setJudgeState",
        SET_PLAYING_POOL: "<path>/tournamentName/<tournamentName>/setPlayingPool",
        SET_SCOREBOARD_DATA: "<pathAws>/tournamentName/<tournamentName>/setScoreboardData",
        STOP_PLAYING_POOLS: "<path>/tournamentName/<tournamentName>/stopPlayingPools"
    }

    serverPath = newPath
}

module.exports.overrideServerPath(serverPath)

module.exports.buildUrl = function(lanMode, key, pathParams, queryParams) {
    let path = undefined
    let pathAws = __STAGE__ === "DEVELOPMENT" ? "https://0uzw9x3t5g.execute-api.us-west-2.amazonaws.com" : "https://w0wkbj0dd9.execute-api.us-west-2.amazonaws.com"
    pathAws += `/${__STAGE__.toLowerCase()}`
    if (lanMode) {
        path = serverPath
    } else {
        path = pathAws
    }

    let pathReplaceData = {
        "path": path,
        "pathAws": pathAws,
        "stage": __STAGE__.toLowerCase()
    }

    Object.assign(pathReplaceData, pathParams)

    let url = urls[key]
    for (let wildName in pathReplaceData) {
        url = url.replace(`<${wildName}>`, pathReplaceData[wildName])
    }

    let firstQueryParam = true
    for (let paramName in queryParams) {
        let prefix = firstQueryParam ? "?" : "&"
        firstQueryParam = false

        url += `${prefix}${paramName}=${queryParams[paramName]}`
    }

    return url
}
