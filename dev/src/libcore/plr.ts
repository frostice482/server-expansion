import { SimulatedPlayer } from "mojang-gametest";
import { DynamicPropertiesDefinition, EntityTypes, Player, world } from "mojang-minecraft";
import eventManager, { MapEventList } from "./evmngr.js";
import { execCmd } from "./mc.js";
import { sendMsgToPlayer } from "./sendChat.js";
import server from "./server.js";

export default class plr {
    static get ev() { return events }
    static get events() { return events }

    protected constructor() { throw new TypeError('Class is not constructable') }
}

// property, uid, player register stuff
world.events.worldInitialize.subscribe(({propertyRegistry}) => {
    const regPlr = new DynamicPropertiesDefinition
    regPlr.defineNumber('PLR:uid')
    propertyRegistry.registerEntityTypeDynamicProperties(regPlr, EntityTypes.get('player'))
    
    const regWorld = new DynamicPropertiesDefinition
    regWorld.defineNumber('PLR:uidc')
    propertyRegistry.registerWorldDynamicProperties(regWorld)

    world.setDynamicProperty('PLR:uidc', world.getDynamicProperty('PLR:uidc') ?? 1)
})

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
            return this.getDynamicProperty('PLR:uid')
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

server.ev.playerJoin.subscribe((plr) => {
    if (plr.getDynamicProperty('PLR:uid') == undefined) {
        const nuid = world.getDynamicProperty('PLR:uidc') as number
        plr.setDynamicProperty('PLR:uid', nuid)
        world.setDynamicProperty('PLR:uidc', nuid + 1)

        triggerEvent.playerRegister(plr)
    }
}, 80)

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
