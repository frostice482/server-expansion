// stub

import { Player } from "mojang-minecraft"
import eventManager, { MapEventList } from "./evmngr.js"
import server from "./server.js"

// event stuff
type EventList = MapEventList<{
    nicknameChange: (plr: nicknameChangeEvent) => void
}>

const { events, triggerEvent } = new eventManager<EventList>(['nicknameChange'], 'role')

type nicknameChangeEvent = {
    /** Player whose nickname has been changed. */
    readonly plr: Player
    /** New Nnickname that will be applied to the player. */
    nickname: string
    /** Cancels the event. */
    cancel: boolean
}

Object.defineProperties(Player.prototype, {
    nickname: {
        get: function() { return this.__nickname },
        set: function(v) { nicknameChangeFn(this, v) }
    }
})

const nicknameChangeFn = (plr: Player, nickname: string) => {
    const evd: nicknameChangeEvent = {
        plr,
        nickname,
        cancel: false
    }
    triggerEvent.nicknameChange(evd)

    if (!evd.cancel) plr.__nickname = evd.nickname
}

server.ev.playerJoin.subscribe((plr) => nicknameChangeFn(plr, plr.nameTag))

export default class chat {
    static readonly ev = events
    static readonly events = events
}
