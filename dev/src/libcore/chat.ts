import { Player } from "mojang-minecraft"
import eventManager, { MapEventList } from "./evmngr.js"
import server from "./server.js"

export default class chat {
    static get ev() { return events }
    static get events() { return events }
}

// properties
Object.defineProperties(Player.prototype, {
    nickname: {
        get: function() { return this.__nickname },
        set: function(v) { nicknameChangeFn(this, v) }
    }
})

// event stuff
type EventList = MapEventList<{
    nicknameChange: (plr: nicknameChangeEvent) => void
}>

const { events, triggerEvent } = new eventManager<EventList>(['nicknameChange'], 'chat')

type nicknameChangeEvent = {
    /** Player whose nickname has been changed. */
    readonly plr: Player
    /** New Nnickname that will be applied to the player. */
    nickname: string
    /** Cancels the event. */
    cancel: boolean
}

const nicknameChangeFn = (plr: Player, nickname: string) => {
    const evd: nicknameChangeEvent = {
        plr,
        nickname,
        cancel: false
    }
    triggerEvent.nicknameChange(evd)

    if (!evd.cancel) plr.__nickname = evd.nickname
}

server.ev.playerJoin.subscribe((plr) => {
    plr.__nickname = plr.nameTag
    nicknameChangeFn(plr, plr.nameTag)
}, 90)
