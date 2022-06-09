import { BlockLocation, Dimension, DynamicPropertiesDefinition, Location, MinecraftDimensionTypes, world } from "mojang-minecraft"
import { dim } from "./mc.js"
import server from "./server.js"

export default class areaLoader {
    /** Test is area is loaded or not. */
    static get isLoaded() { return isLoaded }
    /** Dimension. */
    static get dim() { return sDim }
    /** Center load location. */
    static get centerLoadLocation() { return blLoc }
    /**
     * Executes a function on load.
     * @param fn Function to be executed.
     */
    static readonly onLoad = (fn: () => void) => {
        if (this.isLoaded) fn()
        else loadQueues.push(fn)
    }
}

// loaded
let isLoaded = false
const loadQueues: ( () => void )[] = []
const load = () => {
    isLoaded = true
    for (const fn of loadQueues)
        try { fn() }
        catch(e) { console.warn(`areaLoader > onLoad (${fn.name || '<anonymous>'}): ${ e instanceof Error ? `${e}\n${e.stack}` : e }`) }
}

// location
const [x, y, z] = [1572864, 63, 1572864]
const loaderLoc = new Location(x + 0.5, y + 0.5, z + 0.5),
    blLoc = new BlockLocation(x, y, z)

// dimension
const dimIndex = {
    [MinecraftDimensionTypes.overworld]: 0,
    [MinecraftDimensionTypes.nether]: 1,
    [MinecraftDimensionTypes.theEnd]: 2,
    0: dim.o,
    1: dim.n,
    2: dim.e,
}
let sDim: Dimension

// property registry
world.events.worldInitialize.subscribe(async ({propertyRegistry}) => {
    try {
        // property registry
        const reg = new DynamicPropertiesDefinition
        reg.defineBoolean('SEAL:isLoaded')
        reg.defineNumber('SEAL:dimId')
        propertyRegistry.registerWorldDynamicProperties(reg)

        // loading
        if (!world.getDynamicProperty('SEAL:isLoaded')) {
            let tmpLoc: Location, tmpSet = false
            while (true) {
                try {
                    const [plr] = world.getPlayers()
                    if (!plr) throw 0
                    if (!tmpSet) {
                        tmpSet = true
                        tmpLoc = plr.location
                        plr.teleport(loaderLoc, plr.dimension, 0, 0)
                    }
        
                    const pDim = plr.dimension
                    const ent = pDim.spawnEntity('se:area_loader', loaderLoc)
        
                    world.setDynamicProperty('SEAL:isLoaded', true)
                    world.setDynamicProperty('SEAL:dimId', dimIndex[pDim.id])
                    sDim = pDim
        
                    load()
                    
                    plr.teleport(tmpLoc, pDim, 0, 0)
                    break
                } catch (e) {}
                await server.nextTick
            }
        } else {
            sDim = dimIndex[world.getDynamicProperty('SEAL:dimId') as number]
            while(true) {
                if ( sDim.getEntitiesAtBlockLocation(blLoc).some(v => v.id == 'se:area_loader') ) break
                await server.nextTick
            }
            load()
        }
    } catch(e) {
        console.warn(`areaLoader > (internal: loading): ${ e instanceof Error ? `${e}\n${e.stack}` : e }`)
    }
})
