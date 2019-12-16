const express = require("express")
const router = express.Router()

const DataManager = require("../source/dataManager.js")
const Common = require("complete-judging-common/source/backendCommon.js")

console.log("")
console.log("")
console.log("##################################################")
console.log("Startup Finished. Ready to go!")
console.log("##################################################")

let invokeCountHistory = []
let historyCount = 10
let historyIndex = 0
let invokeCount = 0
setInterval(() => {
    invokeCountHistory[historyIndex++ % historyCount] = invokeCount
    invokeCount = 0

    let avg = 0
    for (let c of invokeCountHistory) {
        avg += c
    }
    avg /= invokeCountHistory.length

    //console.log(`Avg invoke count: ${avg.toFixed(2)} per second`)
}, 500);

router.post("/tournamentName/:tournamentName/importTournamentDataFromAWS", async (req, res) => {
    ++invokeCount
    res.json(await DataManager.importTournamentDataFromAWS(req.params.tournamentName))
})

router.get("/tournamentName/:tournamentName/requestTournamentInfoFromServer", async (req, res) => {
    ++invokeCount
    res.json(await DataManager.getTournamentInfo(req.params.tournamentName))
})

router.post("/tournamentName/:tournamentName/exportTournamentDataToAWS", async (req, res) => {
    ++invokeCount
    await DataManager.exportTournamentDataToAWS(req.params.tournamentName)

    res.json({
        success: true
    })
})

router.get("/tournamentName/:tournamentName/getPlayingPool", async (req, res) => {
    ++invokeCount
    res.json(await Common.getActivePool(req.params.tournamentName, req.query.isAlt === "true"))
})

router.get("/tournamentName/:tournamentName/divisionIndex/:divisionIndex/roundIndex/:roundIndex/poolIndex/:poolIndex/getPoolResults", async (req, res) => {
    ++invokeCount
    let data = await Common.getPoolResults(req.params.tournamentName,
        req.params.divisionIndex,
        req.params.roundIndex,
        req.params.poolIndex)
    res.json(data)
})

router.post("/reportJudgeScore", async (req, res) => {
    ++invokeCount
    if (req.body.tournamentName !== undefined &&
        req.body.judgeId !== undefined &&
        req.body.results !== undefined) {

        await Common.reportJudgeScore(req.body.tournamentName, req.body.judgeId, req.body.results)

        res.json({
            success: true
        })
    } else {
        res.json({
            success: false
        })
    }
})

router.post("/tournamentName/:tournamentName/setPlayingPool", async (req, res) => {
    ++invokeCount
    if (req.body.data !== undefined) {
        await Common.setPlayingPool(req.params.tournamentName, req.body.data)
    }

    if (req.body.dataAlt !== undefined) {
        await Common.setPlayingPool(req.params.tournamentName, req.body.dataAlt)
    }

    res.json({
        success: true
    })
})

router.post("/tournamentName/:tournamentName/setJudgeState", async (req, res) => {
    ++invokeCount
    await Common.setJudgeState(req.params.tournamentName, req.body.judgeId, req.body.status, req.body.isAlt)

    res.json({
        success: true
    })
})

router.post("/tournamentName/:tournamentName/divisionIndex/:divisionIndex/roundIndex/:roundIndex/poolIndex/:poolIndex/clearPoolResults", async (req, res) => {
    ++invokeCount
    let data = await Common.clearPoolResults(req.params.tournamentName,
        req.params.divisionIndex,
        req.params.roundIndex,
        req.params.poolIndex)
    res.json(data)
})

router.post("/tournamentName/:tournamentName/stopPlayingPools", async (req, res) => {
    ++invokeCount
    let data = await Common.stopPlayingPools(req.params.tournamentName)
    res.json(data)
})

module.exports = router
