import { Entity, EntityTypes, world } from "mojang-minecraft"
import type { internalModulesList } from "./bridgehost.js"

export default class bridgeCli {
    /**
     * Determines if host is loaded or not.
     */
    static readonly hostIsLoaded = (() => {
        try {
            EntityTypes.get('se:bridge')
            return true
        } catch {
            return false
        }
    })()

    constructor(id: string, prop: Omit<bridgeCli, 'id' | 'send'>) {
        this.id = id
        Object.assign(this, prop)
    }

    readonly id: string

    name?: string
    description?: string
    author?: string[]

    version?: string
    versionCode?: number

    internalModules: internalModulesList = Object.create(null)
    moduleEntry?: string

    canBeUnloaded?: boolean

    readonly send = async () => {
        if (!bridgeCli.hostIsLoaded) throw new TypeError('Host is not loaeded')
        while (true) {
            await 0

            const [plr] = world.getPlayers()
            if (!plr) continue

            let ent: Entity
            try { ent = plr.dimension.spawnEntity('se:bridge', Object.assign( plr.location, { y: 1000 } ) ) }
            catch { continue }
            await 0

            const [t] = ent.getTags()
            ent.removeTag(t)
            ent.addTag(t.slice(3, -3))
            await 0

            await 0

            const { id, name, description, author, version, versionCode, internalModules, moduleEntry, canBeUnloaded} = this
            ent.nameTag = JSON.stringify({
                id,
                name,
                description,
                author,
                version,
                versionCode,
                moduleEntry,
                canBeUnloaded,
                internalModules: Object.fromEntries(
                    Object.entries(internalModules)
                        .map( ([k, fn]) => [k, String(fn)] )
                )
            })
            
            break
        }
    }
}
