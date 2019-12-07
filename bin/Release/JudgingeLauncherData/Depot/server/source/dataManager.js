
const fetch = require("node-fetch")
const fs = require("file-system")

const EndpointStore = require("complete-judging-common/source/endpoints.js")


class DataManager {
    constructor() {
        this.tournamentData = undefined

        this.delayedSaveHandle = undefined
        this.lastSaveTime = undefined
        this.saveFrequencyMs = 60 * 1000

        this.loadLatestTournamentDataFromDisk()
    }

    isInited() {
        return this.tournamentData !== undefined
    }

    async init(tournamentName) {
        if (!this.isInited()) {
            await this.importTournamentDataFromAWS(tournamentName)

            this.saveTournamentDataToDisk()
        }
    }

    onDataChanged() {
        let timeSinceLastSaveMs = Date.now() - this.lastSaveTime
        if (this.lastSaveTime === undefined || timeSinceLastSaveMs > this.saveFrequencyMs) {
            this.saveTournamentDataToDisk()
        } else if (this.delayedSaveHandle === undefined) {
            this.delayedSaveHandle = setTimeout(() => {
                this.delayedSaveHandle = undefined
                this.saveTournamentDataToDisk()
            }, this.saveFrequencyMs - timeSinceLastSaveMs)
        }
    }

    saveTournamentDataToDisk() {
        let now = new Date()
        let filename = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}.json`
        let folderName = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}_${now.getHours()}`
        fs.writeFile(`serverData/${folderName}/${filename}`, JSON.stringify(this.tournamentData))

        fs.writeFile("serverData/data.json", JSON.stringify({
            latest: `${folderName}/${filename}`
        }))

        this.lastSaveTime = Date.now()

        console.log("Saved to Disk")
    }

    loadLatestTournamentDataFromDisk() {
        try {
            let data = JSON.parse(fs.readFileSync("serverData/data.json"))
            this.tournamentData = JSON.parse(fs.readFileSync(`serverData/${data.latest}`))

            console.log(`Loaded ${data.latest} for ${this.tournamentData.tournamentKey.tournamentName}`)
        }
        catch(error) {
            console.error("Error loading tournament data:", error)
        }
    }

    importTournamentDataFromAWS(tournamentName) {
        console.log(`-------- Importing ${tournamentName} -----------`)

        return fetch(EndpointStore.buildUrl(false, "IMPORT_TOURNAMENT_DATA", {
            tournamentName: tournamentName
        }), {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            return response.json()
        }).then((response) => {
            this.tournamentData = response

            this.onDataChanged()

            return response
        }).catch((error) => {
            console.log("Import Tournament Data Error", error)
        })
    }

    exportTournamentDataToAWS(tournamentName) {
        return fetch(EndpointStore.buildUrl(false, "EXPORT_TOURNAMENT_DATA", {
            tournamentName: tournamentName
        }), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(this.tournamentData)
        }).catch((error) => {
            console.log("Export Tournament Data Error", error)
        })
    }

    getPlayingPool(isAlt) {
        let poolKey = isAlt ? this.tournamentData.tournamentKey.playingPoolKeyAlt : this.tournamentData.tournamentKey.playingPoolKey
        return this.tournamentData && this.tournamentData.poolMap[poolKey]
    }

    async getTournamentInfo(tournamentName) {
        await this.init(tournamentName)

        return this.tournamentData && this.tournamentData.tournamentInfo
    }

    async getTournamentKey(tournamentName) {
        await this.init(tournamentName)

        return this.tournamentData && this.tournamentData.tournamentKey
    }

    getPoolItem(poolKey) {
        if (this.tournamentData !== undefined) {
            return this.tournamentData.poolMap[poolKey]
        }
    }

    setPoolItem(pool) {
        if (this.tournamentData !== undefined) {
            this.tournamentData.poolMap[pool.key] = pool

            this.onDataChanged()
        }
    }

    getResultItem(resultsKey) {
        if (this.tournamentData !== undefined) {
            return this.tournamentData.resultsMap[resultsKey.judgeName][resultsKey.time.toString()]
        }
    }

    async updateActivePoolAttribute(tournamentName, attributeName, attributeValue, isAlt) {
        await this.init(tournamentName)

        if (this.tournamentData !== undefined) {
            let pool = this.getPlayingPool(isAlt)
            if (pool !== undefined) {
                pool[attributeName] = attributeValue

                this.onDataChanged()
            }
        }
    }

    async updatePoolAttribute(tournamentName, poolKey, attributeName, attributeValue) {
        await this.init(tournamentName)

        if (this.tournamentData !== undefined) {
            let pool = this.getPoolItem(poolKey)
            if (pool !== undefined) {
                pool[attributeName] = attributeValue

                this.onDataChanged()
            }
        }
    }

    setResults(judgeName, time, results) {
        if (this.tournamentData !== undefined) {
            this.tournamentData.resultsMap[judgeName] = this.tournamentData.resultsMap[judgeName] || {}
            this.tournamentData.resultsMap[judgeName][time.toString()] = {
                data: results,
                judgeName: judgeName,
                time: time
            }

            this.onDataChanged()
        }
    }

    async updateTournamentKeyWithObject(tournamentName, newObject) {
        await this.init(tournamentName)

        if (this.tournamentData !== undefined) {
            let tournamentKey = await this.getTournamentKey(tournamentName)
            if (tournamentKey !== undefined) {
                for (let key in newObject) {
                    tournamentKey[key] = newObject[key]

                    this.onDataChanged()
                }
            }
        }
    }

    async updateTournamentKeyPlayingPool(tournamentName, playingPoolKey) {
        await this.init(tournamentName)

        if (this.tournamentData !== undefined) {
            let tournamentKey = await this.getTournamentKey(tournamentName)
            if (tournamentKey !== undefined) {
                tournamentKey.playingPoolKey = playingPoolKey

                this.onDataChanged()
            }
        }
    }

    async setJudgeState(tournamentName, judgeId, status, isAlt) {
        await this.init(tournamentName)

        if (this.tournamentData !== undefined) {
            let pool = this.getPlayingPool(isAlt)
            if (pool !== undefined) {
                pool.data.state = pool.data.state || {}
                pool.data.state[judgeId] = {
                    status: status
                }

                this.onDataChanged()
            }
        }
    }
}

module.exports = new DataManager()
