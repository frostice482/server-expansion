import { world } from "mojang-minecraft";
import { empty, randomstr, renameFn } from "./misc.js";
import storage from "./storage.js";
import { TypedArray, TypedObject, TypedValue } from "./typedvalues.js";

const auth = Symbol()

export default class SEBridgeHost {
    static get plugin() { return Plugin }
}

class Plugin {
    /**
     * Creates a plugin from JSON data.
     * @param data JSON data.
     */
    static readonly fromJSON = (data: importJSONData) => {
        if (!importValidator.test(data)) throw Error(`Plugin data does not match type ${importValidator.name}`)
        data.internalModules = empty(data.internalModules)
        return new Plugin(auth, data)
    }

    /**
     * Gets a plugin.
     * @param id Plugin identifier.
     */
    static readonly 'get' = (id: string) => pluginList.get(id)

    /**
     * Test if a plugin exists.
     * @param id Plugin identifier.
     */
    static readonly exist = (id: string) => pluginList.has(id)

    /**
     * Gets plugin list.
     */
    static readonly getList = () => pluginList.values()

    /**
     * Deletes a plugin. Plugin most not in loaded state so it can be deleted.
     * @param id Plugin identifier.
     */
    static readonly delete = (id: string) => {
        const d = pluginList.get(id)
        if (!d || d.isLoaded) return false

        storage.delete(`SEP_${d.#unique}_P`)
        storage.delete(`SEP_${d.#unique}_D`)
        return true
    }

    constructor(key: typeof auth, data: importJSONData) {
        if (key !== auth) throw new TypeError('Class is not constructable')
        if (pluginList.has(data.id)) throw new ReferenceError(`Plugin with ID '${data.id}' already exists. Consider deleting it first before adding another one.`)

        this.#pluginData = data
        this.#execMain = data.execMain
        for (const [id, fn] of Object.entries(data.internalModules)) this.#im[id] = Function(`r`, `return r( ${fn}, (n) => \`[Plugin: ${data.id}:${id} (\${ n || '<anonymous>' })]\` )`)(renameFn)

        pluginList.set(data.id, this)
        const nc = this.#unique = pluginIndex[data.id] ??= randomstr(8)

        storage.for(`SEP_${nc}_P`).value = JSON.stringify(data)

        if (data.loadOnRegister) this.#iexec()
    }

    #pluginData: importJSONData
    #unique: string

    /** Plugin identifier. */
    get id() { return this.#pluginData.id }
    /** Plugin name. */
    get name() { return this.#pluginData.name }
    /** Plugin description. */
    get description() { return this.#pluginData.description }
    /** Plugin author. */
    get author() { return this.#pluginData.author }

    /** Plugin type. */
    get type() { return this.#pluginData.type }

    /** Converts plugin data to JSON. */
    readonly toJSON = () => this.#pluginData

    #isLoaded = false
    /** Test if plugin is loaded or not. */
    get isLoaded() { return this.#isLoaded }

    #execMain: string
    #exportCache: any

    #im: List<fnExec> = empty()
    #imCache: List<any> = empty()

    #iexec = async ( gRefs: importGlobalRefs = { refs: empty({}), refStack: [] } ) => {
        if (this.#isLoaded) return this.#exportCache
        if (this.id in gRefs.refs) throw new ReferenceError(`Module circular import detected (importing ${this.id}) \n${getImportStack(gRefs).join('\n')}`)

        const pliRefs = gRefs.refs[this.id] = { execOrder: [], refStack: [] }
        gRefs.refStack.push(this.id)

        this.#isLoaded = true
        try {
            const o = await this.#im[this.#execMain]( new Plugin.inst( auth, this, gRefs, this.#execMain ) )
            this.#exportCache ??= o
            for (const fn of pliRefs.execOrder) fn()
        } catch(e) {
            this.#isLoaded = false

            gRefs.refStack.pop()
            delete gRefs.refs[this.id]

            throw e
        }

        gRefs.refStack.pop()
        delete gRefs.refs[this.id]

        return this.#exportCache
    }
    /** Executes the plugin. */
    readonly execute = () => this.#iexec()

    /** Plugin instance. */
    static inst = class BridgeInstance {
        constructor(key: typeof auth, pli: Plugin, gRefs: importGlobalRefs, imName: string, onExport?: (v: any) => void) {
            if (key !== auth) throw new TypeError('Class is not constructable')
            const pliRefs = this.#pRefs = gRefs.refs[pli.id]

            this.#refStack = getImportStack(gRefs).join('\n')

            if (pliRefs.refStack.includes(imName))
                throw new ReferenceError(`Internal module circular import detected (importing internal module ${imName} in plugin ID ${pli.id}) \n${this.#refStack}`)

            this.#pli = pli
            this.#gRefs = gRefs
            this.#pRefs = pliRefs
            //this.#refStack = getImportStack(gRefs).join('\n')
            this.#imName = imName
            this.#onExport = onExport
            this.localStorage = new Plugin.inst.localStorage(auth, this)
        }

        #pli: Plugin
        #gRefs: importGlobalRefs
        #pRefs: importPluginRefs
        #refStack: string
        #imName: string
        #onExport: (v: any) => void

        /**
         * Imports a module.
         * @param moduleName Module name.
         */
        readonly 'import' = <K extends Exclude<keyof defaultModuleList, number>>(moduleName: K): Promise<defaultModuleList[K]> => {
            const m = moduleName in defaultModuleList ? async () => defaultModuleList[moduleName]
                : pluginList.has(moduleName) ? pluginList.get(moduleName).#iexec
                : null
            if (!m) throw new ReferenceError(`Module with ID '${moduleName}' not found. \n${this.#refStack}`) 

            this.#pRefs.refStack.push(this.#imName)
            const v = m(this.#gRefs)
            this.#pRefs.refStack.pop()
            return v
        }

        /**
         * Imports an internal module.
         * @param name Module name.
         */
        readonly 'importInternal' = (name: string) => new Promise<any>(async (res, rej) => {
            const pli = this.#pli
            if (name in pli.#imCache) return res(pli.#imCache[name])
            if (!(name in pli.#im)) throw new ReferenceError(`Internal module with ID '${name}' not found. \n${this.#refStack}`) 

            const pliRefs = this.#pRefs,
                imName = this.#imName
            pliRefs.refStack.push(imName)

            let d = false
            const r = (v: any, t = res) => {
                if (d) return
                d = true

                pliRefs.refStack.pop()
                res(v)
            }

            const i = new Plugin.inst( auth, pli, this.#gRefs, name, r )
            try {
                const o = await pli.#im[name](i)
                r( pli.#imCache[name] ??= o )
            }
            catch(e) { r(e, rej) }
        })

        /**
         * Export.
         * @param data Export data.
         */
        readonly 'exportNow' = (data: any) => new Promise<void>(res => {
            this.#pli.#imCache[this.#imName] = data
            this.#onExport?.(data)

            const { execOrder } = this.#pRefs
            if (!execOrder.length) {
                this.#pli.#exportCache = data
                this.#pli.#isLoaded = true
                res()
            }
            execOrder.push(res)
        })

        /** Plugin local storage. */
        readonly localStorage: typeof Plugin.inst.localStorage.prototype

        static localStorage = class bridgeInstanceLocalStorage {
            constructor(key: typeof auth, inst: BridgeInstance) {
                if (key !== auth) throw new TypeError('Class is not constructable')

                this.#storage = storage.for(`SEP_${inst.#pli.#unique}_D`)
                Object.assign(this.#data, empty(JSON.parse(this.#storage.value ?? '{}')))

                this.#inst = inst
            }

            #inst: BridgeInstance
            #storage: ReturnType<typeof storage.for>
            #data: List<any> = empty()
            #update = () => this.#storage.value = JSON.stringify(this.#data)

            /** Unique save identifier. */
            get id() { return this.#inst.#pli.#unique }

            /** Save data. */
            readonly data = new Proxy(this.#data, {
                defineProperty: (t, p, d) => {
                    if (typeof p == 'symbol') throw new TypeError(`Property key cannot be a symbol`)

                    t[p] = d.value
                    this.#update()
                    return true
                },
                deleteProperty: (t, p) => {
                    if (typeof p == 'symbol') throw new TypeError(`Property key cannot be a symbol`)
                    delete t[p]
                    this.#update()
                    return true
                }
            })
        }
    }
}

let pluginList = new Map<string, Plugin>()
let pluginIndex: List<string> = empty()

type fnExec = (bridgeInstance: typeof Plugin.inst.prototype) => any
export type { fnExec as bridgeFnExec }

// importing
const getImportStack = (gRefs: importGlobalRefs) =>
    gRefs.refStack
        .map( id => `    -> ${id} (${gRefs.refs[id].refStack.join(' > ') })` )
        .reverse()

type importPluginRefs = {
    refStack: string[]
    execOrder: ( (v?: void) => void )[]
}
type importGlobalRefs = {
    refs: List<importPluginRefs>
    refStack: string[]
}

// default module list
import * as mc from 'mojang-minecraft'
import * as gt from 'mojang-gametest'
import * as mcui from 'mojang-minecraft-ui'
import SEModule from "./module.js";
import { MapEventList } from "./evmngr.js";

type defaultModuleList = {
    [k: string]: any
    Minecraft: typeof mc
    Gametest: typeof gt
    MinecraftUI: typeof mcui
    SE1: typeof SEModule
}
let defaultModuleList: defaultModuleList = empty({
    Minecraft: mc,
    Gametest: gt,
    MinecraftUI: mcui,
    SE1: SEModule
})

// storage stuff
export type BridgeHostSaveData = {
    indexes: List<string>
}

storage.instance.default.ev.save.subscribe((data) => {
    data.bridgeHost = {
        indexes: pluginIndex
    }
})
storage.instance.default.ev.load.subscribe((data) => {
    if (!data.bridgeHost) return
    Object.assign(pluginIndex, data.bridgeHost.indexes)

    for (const [id, code] of Object.entries(data.bridgeHost.indexes))
        try {
            if (!pluginList.has(id))
                Plugin.fromJSON( JSON.parse( storage.for(`SEP:${code}:P`).value ) )
        } catch {}
})

// import
world.events.entityCreate.subscribe(({entity}) => {
    if (entity.id !== 'se:bridge') return
    storage.onLoad(async () => {
        try {
            entity.nameTag = 'start'
            await 0

            const newKey = randomstr(16, `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()\`~-=_+[]\\{}|;':",./<>?`),
                expectKey = newKey.slice(2, -2)
            entity.nameTag = newKey
            await 0
            await 0

            if (entity.nameTag !== expectKey) throw Error(`Validation process failed`)
            await 0
            await 0
    
            Plugin.fromJSON(JSON.parse(entity.nameTag))
        } catch(e) {
            console.warn(`bridgeHost > pluginImporter: ${e}`)
        }
        entity.triggerEvent('se:kill')
    })
})

type importJSONData = {
    id: string;
    name: string;
    description: string;
    author: string[];

    type: "module" | "executable";
    loadOnRegister: boolean;

    execMain: string;
    internalModules: List<string>
}

const TString = new TypedValue('string'),
    TStringArr = new TypedArray(TString),
    TBool = new TypedValue('boolean')

const importValidator = new TypedObject()
    .define('id', TString)
    .define('name', TString)
    .define('description', TString)
    .define('author', TStringArr)
    .define('type', new TypedValue(['module', 'executable']))
    .define('loadOnRegister', TBool)
    .define('execMain', TString)
    .define('internalModules', new TypedObject().allowUnusedProperties(true).setIndexType(TString))
importValidator.name = 'BridgePluginJSONData'