import { ScoreboardIdentityType, ScoreboardObjective, world } from 'mojang-minecraft'
import { Player } from 'mojang-minecraft'
import { dim, execCmd } from './mc.js'

const auth = Symbol()

export default class scoreboard {
    /** Scoreboard display. */
    static get display() { return display }
    /** Scoreboard objective. */
    static get objective() { return objective }

    protected constructor() { throw new TypeError('Class is not constructable') }
}

type displaySlot = 'sidebar' | 'list' | 'belowname'

const toExecutable = JSON.stringify

class objective {
    /**
     * Creates a new objective.
     * @param id Objective identifier. Must be less than or equal to 16 characters.
     * @param displayName Objective display name. Only used when creating a new objective. Must be less than or equal to 32 characters.
     */
    static readonly create = (id: string, displayName = id) => new this(id, displayName, true)

    /**
     * Creates an existing objective.
     * @param id Objective identifier.
     */
    static readonly edit = (id: string) => new this(id, id, false)

    /**
     * Edits an objective, otherwise creates a new one if the objective doesn't exist.
     * @param id Objective identifier. Must be less than or equal to 16 characters.
     * @param displayName Objective display name. Only used when creating a new objective. Must be less than or equal to 32 characters.
     */
    static readonly for = (id: string, displayName = id) => new this(id, displayName, !this.exist(id))

    /**
     * Test if an objecitve exists.
     * @param id Objective identifier.
     * @returns Boolean - True if the objective exists.
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
     * @returns Boolean - True if objective exists and successfully deleted.
     */
    static readonly delete = (id: string) => !execCmd(`scoreboard objectives remove ${toExecutable(id)}`, dim.o, true).statusCode

    /**
     * Gets objective list.
     * @returns Array of objectives.
     */
    static readonly getList = () => world.scoreboard.getObjectives().map(v => this.edit(v.id))

    /**
     * Creates a new objective.
     * @param id Objective identifier. Must be less than or equal to 16 characters.
     * @param displayName Objective display name. Only used when creating a new objective. Must be less than or equal to 32 characters.
     * @param create Determines if an objective should be created or not. If not, edits an existing one.
     */
    constructor(id: string, displayName = id, create = true) {
        if (id.length > 16) throw new RangeError(`Objective identifier length cannot go more than 16 characters`)
        if (displayName.length > 32) throw new RangeError(`Objective display length cannot go more than 32 characters`)

        const execid = toExecutable(id),
            execDisplay = toExecutable(displayName)

        const exist = objective.exist(id)
        if (create) {
            if (exist) throw new TypeError(`Objective with ID '${id}' already exists.`)
            execCmd(`scoreboard objectives add ${execid} dummy ${execDisplay}`)
        } else {
            if (!exist) throw new ReferenceError(`Objective with ID '${id}' not found.`)
        }

        this.id = id
        this.execId = execid
        this.#data = world.scoreboard.getObjective(id)
        this.dummies = new dummies(auth, this, this.#data)
        this.players = new players(auth, this, this.#data)
    }

    #data: ScoreboardObjective

    /** Objective identifier. */
    readonly id: string
    /** Objective executable identifier. */
    readonly execId: string
    /** Objective display name. */
    get displayName() { return this.#data.displayName }
    /** Scoreboard objective data. */
    get data() { return this.#data }

    readonly dummies: dummies
    readonly players: players
    readonly display = new display(auth, this)
}

class players {
    constructor(key: typeof auth, obj: objective, data: ScoreboardObjective) {
        if (key !== auth) throw new TypeError('Class is not constructable')
        this.#obj = obj
        this.#data = data
    }

    #obj: objective
    #data: ScoreboardObjective

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
     * @returns Player score.
     */
    readonly 'get' = (plr: Player) => {
        const r = execCmd(`scoreboard players test @s ${this.#obj.execId} * *`, plr, true)
        if (r.statusCode) return // status code must be 0
        return +r.statusMessage.match(/-?\d+/)?.[0]
    }

    /**
     * Test if a player score exists on the objective.
     * @param plr Player.
     * @returns Boolean - True if player is in the score list.
     */
    readonly exist = (plr: Player) => !execCmd(`scoreboard players test @s ${this.#obj.execId} * *`, plr, true).statusCode

    /**
     * Deletes player score from the objective.
     * @param plr Player.
     * @returns Boolean - True if player is in the score list and successfully deleted.
     */
    readonly delete = (plr: Player) => !execCmd(`scoreboard players reset @s ${this.#obj.execId}`, plr, true).statusCode

    /**
     * Gets player scores.
     */
    readonly getScores = (() => {
        const t = this
        return function* () {
            for (const { participant, score } of t.#data.getScores())
                if (participant.type == ScoreboardIdentityType.player)
                    try { yield [participant.getEntity(), score, participant.displayName] as [player: Player, score: number, displayName: string] }
                    catch { yield [null, score, null] as [player: null, score: number, displayName: null] }
        }
    })()
}

class dummies {
    constructor(key: typeof auth, obj: objective, data: ScoreboardObjective) {
        if (key !== auth) throw new TypeError('Class is not constructable')
        this.#obj = obj
        this.#data = data
    }

    #obj: objective
    #data: ScoreboardObjective

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
     * @returns Dummy score.
     */
    readonly 'get' = (name: string) => {
        const r = execCmd(`scoreboard players test ${toExecutable(name)} ${this.#obj.execId} * *`, dim.o, true)
        if (r.statusCode) return // status code must be 0
        return +r.statusMessage.match(/-?\d+/)?.[0]
    }

    /**
     * Test if a dummy score exists on the objective.
     * @param name Dummy name.
     * @returns Boolean - True if dummy is in the score list.
     */
    readonly exist = (name: string) => !execCmd(`scoreboard players test ${toExecutable(name)} ${this.#obj.execId} * *`, dim.o, true).statusCode

    /**
     * Deletes dummy score from the objective.
     * @param name Dummy name.
     * @returns Boolean - True if dummy is in the score list and successfully deleted.
     */
    readonly delete = (name: string) => !execCmd(`scoreboard players reset ${toExecutable(name)} ${this.#obj.execId}`, dim.o, true).statusCode

    /**
     * Gets dummy scores.
     */
    readonly getScores = (() => {
        const t = this
        return function* () {
            for (const { participant, score } of t.#data.getScores())
                if (participant.type == ScoreboardIdentityType.fakePlayer)
                    yield [JSON.parse(`"${participant.displayName}"`), score] as [displayName: string, score: number]
        }
    })()
}

class display {

    /**
     * Sets scoreboard display to the display slot.
     * @param displaySlot Display slot where the scoreboard will be displayed at.
     * @param scoreboard Scoreboard.
     * @returns Boolean - True if display successfully set.
     */
    static readonly setDisplay = (displaySlot: displaySlot, scoreboard: objective | string) => !execCmd(`scoreboard objectives setdisplay ${displaySlot} ${scoreboard instanceof objective ? scoreboard.execId : toExecutable(scoreboard)}`, dim.o, true).statusCode

    /**
     * Clears scoreboard display from the display slot.
     * @param displaySlot Display slot that will be cleared.
     * @returns Boolean - True if display successfully cleared.
     */
    static readonly clearDisplay = (displaySlot: displaySlot) => !execCmd(`scoreboard objectives setdisplay ${displaySlot}`, dim.o, true).statusCode

    constructor(key: typeof auth, obj: objective) {
        if (key !== auth) throw new TypeError('Class is not constructable')
        this.#obj = obj
    }

    #obj: objective

    /**
     * Sets scoreboard display to the display slot.
     * @param displaySlot Display slot where scoreboard will be displayed at.
     * @returns Boolean - True if display successfully set.
     */
    readonly setDisplay = (displaySlot: displaySlot) => !execCmd(`scoreboard objectives setdisplay ${displaySlot} ${this.#obj.execId}`, dim.o, true).statusCode

    readonly clearDisplay = display.clearDisplay
}
