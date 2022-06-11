import { SimulatedPlayer } from "mojang-gametest"
import { Player, world } from "mojang-minecraft"
import eventManager, { MapEventList } from "./evmngr.js"
import { empty } from "./misc.js"
import role from "./role.js"
import { sendMsgToPlayer, sendMsgToPlayers } from "./sendChat.js"
import server from "./server.js"

export default class chat {
    static get ev() { return events }
    static get events() { return events }

    static get group() { return chatGroup }

    /**
     * Sends a message.
     * @param plr Player.
     * @param message Message.
     */
    static readonly send = (plr: Player, message: string) => {
        const group = chatGroup.getGroup(plr),
            target = chatGroup.IteratorGetGroupTargets(group)

        const evd: chatEvent = {
            group,
            sender: plr,
            message,
            targets: target,
            cancelLevel: group?.defaultCancelLevel ?? 0,
            cancelMessage: group?.defaultCancelMessage ?? null
        }
        triggerEvent.chat(evd)

        const formattedMessage = role.format(plr, 'message', message)

        switch (evd.cancelLevel) {
            case 0: sendMsgToPlayers(evd.targets, formattedMessage); break
            case 1: sendMsgToPlayer(plr, formattedMessage); break
            case 2: if (evd.cancelMessage) sendMsgToPlayer(plr, evd.cancelMessage); break
        }
    }

    protected constructor() { throw new TypeError('Class is not constructable') }
}

// chat group
type chatGroupTagFilter = { [k in 'all' | 'any' | 'none']?: chatGroupTagFilter } | string[]

/**
 * Message cancel level.
 * 
 * `0` - Do not cancel the message.
 * 
 * `1` - Cancels the message for everyone except the sender. (shadow mute)
 * 
 * `1` - Cancels the message for everyone including the sender.
 * If `cancelMessage` is set, it will send the cancel message to the player.
 */
type messageCancelLevel = 0 | 1 | 2

type chatGroupJSONData = {
    readonly id: string
    priority: number
    tagFilter: chatGroupTagFilter
    defaultCancelLevel: messageCancelLevel
    defaultCancelMessage: string
}

class chatGroup {
    /**
     * Gets a chat group.
     * @param id Chat group identifier.
     */
    static readonly 'get' = (id: string) => groupList.get(id)

    /**
     * Gets chat group list.
     */
     static readonly getList = () => groupList.values()

    /**
     * Checks if a chat group exists.
     * @param id chat group identifier.
     */
    static readonly exist = (id: string) => groupList.has(id)

    /**
     * Deletes a chat group.
     * @param id chat group identifier.
     */
    static readonly delete = (id: string) => groupList.delete(id)

    /**
     * Gets group from player.
     * @param plr Player.
     */
    static readonly getGroup = (plr: Player) => {
        for (const group of [...groupList.values()].sort((a, b) => b.priority - a.priority))
            if (this.testGroupFilter(group, plr)) return group
    }

    /**
     * Gets group targets.
     * @param group Group.
     */
    static readonly getGroupTargets = (group: chatGroup) => {
        if (!group) return []
        const o: Player[] = []
        for (const plr of world.getPlayers())
            if (this.testGroupFilter(group, plr)) o.push(plr)
        return o
    }

    /**
     * Gets group targets with iterator.
     * @param group Group.
     */
    static readonly IteratorGetGroupTargets = function* (group: chatGroup) {
        if (!group) return
        for (const plr of world.getPlayers())
            if (chatGroup.testGroupFilter(group, plr)) yield plr
    }

    /**
     * Test group filter against the player.
     * @param group Chat group.
     * @param plr Player.
     * @returns A value between 0 and 1.
     */
    static readonly testGroupFilter = (() => {
        const test = empty({
            all: (v: number) => v == 1,
            any: (v: number) => v > 0,
            none: (v: number) => v == 0,
        })
        const exec = (filter: chatGroupTagFilter, plr: Player) => {
            let testCnt = 0, success = 0
            
            if (Array.isArray(filter))
                for (const tag of filter) {
                    testCnt++
                    if (plr.hasTag(tag)) success++
                }
            
            else
                for (const k in filter) {
                    if (!(k in test)) continue
                    testCnt++
                    const r = exec(filter[k], plr)
                    if (test[k](r)) success++
                }
            
            return testCnt ? success / testCnt : 1
        }
        /**
         * Test group filter to the player.
         * @param group Chat group.
         * @param plr Player.
         * @returns A value between 0 and 1.
         */
        return (group: chatGroup, plr: Player) => test.all( exec(group.tagFilter, plr) )
    })()

    /**
     * Creates a new chat group from JSON data.
     * @param json JSON data.
     */
    static readonly fromJSON = (json: chatGroupJSONData) => {
        const o = new this(json.id)
        Object.assign(o, json)
        return o
    }

    constructor(id: string, priority?: number, tagFilter?: chatGroupTagFilter) {
        if (groupList.has(id)) throw new ReferenceError(`Chat group with ID '${id}' already exists`)
        this.id = id
        this.priority = priority ?? 1
        this.tagFilter = tagFilter ?? {}
        groupList.set(id, this)
    }

    /** Chat group identifier. */
    readonly id: string
    /** Chat group priority. */
    priority: number
    /** Chat group tag filter. */
    tagFilter: chatGroupTagFilter
    /** Default cancel level for message sending. See {@link messageCancelLevel} */
    defaultCancelLevel: messageCancelLevel = 0
    /** Default cancel message. Only used if `cancelLevel` is set to `2`. */
    defaultCancelMessage: string = null

    /** Gets group targets. */
    readonly getTargets = () => chatGroup.getGroupTargets(this)
    /** Gets group targets in iterator. */
    readonly IteratorGetTargets = () => chatGroup.IteratorGetGroupTargets(this)
    /** Tests group filter against the player. */
    readonly testFilter = (plr: Player) => chatGroup.testGroupFilter(this, plr)

    /** Converts to JSON data. */
    readonly toJSON = (): chatGroupJSONData => {
        const { id, priority, tagFilter, defaultCancelLevel, defaultCancelMessage } = this
        return { id, priority, tagFilter, defaultCancelLevel, defaultCancelMessage }
    }
}

let groupList: Map<string, chatGroup> = new Map

// properties
Object.defineProperties(Player.prototype, {
    nickname: {
        get: function() { return this.__nickname },
        set: function(v) { nicknameChangeFn(this, v) }
    }
})
Object.defineProperties(SimulatedPlayer.prototype, {
    nickname: {
        get: function() { return this.__nickname },
        set: function(v) { nicknameChangeFn(this, v) }
    }
})

// event stuff
type EventList = MapEventList<{
    nicknameChange: (plr: nicknameChangeEvent) => void
    chat: (evd: chatEvent) => void
}>

const { events, triggerEvent } = new eventManager<EventList>(['nicknameChange', 'chat'], 'chat')

type chatEvent = {
    /** Chat group. */
    readonly group: chatGroup
    /** Sender. */
    readonly sender: Player
    /** Message. */
    message: string
    /** Message targets. */
    targets: Iterable<Player>
    /** Cancel level. See {@link messageCancelLevel} */
    cancelLevel: messageCancelLevel
    /** Cancel message. Only used when `cancelLevel` is set to 2. */
    cancelMessage: string
}

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

server.ev.playerJoin.subscribe(plr => plr.__nickname = plr.nameTag, 100)
for (const plr of world.getPlayers()) plr.__nickname = plr.nameTag

// storage stuff
import storage from "./storage.js"

export type saveData = {
    groups: chatGroupJSONData[]
}

storage.instance.default.ev.save.subscribe(function chatSave (data) {
    data.chat = {
        groups: Array.from(groupList.values(), v => v.toJSON())
    }
})
storage.instance.default.ev.load.subscribe(function chatLoad (data) {
    if (!data.chat) return
    groupList.clear()
    groupList = new Map(data.chat.groups.map(v => [ v.id, chatGroup.fromJSON(v) ]))
})
