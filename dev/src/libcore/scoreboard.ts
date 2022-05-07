import * as mc from 'mojang-minecraft'
import { Player } from 'mojang-minecraft'
import { dim, execCmd } from './mc.js'
const { world: { scoreboard: mcsb }, Scoreboard } = mc

const auth = Symbol()

type displaySlot = 'sidebar' | 'list' | 'belowname'

const toExecutable = JSON.stringify

class players {
    #obj: objective

    /**
     * Sets player score to the objective.
     * @param plr Player.
     * @param score Score to be set.
     */
    readonly 'set' = (plr: Player, score: number) => ( void execCmd(`scoreboard players set @s ${this.#obj.execId} ${score}`, plr, true), this )

    /**
     * Adds player score to the objective.
     * @param plr Player.
     * @param score Score to be added.
     */
    readonly add = (plr: Player, score: number) => ( void execCmd(`scoreboard players add @s ${this.#obj.execId} ${score}`, plr, true), this )

    /**
     * Gets player score in the objective.
     * @param plr Player.
     */
    readonly 'get' = (plr: Player) => {
        const v = execCmd(`scoreboard players test @s ${this.#obj.execId} * *`, plr, true).statusMessage.match(/-?\d+/)?.[0]
        return v ? +v : undefined
    }

    /**
     * Test if a player score exists on the objective.
     * @param plr Player.
     */
    readonly exist = (plr: Player) => !execCmd(`scoreboard players test @s ${this.#obj.execId} * *`, plr, true).statusCode

    /**
     * Deletes player score from the objective.
     * @param plr Player.
     */
    readonly delete = (plr: Player) => !execCmd(`scoreboard players reset @s ${this.#obj.execId}`, plr, true).statusCode

    /** Dummies. */
    get dummies() { return this.#obj.dummies }

    constructor(key: typeof auth, obj: objective) {
        if (key !== auth) throw new ReferenceError('Class is not constructable')
        this.#obj = obj
    }
}

class dummies {
    #obj: objective

    /**
     * Sets dummy score to the objective.
     * @param name Dummy name.
     * @param score Score to be set.
     */
    readonly 'set' = (name: string, score: number) => ( void execCmd(`scoreboard players set ${toExecutable(name)} ${this.#obj.execId} ${score}`, dim.o, true), this )

    /**
     * Adds dummy score to the objective.
     * @param name Dummy name.
     * @param score Score to be added.
     */
    readonly add = (name: string, score: number) => ( void execCmd(`scoreboard players add ${toExecutable(name)} ${this.#obj.execId} ${score}`, dim.o, true), this )

    /**
     * Gets dummy score in the objective.
     * @param name Dummy name.
     */
    readonly 'get' = (name: string) => {
        const v = execCmd(`scoreboard players test ${toExecutable(name)} ${this.#obj.execId} * *`, dim.o, true).statusMessage.match(/-?\d+/)?.[0]
        return v ? +v : undefined
    }

    /**
     * Test if a dummy score exists on the objective.
     * @param name Dummy name.
     */
    readonly exist = (name: string) => !execCmd(`scoreboard players test ${toExecutable(name)} ${this.#obj.execId} * *`, dim.o, true).statusCode

    /**
     * Deletes dummy score from the objective.
     * @param name Dummy name.
     */
    readonly delete = (name: string) => !execCmd(`scoreboard players reset ${toExecutable(name)} ${this.#obj.execId}`, dim.o, true).statusCode

    /** Players. */
    get players() { return this.#obj.players }

    constructor(key: typeof auth, obj: objective) {
        if (key !== auth) throw new ReferenceError('Class is not constructable')
        this.#obj = obj
    }
}

class objective {
    /**
     * Creates a new objective.
     * @param id Objective identifier.
     * @param displayName Objective display name.
     */
    static readonly create = (id: string, displayName = id) => new this(id, displayName, true)

    /**
     * Creates an existing objective.
     * @param id Objective identifier.
     */
    static readonly edit = (id: string) => new this(id, id, false)

    /**
     * Edits an objective, otherwise creates a new one if the objective doesn't exist.
     * @param id Objective identifier.
     */
    static readonly for = (id: string, displayName = id) => new this(id, displayName, !this.exist(id))

    /**
     * Test if an objecitve exists.
     * @param id Objective identifier.
     */
    static readonly exist = (id: string) => {
        id = toExecutable(id)
        try {
            execCmd(`scoreboard objectives add ${id} dummy`)
            execCmd(`scoreboard objectives remove ${id}`)
            return false
        } catch {
            return true
        }
    }

    /**
     * Deletes an objective.
     * @param id Objective identifier.
     */
    static readonly delete = (id: string) => !execCmd(`scoreboard objectives remove ${toExecutable(id)}`, dim.o, true).statusCode

    /**
     * Gets objective list.
     * 
     * @deprecated This function only works in the latest preview.
     * Remove this deprecation mark only when {@link mc.Scoreboard Scoreboard} has been added.
     */
    static readonly getList = () => {
        if (!mcsb) throw new ReferenceError(`Cannot get objective list because module 'mojang-minecraft' doesn't export 'Scoreboard' module.`)
        return mcsb.getObjectives()
    }

    /**
     * Creates a new objective.
     * @param id Objective identifier.
     * @param displayName Objective display name. Only used when creating a new objective.
     * @param create Creates an objective.
     */
    constructor(id: string, displayName = id, create = true) {
        if (id.length > 16) throw new RangeError(`Objective identifier length cannot go more than 16 characters`)
        if (displayName.length > 32) throw new RangeError(`Objective display length cannot go more than 32 characters`)

        const execid = toExecutable(id),
            execDisplay = toExecutable(displayName)

        const exist = objective.exist(id)
        if (create) {
            if (exist) throw new Error(`Objective with ID '${id}' already exists.`)
            execCmd(`scoreboard objectives add ${execid} dummy ${execDisplay}`)
        } else {
            if (!exist) throw new Error(`Objective with ID '${id}' not found.`)
        }

        this.#data = mcsb ? mcsb.getObjective(id) : null
        this.id = id
        this.execId = execid
    }

    /** Objective identifier. */
    readonly id: string
    /** Objective executable identifier, for command usage. */
    readonly execId: string
    /** Scoreboard objective data. */
    readonly #data: mc.ScoreboardObjective
    /**
     * Gets scoreboard display name. 
     * 
     * @deprecated This function only works in the latest preview.
     * Remove this deprecation mark only when {@link mc.Scoreboard Scoreboard} has been added.
     */
    readonly getDisplayName = () => {
        if (!this.#data) throw new ReferenceError(`Cannot get objective list because module 'mojang-minecraft' doesn't export 'Scoreboard' module.`)
        return this.#data.displayName
    }

    /** Dummies. */
    readonly dummies = new dummies(auth, this)
    /** Players. */
    readonly players = new players(auth, this)
    /** Display. */
    readonly display = new display(auth, this)
}

class display {

    /**
     * Sets scoreboard display to the display slot.
     * @param displaySlot Display slot where scoreboard will be displayed at.
     * @param obj Scoreboard.
     */
    static readonly setDisplay = (displaySlot: displaySlot, obj: objective | string) => void execCmd(`scoreboard objectives setdisplay ${displaySlot} ${obj instanceof objective ? obj.execId : toExecutable(obj)}`, dim.o, true)

    /**
     * Clears scoreboard display from the display slot.
     * @param displaySlot Display slot which will be cleared.
     */
    static readonly clearDisplay = (displaySlot: displaySlot) => void execCmd(`scoreboard objectives setdisplay ${displaySlot}`, dim.o, true)

    constructor(key: typeof auth, obj: objective) {
        if (key !== auth) throw new ReferenceError('Class is not constructable')
        this.#obj = obj
    }

    #obj: objective

    /**
     * Sets scoreboard display to the display slot.
     * @param displaySlot Display slot where scoreboard will be displayed at.
     */
    readonly setDisplay = (displaySlot: displaySlot) => void execCmd(`scoreboard objectives setdisplay ${displaySlot} ${this.#obj.execId}`, dim.o, true)

    readonly clearDisplay = display.clearDisplay
}

export default class scoreboard {
    /** Scoreboard display. */
    static readonly display = display
    /** Scoreboard objective. */
    static readonly objective = objective

    protected constructor() { throw new ReferenceError('Class is not constructable') }
}
