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
        data: `message=${message}`
    })
    .then(function(response) {
        console.log(response.data)
    })
    .catch(function(error) {
        console.log(error)
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
        //console.log(data.rows[0].current_land)
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
        const commission = db[user].commission
        const landInfo = await getLandInfo(landId)
        if(landInfo.commission !== commission) {
            console.log(`${user} mining on land ${landId}: Commission changed! ${commission}} => ${landIngo.commission}`)
            await notifyLine(`${user} mining on land ${landId}: Commission changed! ${commission}} => ${landIngo.commission}`)
        } else {
            console.log(`${user} mining on land ${landId}: Commission ok!`)
        }
    }
}

const initializeData = async (users) => {
    for(let user of users) {
        const userLandId = await getLand(user)
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
    setTimeout(runloop, cooldownTime) //every 20 min check
}

(async () => {
    await initializeData(accounts)
    runloop()
})()