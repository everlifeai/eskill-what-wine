'use strict'
require('dotenv').config()

const cote = require('cote')({statusLogsEnabled:false})
const u = require('elife-utils')
const request = require('request')

/*      understand/
 * This is the main entry point where we start.
 *
 *      outcome/
 * Start our microservice and register with the communication manager.
 */
function main() {
    startMicroservice()
    registerWithCommMgr()
}

const commMgrClient = new cote.Requester({
    name: 'What-Wine -> CommMgr',
    key: 'everlife-communication-svc',
})

function sendReply(msg, req) {
    req.type = 'reply'
    req.msg = msg
    commMgrClient.send(req, (err) => {
        if(err) u.showErr(err)
    })
}

let msKey = 'everlife-what-wine-demo-svc'
/*      outcome/
 * Register ourselves as a message handler with the communication
 * manager so we can handle requests for wine recommendations.
 */
function registerWithCommMgr() {
    commMgrClient.send({
        type: 'register-msg-handler',
        mskey: msKey,
        mstype: 'msg',
    }, (err) => {
        if(err) u.showErr(err)
    })
}

function startMicroservice() {

    /*      understand/
     * The wine recommendation microservice (partitioned by key to
     * prevent conflicting with other services).
     */
    const calcSvc = new cote.Responder({
        name: 'Everlife Wine Recommendation Service Demo',
        key: msKey,
    })

    /*      outcome/
     * Respond to user messages asking us to for recommendations of wine
     * by asking for the food and then responding to it.
     */
    calcSvc.on('msg', (req, cb) => {
        if(askedForService) {
            askedForService = false
            cb(null, true)
            findWine(req.msg, (err, txt) => {
                if(err) {
                    sendReply("Whoops! Something went wrong!...", req)
                    u.showErr(err)
                } else {
                    sendReply(txt, req)
                }
            })
        } else {
            if(req.msg.toLowerCase().startsWith("what wine ")) {
                askedForService = true
                cb(null, true)
                sendReply("What food would you be eating with the wine?", req)
            } else {
                cb()
            }
        }
    })
}

/*      understand/
 * We keep context here - if the user has asked for our service or not.
 * TODO: Save state in leveldb service
 */
let askedForService;

function findWine(food, cb) {
    let key = process.env.MASHAPE_KEY
    if(!key) {
        cb(`Error! API Key not set for service`)
        return
    }
    let options = {
        url: "https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/food/wine/pairing",
        qs: { food: food },
        headers: {
            "X-Mashape-Key": key,
            "Accept": "application/json",
        },
    }
    request.get(options, (err, res, body) => {
        if(err) cb(err)
        else {
            try {
                let rep = JSON.parse(body)
                if(rep.pairingText) cb(null, rep.pairingText)
                else {
                    u.showMsg(rep)
                    cb(null, `Hmm...No. I don't really know how to pair ${food}`)
                }
            } catch(e) {
                cb(null, 'Oh dear! Something went wrong!')
                u.showErr(e)
            }
        }
    })
    cb(null, "Let me check...")
}

main()

