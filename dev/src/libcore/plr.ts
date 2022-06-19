import { SimulatedPlayer } from "mojang-gametest";
import { Entity, Player, world } from "mojang-minecraft";
import eventManager, { MapEventList } from "./evmngr.js";
import { execCmd } from "./mc.js";
import scoreboard from "./scoreboard.js";
import { sendMsgToPlayer } from "./sendChat.js";
import server from "./server.js";
import storage from "./storage.js";

export default class plr {
    static get ev() { return events }
    static get events() { return events }

    protected constructor() { throw new TypeError('Class is not constructable') }
}

// Player UID
let uidsb: typeof scoreboard.objective.prototype
server.ev.postInitialize.subscribe(() => {
    uidsb = scoreboard.objective.for(`UID:${storage.instance.default.uniqueID}`)
    uidsb.dummies.add('__current__', 0)
})

// Extending player properties
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
            return uidsb ? uidsb.players.get(this) : -1
        }
    },
    sendMsg: {
        value: function sendMsg(msg) {
            sendMsgToPlayer(this, msg)
        }
    }
})
Object.defineProperties(SimulatedPlayer.prototype, {
    sendMsg: {
        value: function sendMsg(msg) {
            sendMsgToPlayer(this, msg)
        }
    }
})

// instance
Object.defineProperty(Player, Symbol.hasInstance, { value: (v) => Object.getPrototypeOf(v).constructor == SimulatedPlayer })
Object.defineProperty(Entity, Symbol.hasInstance, { value: (v) => [ SimulatedPlayer, Player ].includes(Object.getPrototypeOf(v).constructor) })

// event stuff
type EventList = MapEventList<{
    nametagChange: (evd: nametagChangeEvd) => void
    playerRegister: (evd: Player) => void
}>

const { events, triggerEvent } = new eventManager<EventList>(['nametagChange', 'playerRegister'], 'plr')

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

const { nameTag: snameTagDesc } = Object.getOwnPropertyDescriptors(SimulatedPlayer.prototype)
Object.defineProperties(SimulatedPlayer.prototype, {
    nameTag: {
        set: function nametagSet(v) {
            const evd: nametagChangeEvd = {
                plr: this,
                cancel: false,
                nameTag: v
            }
            triggerEvent.nametagChange(evd)
            if (!evd.cancel) snameTagDesc.set.call(this, evd.nameTag)
        }
    }
})

server.ev.playerLoad.subscribe((plr) => {
    if (!uidsb.players.exist(plr)) {
        uidsb.players.set(plr, uidsb.dummies.get('__current__'))
        uidsb.dummies.add('__current__', 1)

        triggerEvent.playerRegister(plr)
    }
}, 80)
