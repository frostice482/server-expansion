import { Player } from "mojang-minecraft";
import eventManager, { MapEventList } from "./evmngr.js";
import { execCmd } from "./mc.js";
import scoreboard from "./scoreboard.js";
import server from "./server.js";

export default class plr {
    static get ev() { return events }
    static get events() { return events }

    protected constructor() { throw new TypeError('Class is not constructable') }
}

// scoreboard
const uidObj = scoreboard.objective.for('_se_uid')
if (!uidObj.dummies.exist('_current')) uidObj.dummies.set('_current', 0)

// property, uid, player register stuff
Object.defineProperties(Player.prototype, {
    level: {
        get: function getLevel() {
            return execCmd(`xp 0`, this, true).level
        },
        set: function setLevel(v) {
            execCmd(`xp -32767l`, this, true)
            execCmd(`xp ${v}l`, this, true)
        }
    },
    uid: {
        get: function getUID() {
            return uidObj.players.get(this)
        }
    }
})

server.ev.playerJoin.subscribe((plr) => {
    if (!uidObj.players.exist(plr)) {
        uidObj.dummies.add('_current', 1)

        const newUID = uidObj.dummies.get('_current')
        uidObj.players.set(plr, newUID)

        const evd: playerRegisterEvd = {
            plr,
            uid: newUID
        }
        triggerEvent.playerRegister(evd)
    }
    plr.nameTag = plr.nameTag
}, 100)

// event stuff
type EventList = MapEventList<{
    nametagChange: (evd: nametagChangeEvd) => void
    playerRegister: (evd: playerRegisterEvd) => void
}>

const { events, triggerEvent } = new eventManager<EventList>(['nametagChange', 'playerRegister'], 'plr')

type playerRegisterEvd = {
    /** Player that has been registered. */
    readonly plr: Player
    /** Player new UID. */
    readonly uid: number
}

type nametagChangeEvd = {
    /** Player whose nametag has been changed. */
    readonly plr: Player
    /** Cancel. */
    cancel: boolean
    /** New nametag to be applied to the player. */
    nameTag: string
}

const { nameTag: nameTagDesc } = Object.getOwnPropertyDescriptors(Player.prototype)
Object.defineProperties(Player.prototype, {
    nameTag: {
        set: function nametagSet(v) {
            const evd: nametagChangeEvd = {
                plr: this,
                cancel: false,
                nameTag: v
            }
            triggerEvent.nametagChange(evd)
            if (!evd.cancel) nameTagDesc.set.call(this, evd.nameTag)
        }
    }
})
