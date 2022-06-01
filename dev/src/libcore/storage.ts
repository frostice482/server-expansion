import { Block, BlockLocation, DynamicPropertiesDefinition, Entity, EntityTypes, Location, MinecraftBlockTypes, world } from "mojang-minecraft"
import { dim, execCmd } from "./mc.js"
import { empty } from "./misc.js"
import scoreboard from "./scoreboard.js"
import server from "./server.js"

export default class storage {
    /** Test if storage is loded or not. */
    static get isLoaded() { return loadLevel == 2 }

    /**
     * Triggers the function on load.
     * @param fn Function to be triggered on load.
     */
    static readonly onLoad = (fn: () => void) => {
        if (loadLevel == 2) fn()
        else eventQueues.load.push(fn)
    }

    /**
     * Creates a property in storage.
     * @param id Identifier.
     */
    static readonly create = (id: string) => {
        if (!this.isLoaded) throw new ReferenceError(`Storage is not fully loaded`)
        if (PosRegistry.exist(id)) throw new ReferenceError(`Property with ID ${id} already exists`)

        const elm = bin.lookupFreeElement()
        if (!elm) throw new RangeError(`Property space is full. Free up some space, or allocate more.`)
        elm.free = false

        PosRegistry.set(id, elm.pos)

        return new storagePropertyInfo(elm)
    }

    /**
     * Gets a property data.
     * @param id Identifier.
     */
    static readonly 'get' = (id: string) => {
        if (!this.isLoaded) throw new ReferenceError(`Storage is not fully loaded`)
        if (!PosRegistry.exist(id)) throw new ReferenceError(`Property with ID ${id} not found`)

        return new storagePropertyInfo(bin.getElementAt(PosRegistry.get(id)))
    }

    /**
     * Gets a property data. Creates a new one if doesn't exist.
     * @param id Identifier.
     */
    static readonly for = (id: string) => this[ PosRegistry.exist(id) ? 'get' : 'create' ](id)

    /**
     * Test if property exists in storage.
     * @param id Identifier.
     */
    static readonly exist = (id: string) => PosRegistry.exist(id)

    /**
     * Deletes a property data in storage.
     * @param id Identifier.
     */
    static readonly delete = (id: string) => {
        if (!this.isLoaded) throw new ReferenceError(`Storage is not fully loaded`)
        if (!PosRegistry.exist(id)) return false

        const pos = PosRegistry.get(id)

        bin.getElementAt(pos).free = true
        clearEntitiesAt(pos)
        PosRegistry.delete(id)

        return true
    }
}

class storagePropertyInfo {
    constructor(elm: typeof BinSearch.element.prototype) {
        this.#elm = elm
        this.pos = elm.pos

        const [x, y, z] = elm.pos

        const [manifestEnt] = dim.o.getEntitiesAtBlockLocation(new BlockLocation(x, y + 1, z))
        const dataEnts = dim.o.getEntitiesAtBlockLocation(new BlockLocation(x, y + 2, z))
        if (!manifestEnt) return

        const segments: List<string, number> = empty()
        let s = ''
        for (const dataEnt of dataEnts) segments[dataEnt.getDynamicProperty('order') as number] = dataEnt.nameTag
        for (let i = 0, m = manifestEnt.getDynamicProperty('length') as number; i < m; i++) s = s.concat(segments[i])

        this.#value = s
    }

    /** Property location. */
    readonly pos: XYZLocation

    #elm: typeof BinSearch.element.prototype
    #value: string

    get value() { return this.#value }
    set value(v) {
        if (this.#value == v) return

        const [x, y, z] = this.pos

        if (v === undefined) clearEntitiesAt(this.pos)
        else {
            if (this.#value !== undefined) clearEntitiesAt(this.pos)
            this.#value = v

            const dataSize = Math.ceil(v.length / 32767)

            const manifestEnt = dim.o.spawnEntity('se:storage_manifest', new Location(x + 0.5, y + 1.5, z + 0.5))
            manifestEnt.setDynamicProperty('length', dataSize)

            const dataLoc = new Location(x + 0.5, y + 2.5, z + 0.5)
            for (let i = 0; i < dataSize; i++) {
                const dataEnt = dim.o.spawnEntity('se:storage_data', dataLoc)
                dataEnt.nameTag = v.substr(i * 32767, 32767)
                dataEnt.setDynamicProperty('order', i)
            }
        }
    }
}

const clearEntitiesAt = ([x, y, z]: XYZLocation) => {
    for (const entManifest of dim.o.getEntitiesAtBlockLocation(new BlockLocation(x, y + 1, z))) {
        entManifest.teleport( Object.assign(entManifest.location, {y: 511}), dim.o, 0, 0 )
        entManifest.triggerEvent('se:kill')
    }
    for (const entData of dim.o.getEntitiesAtBlockLocation(new BlockLocation(x, y + 2, z))) {
        entData.teleport( Object.assign(entData.location, {y: 511}), dim.o, 0, 0 )
        entData.triggerEvent('se:kill')
    }
}

type XYZLocation = [x: number, y: number, z: number]

const BinSearch = (() => {
    class BinSearch {
        static readonly offset = [0, 1, 0] as const

        static get element() {return ElementInfo}
        static get group() {return GroupInfo}
        static get block() {return BlockInfo}

        /**
         * @param startPos Start location.
         * @param spaces Group spaces. 0th index = highest level, nth index = lowest level (before element)
         * @param blockSize Size in block per "block".
         * @param size Size in "block".
         */
        constructor(startPos: XYZLocation, spaces: number[] = [1], size: XYZLocation = [1, 1, 1], blockSize: XYZLocation = [ spaces[0], 2, spaces[0] ]) {
            this.startPos = startPos
            this.spaces = spaces
            this.blockSize = blockSize
            this.size = size

            const { size: [xs, ys, zs], blockSize: [xsb, ysb, zsb], startPos: [xa, ya, za] } = this

            this.lookupFreeElement = (() => {
                const exec = (v: BlockInfo | GroupInfo | BinSearch = this, s = 0) => {
                    for (const d of v) {
                        if (d instanceof ElementInfo) { if (d.free) return d }
                        else if (d.free) return exec(d, s+1)
                    }
                }
                return exec
            })()

            for (let x = 0; x < xs; x++)
                for (let y = 0; y < ys; y++)
                    for (let z = 0; z < zs; z++)
                        this.list.push( new BlockInfo( auth, this, [x * xsb + xa, y * ysb + ya, z * zsb + za], this.#elmDefs ) )
        }
        
        #elmDefs = createPosDefs<ElementInfo>()

        list: (BlockInfo)[] = [];
        [Symbol.iterator] = (() => {
            const t = this
            return function*() { yield* t.list }
        })()

        /** Start position. */
        readonly startPos: XYZLocation
        /** Group spaces. 0th index = highest level, nth index = lowest level (before element) */
        readonly spaces: number[]
        /** Size in block per "block". */
        readonly blockSize: XYZLocation
        /** Size in "block". */
        readonly size: XYZLocation

        /** Looks for free element. */
        readonly lookupFreeElement: () => ElementInfo
        /** Gets element data at position. */
        readonly getElementAt = (pos: XYZLocation) => this.#elmDefs[pos[0]][pos[1]][pos[2]]
    }

    class ElementInfo {
        constructor(
            key: typeof auth,
            parent: BlockInfo | GroupInfo, block: BlockInfo, top: BinSearch,
            pos: XYZLocation,
            elmDefs: PosDefs<ElementInfo>
        ) {
            if (key !== auth) throw new TypeError('Class is not constructable')

            this.parent = parent
            this.block = block
            this.top = top
            this.pos = pos

            const [x, y, z] = pos
            
            const bl = this.bl = dim.o.getBlock(new BlockLocation(x, y, z))

            if (bl.id !== 'minecraft:concrete') bl.setType(MinecraftBlockTypes.concrete)
            if (!(bl.permutation.getProperty('color').value in elmColorTypes)) bl.setPermutation(emptyElmPmt)
            
            this.#free = bl.permutation.getProperty('color').value == 'white'

            elmDefs[x][y][z] = this
        }

        readonly parent: BlockInfo | GroupInfo
        readonly block: BlockInfo
        readonly top: BinSearch
        readonly pos: XYZLocation
        readonly bl: Block

        #free: boolean
        get free() { return this.#free }
        set free(v) {
            if (this.#free == v) return
            this.bl.setPermutation(v ? emptyElmPmt : filledElmPmt)
            this.#free = v
            this.parent.free = v
        }
    }

    class GroupInfo {
        constructor(
            key: typeof auth,
            parent: BlockInfo | GroupInfo, block: BlockInfo, top: BinSearch,
            startPos: XYZLocation, spaces: number[], prevSpace: number, 
            elmDefs: PosDefs<ElementInfo>
        ) {
            if (key !== auth) throw new TypeError('Class is not constructable')

            this.parent = parent
            this.block = block
            this.top = top
            this.startPos = startPos

            const [space] = spaces,
                slicesSpaces = spaces.slice(1)
            const [xa, ya, za] = startPos
            if (space)
                for (let x = xa, xm = x + prevSpace; x < xm; x += space)
                    for (let z = za, zm = z + prevSpace; z < zm; z += space)
                        this.list.push(new GroupInfo( auth, this, block, top, [x, ya, z], slicesSpaces, space, elmDefs))
            else
                for (let x = xa, xm = x + prevSpace; x < xm; x++)
                    for (let z = za, zm = z + prevSpace; z < zm; z++)
                        this.list.push(new ElementInfo( auth, this, block, top, [x, ya, z], elmDefs ))
            
            this.#free = this.list.some(v => v.free)
        }

        list: (GroupInfo | ElementInfo)[] = [];
        [Symbol.iterator] = (() => {
            const t = this
            return function*() { yield* t.list }
        })()

        readonly parent: BlockInfo | GroupInfo
        readonly block: BlockInfo
        readonly top: BinSearch
        readonly startPos: XYZLocation
        
        #free: boolean
        get free() { return this.#free }
        set free(v) {
            if (this.#free == v) return
            const nv = v || this.list.some(v => v.free)
            if (nv == this.#free) return
            this.#free = nv
            this.parent.free = nv
        }
    }

    class BlockInfo {
        constructor(
            key: typeof auth,
            top: BinSearch,
            startPos: XYZLocation, elmDefs: PosDefs<ElementInfo>
        ) {
            if (key !== auth) throw new TypeError('Class is not constructable')

            this.parent = top
            this.block = this
            this.top = top
            this.startPos = startPos

            const [space] = top.spaces,
                slicesSpaces = top.spaces.slice(1)
            const [xa, ya, za] = startPos,
                [xsb, ysb, zsb] = top.blockSize
            if (space)
                for (let x = xa, xm = x + xsb; x < xm; x += space)
                    for (let z = za, zm = z + zsb; z < zm; z += space)
                        this.list.push( new GroupInfo( auth, this, this, top, [x, ya, z], slicesSpaces, space, elmDefs) )
            else
                for (let x = xa, xm = x + xsb; x < xm; x++)
                    for (let z = za, zm = z + zsb; z < zm; z++)
                        this.list.push( new ElementInfo( auth, this, this, top, [x, ya, z], elmDefs ) )
            
            this.#free = this.list.some(v => v.free)
        }

        list: (GroupInfo | ElementInfo)[] = [];
        [Symbol.iterator] = (() => {
            const t = this
            return function*() { yield* t.list }
        })()

        readonly parent: BinSearch
        readonly block: BlockInfo
        readonly top: BinSearch
        readonly startPos: XYZLocation

        #free: boolean
        get free() { return this.#free }
        set free(v) {
            if (this.#free == v) return
            const nv = v || this.list.some(v => v.free)
            if (nv == this.#free) return
            this.#free = nv
        }
    }
    
    const auth = Symbol('')

    const concrete = MinecraftBlockTypes.concrete,
        newPmt = concrete.createDefaultBlockPermutation.bind(concrete) as typeof concrete.createDefaultBlockPermutation

    const elmColorTypes = empty({
        filled: 'black',
        empty: 'white',
        black: 'filled',
        white: 'empty'
    })
    const filledElmPmt = newPmt()
        filledElmPmt.getProperty('color').value = elmColorTypes.filled
    const emptyElmPmt = newPmt()
        emptyElmPmt.getProperty('color').value = elmColorTypes.empty

    type PosDefs<T> = List<List<List<T, number>,number>,number>
    let createPosDefs = (() => {
        let a = (c = 2) => c ? new Proxy(empty(), { get: (t, p) => p in t ? t[p] : t[p] = a(c - 1) }) : empty()
        return <T>(c = 3) => a(--c) as PosDefs<T>
    })()

    return BinSearch
})()

const PosRegistry = (() => {
    const xo = scoreboard.objective.for('SE_storage_x').dummies
    const yo = scoreboard.objective.for('SE_storage_y').dummies
    const zo = scoreboard.objective.for('SE_storage_z').dummies

    return class PosRegistry {
        /**
         * Registers a save position.
         * @param id Identifier.
         */
        static readonly 'set' = (id: string, pos: XYZLocation) => {
            const [x, y, z] = pos
            xo.set(id, x)
            yo.set(id, y)
            zo.set(id, z)
        }

        /**
         * Gets a registered save position.
         * @param id Identifier.
         */
        static readonly 'get' = (id: string): XYZLocation => this.exist(id) ? [ xo.get(id), yo.get(id), zo.get(id) ] : undefined

        /**
         * Test if a save position is registered or not.
         * @param id Identifier.
         */
        static readonly exist = (id: string) => xo.exist(id)

        /**
         * Deregisters a save position.
         * @param id Identifier.
         */
        static readonly 'delete' = (id: string) => ( xo.delete(id), yo.delete(id), zo.delete(id) )
    }
})()

// loading
const binCfg = {
    startPos: [1572864, -64, 1572864] as XYZLocation,
    spaces: [16, 8, 4, 2],
    blockSize: [16, 3, 16] as XYZLocation,
    size: [1, 1, 1] as XYZLocation
}
const cfg = scoreboard.objective.for('SE_storage').dummies
const load = async () => {
        if (loadLevel == 1) {
            while (true) {
                try {
                    bin = new BinSearch( binCfg.startPos, binCfg.spaces, binCfg.size, binCfg.blockSize )
                    for (const fn of eventQueues.load) try { fn() } catch {}
                    break
                } catch {}
                await server.nextTick
            }
            loadLevel++
        }
        else loadLevel++
    }

let loadLevel: number = +cfg.exist('isLoaded'),
    bin: typeof BinSearch.prototype

if (!loadLevel) (async () => {
    const { startPos: [xa, ya, za], spaces, blockSize: [xsb, ysb, zsb], size: [xs, ys, zs] } = binCfg
    while(true) {
        try {
            const ent = world.getDimension('overworld').spawnEntity('se:storage_loader', new Location(0, 400, 0))
            console.warn('spawn')
            ent.teleport( new Location( xa + xsb * xs / 2, 400, za + zsb * zs / 2 ), dim.o, 0, 0 )
            await server.nextTick

            execCmd(`fill ${xa} ${ya} ${za} ${xa+xs*xsb-1} ${ya+ys*ysb-1} ${za+zs*zsb-1} air`, 'o')

            cfg.add('isLoaded', 1)
            //bin = new BinSearch( binCfg.startPos, binCfg.spaces, binCfg.size, binCfg.blockSize )
            await load()

            break
        } catch {}
        await server.nextTick
    }
})()

// property init
world.events.worldInitialize.subscribe(({propertyRegistry: pReg}) => {
    const ManifestET = EntityTypes.get('se:storage_manifest')
    const ManifestReg = new DynamicPropertiesDefinition()
    ManifestReg.defineNumber('length')
    pReg.registerEntityTypeDynamicProperties(ManifestReg, ManifestET)

    const DataET = EntityTypes.get('se:storage_data')
    const DataReg = new DynamicPropertiesDefinition()
    DataReg.defineNumber('order')
    pReg.registerEntityTypeDynamicProperties(DataReg, DataET)

    load()
})

// event stuff
const eventQueues = {
    load: [] as ( () => void )[]
}
