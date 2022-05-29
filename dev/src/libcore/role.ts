import { Player, world } from "mojang-minecraft";
import chat from "./chat.js";
import eventManager, { MapEventList } from "./evmngr.js";
import { empty } from "./misc.js";
import scoreboard from "./scoreboard.js";
import server from "./server.js";
const { objective } = scoreboard

const auth = Symbol()

export default class role {
    static get ev() { return events }
    static get events() { return events }

    static get group() { return roleGroup }

    /**
     * Format role.
     * @param plr Player.
     * @param formatType Format type. `message` to format player message, `nametag` to format player nametag.
     * @param message Player message.
     */
    static readonly format = (plr: Player, formatType: 'message' | 'nametag' = 'message', message?: string) => {
        let format = config[ formatType == 'message' ? 'messageFormat' : 'nametagFormat' ]

        const vars: formatVariables = empty({
            name: plr.nickname,
            message,
            role: roleGroup.getGroupStyles(plr).join(config.roleGroupStyleSeparator),
            level: plr.level,
            score: Object.assign(
                (obj: string) => {
                    if (!objective.exist(obj)) return 0
                    return objective.edit(obj).players.get(plr) ?? 0
                }, {
                    [Symbol.toPrimitive]: () => ''
                }
            )
        })
        const evd: formatEvd = {
            plr,
            formatType,
            format,
            variables: vars
        }
        triggerEvent.format(evd)

        format = evd.format

        const rx = /((?<!\\)#(?<v>[\w\-]+)(\{(?<c>.*?)\})?)/g
        let execres: RegExpExecArray, replaceList: [replace: string, to: string][] = []
        while ( ( execres = rx.exec(format) ) !== null) {
            const { v, c } = execres.groups,
                m = execres[0],
                o = c ? vars[v](...c.split('|')) : ( vars[v] ?? '' )

            replaceList.push([m, o])
        }

        let o = format
        for (let [r, t] of replaceList) o = o.replace(r, t)
        return o.trim()
    }

    /** Configuration. */
    static get config() { return config }

    protected constructor() { throw new TypeError('Class is not constructable') }
}

// config
let _applyRoleToNametag = true
let config = {
    /** Apply role to nametag. */
    get applyRoleToNametag() {return _applyRoleToNametag},
    set applyRoleToNametag(v) {
        if (_applyRoleToNametag == v) return
        _applyRoleToNametag = v
        if (v) for (const plr of world.getPlayers()) changeNametag(plr, true)
        else for (const plr of world.getPlayers()) plr.nameTag = plr.nickname
    },
    /** Nametag update interval. */
    get nametagUpdateInterval() { return nametagInterval.interval },
    set nametagUpdateInterval(v) { nametagInterval.interval = Math.max( Math.min( v, 120000 ), 30000 ) },
    /** Nametag format. */
    nametagFormat: '#role #name',
    /** Message format. */
    messageFormat: '#role #name: #message',
    /** Role group style separator. */
    roleGroupStyleSeparator: ' '
}

// role groups & role styles
let groupList: Map<string, roleGroup> = new Map

type groupStyleData = [ tag: string, style: string ]

type groupJSONData = {
    readonly id: string
    pos: number
    display: 'always' | 'auto' | 'never'
    defaultStyle: string
    styles: groupStyleData[]
}

class roleGroupStyle {
    #arr: groupStyleData[] = []
    #group: roleGroup

    ;[Symbol.iterator] = (() => {
        const t = this
        return function*() { yield* t.#arr }
    })()

    /**
     * Adds a style at the front (nth index) to the group.
     * @param tag Tag to be applied to the style.
     * @param style Style.
     */
    readonly add = (tag: string, style: string) => ( this.#arr.push([tag, style]), this )

    /**
     * Adds a style at the front (0th index) to the group.
     * @param tag Tag to be applied to the style.
     * @param style Style.
     */
    readonly addFront = (tag: string, style: string) => ( this.#arr.unshift([tag, style]), this )

    /**
     * Adds a style at the specified index to the group.
     * @param index Array index.
     * @param tag Tag to be applied to the style.
     * @param style Style.
     */
    readonly addAt = (index: number, tag: string, style: string) => ( this.#arr.splice(index, 0, [tag, style]), this )

    /**
     * Removes a style at the front (nth index) from the group.
     * @returns Style data.
     */
    readonly remove = () => this.#arr.pop()

    /**
     * Removes a style at the back (0th index) from the group.
     * @returns Style data.
     */
    readonly removeFront = () => this.#arr.shift()

    /**
     * Removes a style at the specified index from the group.
     * @returns Style data.
     */
    readonly removeAt = (index: number) => this.#arr.splice(index, 1)[0]

    get getGroupStyle() { return this.#group.getStyle }

    constructor(key: typeof auth, group: roleGroup) {
        if (key !== auth) throw new TypeError('Class is not constructable')
        this.#group = group
    }
}

class roleGroup {
    /**
     * Gets a role group.
     * @param id Role group identifier.
     */
    static readonly 'get' = (id: string) => {
        if (!groupList.has(id)) throw new ReferenceError(`Role group with ID '${id}' not found`)
        return groupList.get(id)
    }

    /**
     * Checks if a role group exists.
     * @param id Role group identifier.
     */
    static readonly exist = (id: string) => groupList.has(id)

    /**
     * Gets role group list.
     */
    static readonly getList = () => groupList.values()

    /**
     * Deletes a role group.
     * @param id Role group identifier.
     */
    static readonly delete = (id: string) => groupList.delete(id)

    /**
     * Gets group styles from tags / player.
     * @param target Tags or player.
     */
    static readonly getGroupStyles = (target: string[] | Player) => {
        const has = Array.isArray(target) ? target.includes.bind(target) as typeof target.includes : target.hasTag.bind(target) as typeof target.hasTag
        const o: string[] = []
        m:
        for (const group of [...groupList.values()].sort((a, b) => b.pos - a.pos)) {
            if (group.display == 'never') continue
            for (const [t, s] of group.styles)
                if (has(t)) {
                    o.push(s)
                    continue m
                }
            if (group.display == 'always') o.push(group.defaultStyle)
        }
        return o
    }

    /**
     * Creates role group from JSON data.
     * @param json Group JSON data.
     */
    static readonly fromJSON = (json: groupJSONData) => {
        const { id, pos, display, defaultStyle, styles } = json
        const o = new this(id, pos, display, defaultStyle)
        for (let [t, s] of styles) o.styles.add(t, s)
        return o
    }

    /**
     * Creates a role group.
     * @param id Identifier.
     * @param pos Position. See {@link roleGroup.prototype.pos here} for more info.
     * @param display Display. See {@link roleGroup.prototype.display here} for more info.
     * @param defaultStyle Default style. See {@link roleGroup.prototype.defaultStyle here} for more info.
     */
    constructor(id: string, pos?: number, display?: roleGroup['display'], defaultStyle?: string) {
        if (groupList.has(id)) throw new ReferenceError(`Role group with ID '${id}' already exists`)
        this.id = id
        this.pos = pos ?? 1
        this.display = display ?? 'auto'
        this.defaultStyle = defaultStyle ?? ''
        groupList.set(id, this)
    }

    /** Role group identifier. */
    readonly id: string

    /**
     * Role group position.
     * Role groups are ordered from left (highest) to right (lowest).
     */
    pos: number

    /**
     * Role group display.
     * 
     * `always` - Always display the role group.
     * Will use the role group's default style if no group style found.
     * 
     * `auto` - Displays the role group. Default style will be ignored.
     * 
     * `never` - Never displays the role group. Default style will be ignored.
     */
    display: 'always' | 'auto' | 'never'

    /**
     * Default style for the role group.
     * Only used when the role group's visibility is set to `always` and no group style found.
     */
    defaultStyle: string

    /** Role group styles. */
    readonly styles = new roleGroupStyle(auth, this)

    /** Converts group to JSON data. */
    readonly toJSON = (): groupJSONData => {
        const {id, pos, display, defaultStyle} = this
        return { id, pos, display, defaultStyle, styles: [...this.styles] }
    }

    /**
     * Gets group style from tags / player.
     * @param target Tags / player.
     */
    readonly getStyle = (target: string[] | Player) => {
        if (this.display == 'never') return

        const has = Array.isArray(target) ? target.includes.bind(target) as typeof target.includes : target.hasTag.bind(target) as typeof target.hasTag
        for (const [t, s] of this.styles) if (has(t)) return s

        if (this.display == 'always') return this.defaultStyle
    }
}

// event stuff
type EventList = MapEventList<{
    format: (plr: formatEvd) => void
}>

const { events, triggerEvent } = new eventManager<EventList>(['format'], 'role')

const changeNametag = (plr: Player, ignore = false) => {
    if (!ignore && !config.applyRoleToNametag) return
    plr.nameTag = role.format(plr, 'nametag')
}
server.ev.playerJoin.subscribe(plr => changeNametag(plr), 90)
chat.ev.nicknameChange.subscribe(({plr}) => changeNametag(plr), 90)
const nametagInterval = new server.interval(() => { for (const plr of world.getPlayers()) changeNametag(plr) }, 30000)

// format stuff
type formatVariables = {
    [k: string]: any
    /** Player name. */
    name: string
    /** Player message. */
    message?: string
    /** Player role. */
    role: string
    /** Player level. */
    level: number
    /** Player score on a objective. `0` if the player's score isn't set on the objective. */
    score: (obj: string) => number
}

type formatEvd = {
    /** Player. */
    readonly plr: Player
    /** Formattion type. */
    formatType: 'message' | 'nametag'
    /** Format. */
    format: string
    /** Variables. */
    readonly variables: formatVariables
}
