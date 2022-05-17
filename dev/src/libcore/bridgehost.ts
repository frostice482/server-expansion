import { world } from "mojang-minecraft";
import { empty, randomstr } from "./misc.js";

import * as mc from 'mojang-minecraft'
import * as gt from 'mojang-gametest'
import * as mcui from 'mojang-minecraft-ui'
import SEModule from './semodule.js'
import eventManager, { MapEventList } from "./evmngr.js";

const auth = Symbol()

const BridgeHost = class SEBridgeHost {
    static get plugin() { return plugin }

    protected constructor() { throw new ReferenceError('Class is not constructable') }
}

export default BridgeHost

class plugin {
    /**
     * Gets a plugin.
     * @param id Plugin identifier.
     */
    static readonly 'get' = (id: string) => pluginList.get(id)

    /**
     * Gets plugin list.
     */
    static readonly getList = () => pluginList.values()

    /**
     * Test if a plugin exists.
     * @param id Plugin identifier.
     */
    static readonly exist = (id: string) => pluginList.has(id)

    /**
     * Deletes a plugin. Plugin will be unloaded first to be deleted.
     * @param id Plugin identifier.
     */
    static readonly delete = (id: string) => {
        const pli = pluginList.get(id)
        if (!pli) return false

        if (!pli.unload()) throw new Error(`Plugin cannot be unloaded`)
        pluginList.delete(id)
        moduleList.delete(id)

        return true
    }

    /**
     * Executes a plugin.
     * @param id Plugin identifier.
     */
    static readonly execute = (id: string) => {
        const pli = pluginList.get(id)
        if (!pli) throw new ReferenceError(`Plugin with ID '${id}' not found`)

        pli.execute()
    }

    /**
     * Creates a plugin.
     * @param data Plugin data.
     */
    constructor(data: pluginConnectorParsed | pluginConnectorInfo) {
        const { id, name, description, type, requires, execute: fnstr } = data
        if (pluginList.has(id)) throw new Error(`Plugin with ID '${id}' already exists`)
    
        this.id = id
        this.name = name
        this.description = description ?? '(no description)'
        this.type = type ?? 'executable'
        this.requires = requires ?? []

        let bridgeData: bridgeDataBind
        const fn = Object.defineProperties(
            typeof fnstr == 'function' ? fnstr : new Function(`bridge`, `return (${fnstr})(bridge)`),
            { name: { value: `(plugin: ${id})` } }
        )
        this.execute = (requireStack = []) => {
            if (this.#isExecuted) return this.exports
            for (const { id, name } of this.requires)
                if (!(moduleList.has(id) || pluginList.has(id))) throw new ReferenceError(`The following required plugin is missing: ${name ?? id}`)
            
            const bridgeInst = new bridge(auth, bridgeData = { requireStack })
            const exports = fn(bridgeInst) ?? bridgeInst.exports

            this.exports = exports
            moduleList.set(id, exports)
            this.#isExecuted = true

            return exports
        }
        this.unload = () => {
            if (!this.#isExecuted) return true

            const evd: bridgeUnloadEventData = {
                cancel: false,
                throw: false,
                throwValue: undefined
            }

            bridgeData.triggerEvent.unload(null)

            if (evd.cancel) {
                if (evd.throw) throw evd.throwValue
                else return false
            } else {
                this.#isExecuted = false
                return true
            }
        }

        pluginList.set(id, this)
    }

    #isExecuted = false

    /** Plugin identifier. */
    readonly id: string
    /** Plugin name. */
    readonly name: string
    /** Plugin description. */
    description: string
    /**
     * Plugin type.
     * `executable` - Plugin can be executed by the player
     * `module` - Plugin should only be executed by another plugin
     */
    type: 'executable' | 'module'
    /** Required plugins / modules */
    requires: {
        /** Plugin identifier. */
        readonly id: string
        /** Plugin description. */
        readonly name?: string
    }[]

    /** Test if the plugin has already been executed. */
    get isExecuted() { return this.#isExecuted }
    /**
     * Executes the plugin.
     * @param requireStack Require stack.
     */
    readonly execute: (requireStack?: string[]) => this['exports']
    /** Unloads the plugin. */
    readonly unload: () => boolean

    /** Plugin exports. */
    exports: any = empty()
}

export type pluginConnectorInfo = {
    /** Plugin identifier. */
    readonly id: string
    /** Plugin name. */
    readonly name: string
    /** Plugin description. */
    description?: string
    /**
     * Plugin type.
     * `executable` - Plugin can be executed by the player
     * `module` - Plugin should only be executed by another plugin
     */
    type?: 'executable' | 'module'
    /** Function to be executed. */
    execute: (bridge: bridge) => any
    /** Required plugins / modules */
    requires?: {
        /** Plugin identifier. */
        readonly id: string
        /** Plugin description. */
        description?: string
    }[]
}
type pluginConnectorParsed = {
    /** Plugin identifier. */
    readonly id: string
    /** Plugin name. */
    readonly name: string
    /** Plugin description. */
    description?: string
    /**
     * Plugin type.
     * `executable` - Plugin can be executed by the player
     * `module` - Plugin should only be executed by another plugin
     */
    type?: 'executable' | 'module'
    /** Function to be executed. */
    execute: string
    /** Required plugins / modules */
    requires?: {
        /** Plugin identifier. */
        readonly id: string
        /** Plugin name. */
        readonly name?: string
    }[]
}

const pluginList = new Map<string, plugin>()
const moduleList = new Map<string, any>([
    [ 'Minecraft', mc ],
    [ 'Gametest', gt ],
    [ 'MinecraftUI', mcui ],
    [ 'SE', SEModule ],
])
type moduleListT = {
    [k: string]: any

    Minecraft: typeof mc
    Gametest: typeof gt
    MinecraftUI: typeof mcui
    SE: typeof SEModule
}

class bridge {
    /**
     * Imports a plugin / module data.
     * @param id Plugin / module ID.
     */
    readonly require: <T extends string>(id: T) => moduleListT[T]

    /** Module exports. Ignored if function returns a value. */
    exports: any

    /** Events. */
    readonly events?: bridgeEventManagerT['events']

    /**
     * Creates bridge for plugins.
     * @param dataBind Data bind.
     */
    constructor(key: typeof auth, dataBind: bridgeDataBind) {
        if (key !== auth) throw new ReferenceError('Class is not constructable')

        const { requireStack = [] } = dataBind
        const { events, triggerEvent, data } = new eventManager<bridgeEventList>(['unload'], 'bridgeHost')

        dataBind.eventData = data
        dataBind.triggerEvent = triggerEvent

        this.events = events

        this.require = (id) => {
            if (moduleList.has(id)) return moduleList.get(id)

            if (requireStack.includes(id)) throw new RangeError(`Circular dependency detected`)
            if (pluginList.has(id)) return pluginList.get(id).execute(requireStack.concat([id]))

            throw new ReferenceError(`Plugin / module with ID '${id}' not found.`)
        }
    }
}

type bridgeDataBind = {
    /** Require stack. */
    requireStack?: string[]
    /** Event data. */
    eventData?: bridgeEventManagerT['data']
    /** Trigger event. */
    triggerEvent?: bridgeEventManagerT['triggerEvent']
}

type bridgeEventList = MapEventList<{
    unload: (evd: bridgeUnloadEventData) => void
}>

type bridgeUnloadEventData = {
    /** Cancels unload. */
    cancel: boolean
    /** Throws an error. Ignored if `cancel` is set to `false`. */
    throw: boolean
    /** Throw value. Ignored if `cancel` or `throw` is set to `false`. */
    throwValue: any
}

type bridgeEventManagerT = eventManager<bridgeEventList>

world.events.entityCreate.subscribe(async ({entity}) => {
    if (entity.id !== 'se:connector') return

    // auth #1
    // wait 2 ticks
    // validate
    // auth #2
    // wait 2 ticks
    // validate
    // auth #3
    // wait 2 ticks
    // validate
    // wait 2 ticks
    // grab data
    // create plugin

    for (let i = 0; i < 3; i++) {
        const auth = randomstr(6)
        entity.addTag(`A${i}:${auth}`)
        for (let x = 0; x < 2; x++) await 0
        if (!entity.hasTag(`R${i}:${auth}`)) return entity.kill()
    }

    for (let x = 0; x < 2; x++) await 0

    new plugin(JSON.parse(entity.nameTag))

    entity.kill()
})
