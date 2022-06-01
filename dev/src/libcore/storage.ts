import { BlockLocation, Dimension, DynamicPropertiesDefinition, EntityTypes, Location, MinecraftDimensionTypes, world } from "mojang-minecraft"
import { dim, execCmd } from "./mc.js"
import scoreboard from "./scoreboard.js"
import server from "./server.js"

export default class storage {
    /** Test if storage is loaded. */
    static get isLoaded() { return loadLevel == 2 }

    /**
     * Executes a function on load.
     * @param fn Function to be executed.
     */
    static readonly onLoad = (fn: () => void) => {
        if (this.isLoaded) fn()
        else loadQueues.push(fn)
    }

    /**
     * Creates a save data.
     * @param id Identifier.
     */
    static readonly create = (id: string) => {
        if (!this.isLoaded) throw new Error(`Storage is not loaded`)
        if (list.exist(id)) throw new ReferenceError(`Save data with ID ${id} already exists`)

        list.add(id, 0)
        return new saveDataInfo(id)
    }

    /**
     * Gets a save data.
     * @param id Identifier.
     */
    static readonly 'get' = (id: string) => {
        if (!this.isLoaded) throw new Error(`Storage is not loaded`)
        return list.exist(id) ? new saveDataInfo(id) : undefined
    }

    /**
     * Gets a save data. Creates a new one if doesn't exist.
     * @param id Identifier.
     */
    static readonly for = (id: string) => this[ this.exist(id) ? 'get' : 'create' ](id)

    /**
     * Test if a save data exists.
     * @param id Identifier.
     */
    static readonly exist = (id: string) => list.exist(id)

    /**
     * Deletes a save data.
     * @param id Identifier.
     */
    static readonly delete = (id: string) => {
        if (!this.isLoaded) throw new Error(`Storage is not loaded`)
        if (!list.exist(id)) return false

        if (slist.exist(id)) execCmd(`structure delete ${ JSON.stringify('SES:' + id) }`, sDim, true) // delete
        list.delete(id)
        slist.delete(id)

        return true
    }
}

class saveDataInfo {
    constructor(id: string) {
        this.id = id
        this.execId = JSON.stringify('SES:' + this.id)

        if (!slist.exist(id)) return
        const l: string[] = []
        execCmd(`structure load ${this.execId} ${xb} ${yb} ${zb}`, sDim, true) // load
        for (const data of sDim.getEntitiesAtBlockLocation(blLoc)) l[data.getDynamicProperty('order') as number] = data.nameTag
        clear()
        this.#value = l.join('')
    }

    /** Save data identifier. */
    readonly id: string
    /** Save data executable identifier. */
    readonly execId: string

    #value: string
    get value() { return this.#value }
    set value(v) {
        if (this.#value == v) return
        this.#value = v
        if (v === undefined) {
            slist.delete(this.id)
            execCmd(`structure delete ${this.execId}`, sDim, true) // delete
        } else {
            slist.add(this.id, 0)
            for (let i = 0, m = v.length / 32767; i < m; i++) {
                const ent = sDim.spawnEntity('se:storage_data', entLoc)
                ent.setDynamicProperty('order', i)
                ent.nameTag = v.substr(i * 32767, 32767)
            }
            execCmd(`structure save ${this.execId} ${xb} ${yb} ${zb} ${xb} ${yb} ${zb} true disk`, sDim, true) // save
        }
    }
}

const clear = () => {
    for (const ent of sDim.getEntitiesAtBlockLocation(blLoc)) {
        ent.teleport(Object.assign(ent.location, {y: 400}), sDim, 0, 0)
        ent.triggerEvent('se:kill')
    }
}

// scoreboards
const cfg = scoreboard.objective.for('SES').dummies,
    list = scoreboard.objective.for('SESlist').dummies,
    slist = scoreboard.objective.for('SESStructList').dummies

// locations
const [x, y, z] = [1572864, 0, 1572864],
    [xc, yc, zc] = [x + 0.5, y + 0.5, z + 0.5]

const loaderLoc = new Location(xc, yc, zc),
    entLoc = new Location(xc, yc + 1, zc),
    [xb, yb, zb] = [x, y + 1, z],
    blLoc = new BlockLocation(xb, yb, zb)

// loading
let loadQueues: (() => void)[] = []
let loadLevel = 0
let load = () => {
    loadLevel++
    if (loadLevel == 2) {
        for (const fn of loadQueues)
            try { fn() }
            catch (e) { console.warn(`storage > onLoad (${ fn.name || '<anonymous>' }): ${ e instanceof Error ? `${e}\n${e.stack}` : e }`) }
    }
}
const dimIndex = {
    [MinecraftDimensionTypes.overworld]: 0,
    [MinecraftDimensionTypes.nether]: 1,
    [MinecraftDimensionTypes.theEnd]: 2,
    0: dim.o,
    1: dim.n,
    2: dim.e,
}
let sDim: Dimension

if (!cfg.exist('isInit'))
    (async () => {
        let tmpLoc: Location, tmpSet = false
        while (true) {
            await server.nextTick
            try {
                const [plr] = world.getPlayers()
                if (!plr) throw 0

                if (!tmpSet) {
                    tmpSet = true
                    tmpLoc = plr.location
                    plr.teleport(loaderLoc, plr.dimension, 0, 0)
                }

                const pDim = plr.dimension

                const ent = pDim.spawnEntity('se:storage_loader', loaderLoc)
                execCmd(`setblock ~~~ air`, ent, true)

                cfg.set('isInit', 1)
                sDim = pDim
                cfg.set('dim', dimIndex[pDim.id])

                load()

                plr.teleport(tmpLoc, pDim, 0, 0)
                break
            } catch (e) {}
        }
    })()
else {
    sDim = dimIndex[cfg.get('dim')]
    load()
}

world.events.worldInitialize.subscribe(({propertyRegistry}) => {
    const dataEnt = EntityTypes.get('se:storage_data'),
        dataDefs = new DynamicPropertiesDefinition()
    dataDefs.defineNumber('order')
    propertyRegistry.registerEntityTypeDynamicProperties(dataDefs, dataEnt)

    load()
})
