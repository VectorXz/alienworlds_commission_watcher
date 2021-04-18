const axios = require('axios')

const token = "YOUR TOKEN"

const db = {}

//define accounts here (multiple accounts is accepted!)
const accounts = ["account1", "account2"]

const cooldownTime = 15 * 60 * 1000 // check every 15 min

const notifyLine = async (message) => {
    await axios({
        method: "POST",
        url: 'https://notify-api.line.me/api/notify',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${token}`
        },
        data: querystring.stringify({
            message: `${message}`,
        })
    })
    .then(function(response) {
        console.log(response.data)
    })
    .catch(function(error) {
        console.log(error.data)
    })
}

const getLand = async (user) => {
    const landId = await axios.post('https://chain.wax.io/v1/chain/get_table_rows',
        {json: true, code: "m.federation", scope: "m.federation", table: 'miners', lower_bound: user, upper_bound: user}
    ).then(({data}) => {
        if(data.rows.length === 0) {
            console.log("Miner not found!")
            return "MINER_NOT_FOUND"
        }
        return data.rows[0].current_land
    }).catch((err) => {
        console.log("Cannot get land!")
        return null
    })
    //console.log(landId)
    return landId
}

const getLandInfo = async (landId) => {
    const land_info = await axios.get(`https://wax.api.atomicassets.io/atomicassets/v1/assets/${landId}`)
    .then(({data}) => {
        return {
            commission: data.data.data.commission/100,
            name: data.data.data.name,
            x: data.data.data.x,
            y: data.data.data.y
        }
    }).catch((err) => {
        console.log("Error")
        console.log(err)
    })
    return land_info
}

const checkCommission = async (users) => {
    for (let user of users) {
        const landId = db[user].landId
        const checkLandId = await getLand(user)
        if(landId !== checkLandId) {
            console.log("Land ID changed!")
            const newLandInfo = await getLandInfo(checkLandId)
            newLandInfo["landId"] = checkLandId
            db[user] = newLandInfo
            console.log(`${user} changed mining land from ${landId} to ${checkLandId}`)
            console.log(`[${db[user].landId}]: ${db[user].name}(${db[user].x},${db[user].y}) | Commission: ${db[user].commission}%`)
            await notifyLine(`${user} changed mining land from ${landId} to ${checkLandId}\n[${db[user].landId}]: ${db[user].name}(${db[user].x},${db[user].y}) | Commission: ${db[user].commission}%`)
            continue
        }
        const commission = db[user].commission
        const landInfo = await getLandInfo(landId)
        if(landInfo.commission !== commission) {
            console.log(`${user} mining on land ${landId}: Commission changed! ${commission}} => ${landIngo.commission}`)
            console.log(`[${landId}]: ${db[user].name}(${db[user].x},${db[user].y}) | Commission: ${landInfo.commission}%`)
            await notifyLine(`${user} mining on land ${landId}: Commission changed! ${commission}} => ${landIngo.commission}\n[${landId}]: ${db[user].name}(${db[user].x},${db[user].y}) | Commission: ${landInfo.commission}%`)
            db[user].commission = landInfo.commission
        } else {
            console.log(`${user} mining on land ${landId}: Commission ok!`)
            console.log(`[${landId}]: ${db[user].name}(${db[user].x},${db[user].y}) | Commission: ${landInfo.commission}%`)
        }
    }
}

const initializeData = async (users) => {
    for(let user of users) {
        const userLandId = await getLand(user)
        if (userLandId === "MINER_NOT_FOUND") {
            console.log(`Miner ${user} not found!`)
            continue
        }
        const landInfo = await getLandInfo(userLandId)
        //console.log(landInfo)
        landInfo["landId"] = userLandId
        db[user] = landInfo
    }
    console.log("Initialize success!")
    console.log(db)
}

const runloop = async () => {
    console.log(`Checking on ${new Date()}`)
    await checkCommission(accounts)
    console.log(`Next Checking Time on ${new Date(new Date().getTime() + cooldownTime)}`)
    setTimeout(runloop, cooldownTime)
}

(async () => {
    await initializeData(accounts)
    runloop()
})()