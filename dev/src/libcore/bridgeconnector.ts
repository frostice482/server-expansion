import { Entity, EntityQueryOptions, EntityTypes, world } from "mojang-minecraft"
import type { bridgeFnExec as fnExec } from "./bridgehost.js"

export default class SEBridgeConnector {
    /** Test if host is loaded or not. */
    static readonly hostIsLoaded = (() => {
        try {
            EntityTypes.get('se:bridge')
            return true
        } catch {
            return false
        }
    })()

    /**
     * Creates a plugin.
     * @param properties Initializer properties.
     */
    constructor(properties: { [K in Exclude<keyof SEBridgeConnector, 'send'>]?: SEBridgeConnector[K] } = {} ) {
        Object.assign(this, properties)
    }

    /** Plugin identifier. */
    readonly id: string
    /** Plugin name. */
    name = 'Unnamed'
    /** Plugin description. */
    description = 'No description'
    /** Plugin author. */
    author?: string[] = ['Unknown author']

    /** Determines the plugin type. */
    type: 'module' | 'executable' = 'executable'
    /** Loads the plugin on register. */
    loadOnRegister = false

    /** Plugin internal modules. */
    readonly internalModules: List<fnExec> = Object.create(null)
    /** Intenal module name to be executed on plugin load. */
    execMain = 'index'

    /** Sends the plugin to host. */
    readonly send = async () => {
        if (!SEBridgeConnector.hostIsLoaded) throw new ReferenceError(`Bridge host is not loaded.`)
        while(true) {
            await waitFor()

            const [ent] = entLoader ? [entLoader] : world.getPlayers()
            if (!ent) continue

            const pliEnt = ent.dimension.spawnEntity('se:bridge', Object.assign( ent.location, { y: 1023.5 } ) )
            while (pliEnt.nameTag != 'start') await 0

            await 0
            
            await 0

            pliEnt.nameTag = pliEnt.nameTag.slice(2, -2)
            await 0

            await 0

            const { id, name, description, author, type, loadOnRegister, execMain } = this
            pliEnt.nameTag = JSON.stringify({
                id,
                name,
                description,
                author,
                type,
                loadOnRegister,
                execMain: execMain,
                internalModules: Object.fromEntries( Object.keys(this.internalModules).map( v => [ v, String( this.internalModules[v] ) ] ) )
            })
            await 0

            await 0

            try { ent.kill() } catch {}
            break
        }
    }
}

const waitFor = (tick = 0) => new Promise(res => {
    let c = 0, fn: () => void
    world.events.tick.subscribe(fn = () => { if (++c >= tick) res(world.events.tick.unsubscribe(fn)) })
})

let entLoader: Entity;
(async () => {
    const ow = world.getDimension('overworld')
    const opts = new EntityQueryOptions
    opts.type = 'se:area_loader'

    while(!( [entLoader] = ow.getEntities(opts) )) await waitFor()
})()
