import eventManager, { MapEventList } from "./evmngr.js";
import { empty, randomstr, renameFn } from "./misc.js";

import * as mc from 'mojang-minecraft'
import * as gt from 'mojang-gametest'
import * as mcui from 'mojang-minecraft-ui'
import se from "./module.js";
import server from "./server.js";
import { TypedArray, TypedObject, TypedValue } from "./typedvalues.js";

const auth = Symbol()

export default class bridgeHost {
    static get plugin() { return plugin }
}

class plugin {
    static bridgeInstance = class bridgeInstance {
        constructor(key: typeof auth, data: moduleImportData) {
            if (key !== auth) throw new TypeError('Class is not constructable')

            this.#pli = data.pluginParent.plugin
            this.#pliData = data.pluginParent
            this.#data = data

            this.ev = this.#pli.#moduleEvents
        }
    
        #pli: plugin
        #pliData: pluginImportData
        #data: moduleImportData
    
        readonly ev: bridgeInstanceEventInstance['events']
        readonly events: bridgeInstanceEventInstance['events']
    
        readonly 'import' = async <K extends string>(module: K, defaultVersion: number | 'latest' = 'latest'): Promise<K extends keyof defaultModules ? defaultModules[K] : any> => {
            //@ts-expect-error
            if (module in defaultModules) return defaultModules[module]
            else if (pluginList.has(module)) {
                const pliFamily = pluginList.get(module)
                if (pliFamily.loadedVersion === null && !pliFamily.versions.has(defaultVersion))
                    throw importError( new ReferenceError(`Module '${module}' does not have version code ${defaultVersion}`), this.#data )
                return ( pliFamily.loadedVersion === null ? pliFamily.versions.get(defaultVersion) : pliFamily.getLoaded() ).execute(this.#data)
            }
            else throw importError( new ReferenceError(`Module not found: '${module}'`), this.#data )
        }
        
        readonly 'importInternal' = async (module: string) => {
            const pli = this.#pli,
                pliData = this.#pliData,
                data = this.#data

            if (module in pli.#internalModulesCache) return pli.#internalModulesCache[module]
            else if (module in pli.#internalModules) {
                if (data.moduleStack.includes(module))
                    throw importError( new ReferenceError(`Circular import detected (importing '${module}' in '${pli.id}')`), data )
                else if (module in pliData.module) return pliData.module[module].promise

                const mdata = new moduleImportData(module, data)
                pliData.module[module] = mdata

                mdata.promise.then((v) => {
                    pli.#internalModulesCache[module] = v
                }).finally(() => {
                    delete pliData.module[module]
                })

                try { mdata.res( pli.#internalModules[module]( new plugin.bridgeInstance(auth, mdata) ) ) }
                catch (e) { data.rej(e) }

                return mdata.promise
            }
            else throw importError( new ReferenceError(`Internal module not found: '${module}' (in '${pli.id}')`), data)
        }
        readonly 'export' = async (value: any) => {
            this.#data.res(value)
        }
    }

    /**
     * Gets a plugin.
     * @param id Plugin family identifier.
     * @param version Plugin version.
     */
    static readonly 'get' = (id: string, version: number | 'latest' = 'latest') => pluginList.get(id)?.versions.get(version)

    /**
     * Gets plugin family.
     * @param id Plugin family identifier.
     */
    static readonly 'getFamily' = (id: string) => pluginList.get(id)

    /**
     * Test if a plugin exists.
     * @param id Plugin family identifier.
     * @param version Plugin version.
     * @returns Boolean -- True if plugin exists.
     */
    static readonly exist = (id: string, version: number | 'latest' = 'latest') => Boolean( this.get(id, version) )

    /**
     * Gets plugin list.
     * @returns Plugin list.
     */
    static readonly getList = () => pluginList.entries()

    /**
     * Deletes a plugin.
     * @param id Plugin family identifier.
     * @param version Plugin version.
     * @returns Boolean -- True if plugin exists and successfully deleted.
     */
    static readonly delete = (id: string, version: number | 'latest' = 'latest') => {
        const pliFamily = pluginList.get(id)
        if (!pliFamily) return false

        const pli = pliFamily.versions.get(version)
        if (pli.isExecuted && !pli.unload()) return false

        pliFamily.versions.delete(version)
        if (version == 'latest' || version == pliFamily.latestVersion) {
            // update the latest version set
            const versions = new Set(pliFamily.versions.keys())
            versions.delete('latest')
            pliFamily.latestVersion = Math.max(...Array.from(versions, v => +v))

            // ..or delete if there is no plugin left in the family
            if (!versions.size) pluginList.delete(id)
        }

        return true
    }

    /**
     * Deletes a plugin family.
     * @param id Plugin family identifier.
     * @returns Boolean -- True if plugin family exists and successfully deleted.
     */
    static readonly deleteFamily = (id: string) => {
        const pliFamily = pluginList.get(id)
        if (!pliFamily) return false

        const pli = pliFamily.versions.get(pliFamily.loadedVersion)
        if (pli && pli.isExecuted && !pli.unload()) return false

        pluginList.delete(id)

        return true
    }

    /**
     * Creates a plugin from JSON data.
     * @param data JSON data.
     */
    static readonly fromJSON = (data: pluginJSONData) => {
        if (!pluginJSONDataT.test(data)) throw new TypeError('type mismatch')
        const { id, internalModules, author, canBeUnloaded, description, moduleEntry, name, version, versionCode, executeOnRegister } = data

        const imNew: internalModulesList = empty()
        for (const [k, fn] of Object.entries(internalModules))
            imNew[k] = renameFn( Function(`return ${fn}`)(), `[Plugin: ${id}/${version ?? '<unknown version>'}/${k}]` )

        new this(id, {
            author,
            description,
            name,
            version,
            versionCode
        }, imNew, {
            canBeUnloaded,
            moduleEntry,
            executeOnRegister
        })
    }

    constructor(id: string, info: pluginInfo = {}, internalModules: Record<string, (bridge: typeof plugin.bridgeInstance.prototype) => any>, config: pluginConfig = {}) {
        this.id = id

        this.name = info.name ?? '(Unnamed)'
        this.description = info.description ?? '(No description)'
        this.author = info.author ?? ['Unknown author']

        this.version = info.version ?? 'v1.0.0'
        this.versionCode = info.versionCode ?? 1

        this.#internalModules = internalModules
        this.#moduleEntry = config.moduleEntry ?? 'main'

        this.#canBeUnloaded = config.canBeUnloaded ?? false

        if (!pluginList.has(id)) {
            const o = {
                versions: new Map,
                latestVersion: -1,
                getLoaded: () => o.versions.get(o.latestVersion),
                commonLoaded: false,
                loadedVersion: null
            }
            pluginList.set(id, o)
        }

        const pliFamily = this.#family = pluginList.get(id)
        pliFamily.versions.set(this.versionCode, this)
        pliFamily.latestVersion = Math.max(pliFamily.latestVersion, this.versionCode)
        pliFamily.versions.set('latest', pliFamily.versions.get(pliFamily.latestVersion))

        if (config.executeOnRegister) server.waitFor(20).then(() => {
            if (pliFamily.latestVersion == this.versionCode) this.execute()
        })
    }

    // ---- other stuff ----

    #family: pluginFamily

    // ---- General plugin info ----

    /** Plugin identifier. */
    readonly id: string

    readonly name: string
    readonly description: string
    readonly author: string[]

    readonly version: string
    readonly versionCode: number

    // ---- Module section ----

    #internalModules: internalModulesList
    #internalModulesCache: Record<string, any> = empty()
    #moduleEntry: string
    #moduleCache: any

    readonly dependents = new Set<plugin>()

    #moduleEventTrigger: bridgeInstanceEventInstance['triggerEvent']
    #moduleEvents: bridgeInstanceEventInstance['events']

    // ---- Execute section ----

    #isExecuted = false

    /** Determines whether plugin is started or not.. */
    get isExecuted() { return this.#isExecuted }

    /**
     * Executes plugin.
     * @param caller Plugin caller.
     */
    readonly execute = async (caller: moduleImportData | null = null) => {
        if (caller) this.dependents.add(caller.pluginParent.plugin)

        if (this.isExecuted) return this.#moduleCache

        if (this.id in importData) {
            if (caller.pluginParent.pluginStack.includes(this)) {
                this.dependents.delete(caller.pluginParent.plugin)
                throw importError( new ReferenceError(`Circular import detected (importing '${this.id}' from '${caller.id}' in '${caller.pluginParent.id}')`), caller )
            }
            return importData[this.id].promise
        }

        const {events, triggerEvent} = new eventManager<bridgeInstanceEvents>(['unload'], `plugin (${this.id})`)
        this.#moduleEvents = events
        this.#moduleEventTrigger = triggerEvent

        const data = importData[this.id] = new pluginImportData(this, caller)
        const entryId = this.#moduleEntry
        const mdata = new moduleImportData(entryId, data)
        data.module[entryId] = mdata

        data.res(mdata.promise)
        mdata.promise.then((v) => {
            this.#family.commonLoaded = true
            this.#isExecuted = true
            this.#moduleCache = v
        }).catch(() => {
            this.#family.loadedVersion = null
        }).finally(() => {
            delete importData[this.id]
        })

        this.#family.loadedVersion = this.versionCode

        try { mdata.res( this.#internalModules[entryId]( new plugin.bridgeInstance(auth, mdata) ) ) }
        catch (e) { data.rej(e) }
        
        return data.promise
    }

    // ---- Unload section ----

    #canBeUnloaded: boolean

    /** Determines whether plugin can be unloaded or not.. */
    #a = (stack: plugin[] = [this]) => Array.from(this.dependents).every( pli => stack.includes(pli) ? true : pli.#canBeUnloaded && pli.#a(stack.concat(pli)) )
    get canBeUnloaded() { return this.#canBeUnloaded && this.#a() }

    /** Unloads plugin. */
    readonly unload = (stack: plugin[] = [this]) => {
        if (!(this.canBeUnloaded && this.#isExecuted)) return false

        for (const pli of this.dependents) if (!stack.includes(pli)) pli.unload(stack.concat(pli))
        this.#moduleEventTrigger.unload(undefined, {
            onError: (ev) => {
                throw ev
            }
        })
        
        this.#isExecuted = false
        this.#internalModulesCache = empty()
        this.#moduleCache = undefined

        this.#family.commonLoaded = false
        this.#family.loadedVersion = null

        return true
    }
}

const pluginList = new Map<string, pluginFamily>()

// json
type pluginInfo = {
    name?: string
    description?: string
    author?: string[]

    version?: string
    versionCode?: number
}

type pluginConfig = {
    moduleEntry?: string
    canBeUnloaded?: boolean
    executeOnRegister?: boolean
}

type pluginJSONData = pluginInfo & pluginConfig & {
    id: string
    internalModules: Record<string, string>
}

const Tstr = new TypedValue('string'),
    Tnum = new TypedValue('number'),
    Tbool = new TypedValue('boolean')

const pluginJSONDataT = new TypedObject()
    .define('id', Tstr)
    .define('name', Tstr, false)
    .define('description', Tstr, false)
    .define('author', new TypedArray(Tstr), false)
    .define('version', Tstr, false)
    .define('versionCode', Tnum, false)
    .define('moduleEntry', Tstr, false)
    .define('internalModules', new TypedObject().allowUnusedProperties(true).setIndexType(Tstr))
    .define('canBeUnloaded', Tbool, false)
    .define('executeOnRegister', Tbool, false)

// type
type pluginFamily = {
    versions: Map<number | 'latest', plugin>,
    latestVersion: number
    getLoaded: () => plugin

    commonLoaded: boolean
    loadedVersion: number
}

type bridgeInstanceEvents = MapEventList<{
    unload: (ev: void) => void
}>

type bridgeInstanceEventInstance = eventManager<bridgeInstanceEvents>

export type internalModulesList = Record<string, (bridge: typeof plugin.bridgeInstance.prototype) => any>

// module stuff
const defaultModules = empty({
    Minecraft: mc, mc,
    Gametest: gt, gt,
    MinecraftUI: mcui, mcui,
    SE: se, se,
})
type defaultModules = typeof defaultModules

// import stuff
const importError = (err: Error, data: pluginImportData | moduleImportData | null) => {
    const stack = getImportStack(data)
    if (stack) err.stack = stack + '\n' + err.stack
    return err
}

const getImportStack = (data: pluginImportData | moduleImportData | null = null) => {
    if (!data) return

    const stack: string[] = []
    if (data instanceof pluginImportData) {
        stack.push(`    -> ${data.id}`)
        data = data.parent
    }
    while (data instanceof moduleImportData) {
        const pluginParent = data.pluginParent
        stack.push(`    -> ${pluginParent.id} (${pluginParent.plugin.version}) (${data.moduleStack.join(' > ')})`)
        data = data.pluginParent.parent
    }

    return stack.join('\n')
}

const importData: Record<string, pluginImportData> = empty()

class commonImportData {
    constructor(id: string) {
        this.promise = new Promise((res, rej) => {
            //@ts-expect-error
            this.res = res
            //@ts-expect-error
            this.rej = rej
        })
        this.id = id
    }

    readonly id: string

    readonly parent: unknown

    readonly promise: Promise<any>
    readonly res: (v: any) => void
    readonly rej: (err: any) => void
}

class pluginImportData extends commonImportData {
    constructor(pli: plugin, caller: moduleImportData | null) {
        super(pli.id)

        this.parent = caller
        this.plugin = pli
        this.pluginStack = caller ? caller.pluginParent.pluginStack.concat(pli) : [pli]
    }

    declare readonly parent: moduleImportData | null
    readonly pluginStack: plugin[]

    readonly plugin: plugin
    readonly module: Record<string, moduleImportData> = empty()
}

class moduleImportData extends commonImportData {
    constructor(id: string, caller: moduleImportData | pluginImportData) {
        super(id)

        this.parent = caller
        this.pluginParent = caller instanceof pluginImportData ? caller : caller.pluginParent
        this.moduleStack = caller instanceof pluginImportData ? [id] : caller.moduleStack.concat(id)
    }

    declare readonly parent: moduleImportData | pluginImportData
    readonly pluginParent: pluginImportData
    readonly moduleStack: string[]
}

mc.world.events.entityCreate.subscribe(async ({entity}) => {
    if (entity.id !== 'se:bridge') return
    try {
        const t = randomstr(15, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~!@#$%^&*()-=_+[]\\{}|;\':",./<>? ')
        const expt = t.slice(3, -3)
        entity.addTag(t)
        await 0

        await 0

        const [t2] = entity.getTags()
        if (t2 !== expt) {
            entity.kill()
            throw new Error(`Authentication process failed: expecting "${expt}", got "${t2}"`)
        }
        await 0

        await 0

        const d = JSON.parse(entity.nameTag)
        plugin.fromJSON(d)
    } catch(e) {
        console.warn(`Error while parsing plugin: ${ e instanceof Error ? `${e}\n${e.stack}` : e }`)
    } finally {
        try { entity.kill() } catch {}
    }
})
