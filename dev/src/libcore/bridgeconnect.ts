import { EntityTypes, Location, world } from "mojang-minecraft"
import type { pluginConnectorInfo } from "./bridgehost.js"

const dimList = [
    world.getDimension('overworld'),
    world.getDimension('nether'),
    world.getDimension('the end'),
]

const BridgeConnector = class SEBridgeConnector {
    /** Check if host has been loaded. */
    static readonly hostIsLoaded = (() => {
        try {
            if (!EntityTypes.get('se:connector')) throw null
            return true
        } catch {
            return false
        }
    })()

    /**
     * Connects to plugin host.
     * @param data Plugin data.
     */
    static readonly connect = async (data: pluginConnectorInfo) => {
        if (!this.hostIsLoaded) throw new Error(`Host is not loaded`)
        while(true) {
            let l: Location
            while (!l) {
                for (let i = 0; i < 5; i++) await 0
                l = world.getPlayers()[Symbol.iterator]().next().value?.location
            }
            l.y = 1023
            
            for (const dim of dimList)
                try {
                    // spawn entity
                    // wait 1 tick
                    // auth validate #1
                    // wait 2 ticks
                    // auth validate #2
                    // wait 2 ticks
                    // auth validate #3
                    // wait 2 ticks
                    // send data

                    const ent = dim.spawnEntity('se:connector', l)

                    await 0

                    for (let i = 0; i < 3; i++) {
                        const t = ent.getTags()[0] ?? `A${i}:unknown`
                        const nt = `R${i}:${t.substring(`A${i}:`.length)}`
                        ent.removeTag(t)
                        ent.addTag(nt)
                        for (let x = 0; x < 2; x++) await 0
                        ent.removeTag(nt)
                    }

                    const { id, name, description, execute, type, requires } = data
                    ent.nameTag = JSON.stringify({ id, name, description, execute: execute.toString(), requires, type })

                    return
                } catch (e) {
                    await 0
                }
        }
    }

    protected constructor() { throw new ReferenceError('Class is not constructable') }
}

export default BridgeConnector
