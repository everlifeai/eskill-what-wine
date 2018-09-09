'use strict'
const cote = require('cote')
const u = require('elife-utils')

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
            }
        }
    })
}

/*      understand/
 * We keep context here - if the user has asked for our service or not.
 * TODO: Save state in leveldb service
 */
let askedForService;

function findWine(msg, cb) {
    cb(null, "Drink responsibly!")
}

main()

