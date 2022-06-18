import { BlockLocation, Dimension, DynamicPropertiesDefinition, Entity, EntityTypes, Location, world } from "mojang-minecraft"
import eventManager, { MapEventList } from "./evmngr.js"
import { execCmd } from "./mc.js"
import server from "./server.js"
import areaLoader from "./arealoader.js"
import { randomstr } from "./misc.js"

const storage = (() => {
    class storage {
        /** Test if storage is loaded. */
        static get isLoaded() { return loadLevel == 2 }
        /** Storage instance. */
        static get instance() { return instance }

        /**
         * Executes a function on load.
         * @param fn Function to be executed.
         */
        static readonly onLoad = (fn: () => void) => {
            if (this.isLoaded) fn()
            else loadQueues.push(fn)
        }
    
        /**
         * Executes a save data.
         * @param id Save data identifier.
         * @returns Boolean - True if save data successfully deleted.
         */
        static readonly for = (id: string) => {
            if (!this.isLoaded) throw new TypeError(`Storage is not loaded`)
            return new saveDataInfo(id)
        }
    
        /**
         * Deletes a save data.
         * @param id Save data identifier.
         * @returns Boolean - True if save data successfully deleted.
         */
        static readonly delete = (id: string) => {
            if (!this.isLoaded) throw new TypeError(`Storage is not loaded`)
            return !execCmd(`structure delete ${ JSON.stringify(id) }`, dim, true).statusCode
        }
    
        protected constructor() { throw new TypeError('Class is not constructable') }
    }

    class saveDataInfo {
        constructor(id: string) {
            this.id = id
            this.execId = JSON.stringify(this.id)

            try {
                execCmd(`structure load ${this.execId} ${x} ${y} ${z} 0_degrees none true false`, dim) // load
                const l: string[] = []
                for (const data of dim.getEntitiesAtBlockLocation(blLoc)) {
                    if (data.id != 'se:storage_data') continue
                    l[data.getDynamicProperty('order') as number] = data.nameTag
                    clear(data)
                }
                this.#value = l.join('')
            } catch {}
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
                execCmd(`structure delete ${this.execId}`, dim, true) // delete
            } else {
                for (let i = 0, m = v.length / 32767; i < m; i++) {
                    const ent = dim.spawnEntity('se:storage_data', entLoc)
                    ent.setDynamicProperty('order', i)
                    ent.nameTag = v.substr(i * 32767, 32767)
                }
                execCmd(`structure save ${this.execId} ${x} ${y} ${z} ${x} ${y} ${z} true disk false`, dim, true) // save
                for (const ent of dim.getEntitiesAtBlockLocation(blLoc))
                    if (ent.id == 'se:storage_data') clear(ent)
            }
        }
    }

    const clear = (ent: Entity) => {
        ent.teleport(Object.assign(ent.location, {y: 400}), dim, 0, 0)
        ent.triggerEvent('se:kill')
    }

    // loaded
    let loadLevel = 0
    const loadQueues: ( () => void )[] = []
    const load = () => {
        if (++loadLevel != 2) return

        const {x: xl, y: yl, z: zl} = areaLoader.centerLoadLocation;
        [x, y, z] = [xl, 0, zl]
        entLoc = new Location(x + 0.5, y + 0.5, z + 0.5)
        blLoc = new BlockLocation(x, y, z)
        dim = areaLoader.dim

        for (const fn of loadQueues)
            try { fn() }
            catch(e) { console.warn(`storage > onLoad (${fn.name || '<anonymous>'}): ${ e instanceof Error ? `${e}\n${e.stack}` : e }`) }
    }
    areaLoader.onLoad(load)
    
    // locations & dimensions
    let x: number, y: number, z: number,
        entLoc: Location,
        blLoc: BlockLocation,
        dim: Dimension

    // dynamic properties
    world.events.worldInitialize.subscribe(async ({propertyRegistry}) => {
        const dataEnt = EntityTypes.get('se:storage_data'),
            dataDefs = new DynamicPropertiesDefinition()
        dataDefs.defineNumber('order')
        propertyRegistry.registerEntityTypeDynamicProperties(dataDefs, dataEnt)
        await 0
        
        load()
    })

    return storage
})()

export default storage

import type { saveData as permissionSaveData } from "./permission.js"
import type { saveData as chatSaveData } from "./chat.js"
import type { saveData as roleSaveData } from "./role.js"
import type { ccStorageSaveData } from "./cc.js"

const instance = (() => {
    class storageInstance <T = {}> {
        /** Default instance. */
        static get default() { return instanceDefault }

        /**
         * Creates a storage instance.
         * @param id Storage identifier.
         */
        constructor(id: string) {
            this.#id = id
            this.#execId = JSON.stringify(this.id)

            let saveInfo: ReturnType<typeof storage.for>

            this.save = () => {
                if (!saveInfo) return { status: false }
                const t0 = Date.now()

                const saveData: any = {}
                const d = triggerEvent.save(saveData)
                
                const stringed = saveInfo.value = JSON.stringify(saveData)
                if (!d.break) triggerEvent.postSave({
                    data: saveData,
                    stringed: stringed,
                    time: Date.now() - t0
                })

                return {
                    status: true,
                    data: saveData,
                    stringed: stringed,
                    time: Date.now() - t0
                }
            }
            this.load = () => {
                if (!saveInfo) return { status: false }
                const t0 = Date.now()

                const stringed = saveInfo.value

                const saveData: any = JSON.parse(saveInfo.value)
                const d = triggerEvent.load(saveData)

                if (!d.break) triggerEvent.postLoad({
                    data: saveData,
                    stringed: stringed,
                    time: Date.now() - t0
                })
                
                return {
                    status: true,
                    data: saveData,
                    stringed: stringed,
                    time: Date.now() - t0
                }
            }
            this.delete = () => {
                if (!saveInfo.value) return false
                saveInfo.value = undefined
                return true
            }
            
            const { events, triggerEvent } = new eventManager<instanceEvents<T>>(['save', 'load', 'postSave', 'postLoad'], `storage (${id})`)
            this.ev = this.events = events

            storage.onLoad(async () => {
                saveInfo = storage.for(id)
                if (!this.autoload || !saveInfo.value) return
                await server.nextTick // ensures all have loaded, then execute autoload
                this.load()
            })
        }

        #id: string
        /** Storage identifier. */
        get id() { return this.#id }
        set id(v) {
            this.#id = v
            this.#execId = JSON.stringify(v)
        }

        #execId: string
        /** Executable identifier. */
        get execId() { return this.#execId }

        readonly ev: eventManager<instanceEvents<T>>['events']
        readonly events: eventManager<instanceEvents<T>>['events']

        /**
         * Saves current data.
         * @returns Save data.
         */
        readonly save: () => instantEventReturn<T>
        /**
         * Loads saved data.
         * @returns Save data.
         */
        readonly load: () => instantEventReturn<T>
        /**
         * Deletes saved data.
         * @returns Boolean - True if save data successfully deleted.
         */
        readonly delete: () => boolean

        /**
         * Enables autoload.
         * If storage data is detected, loads storage data some time after instance creation.
         */
        autoload = true

        #autosaveInterval = new server.interval(() => this.save(), 40000)
        /** Autosave interval in milliseconds. Must be greater than 5 seconds. 0 for disable. */
        get autosaveInterval() { return this.#autosaveInterval?.interval ?? 0 }
        set autosaveInterval(v) {
            if (v <= 0 && this.#autosaveInterval) {
                this.#autosaveInterval.close()
                this.#autosaveInterval = undefined
            }
            this.#autosaveInterval ??= new server.interval(this.save, 40000)
            this.#autosaveInterval.interval = Math.max(v, 5000)
        }
    }

    // events
    type instanceEvents <T> = MapEventList<{
        save: (evd: T) => void
        postSave: (evd: instancePostEventEvd<T> ) => void
        load: (evd: T) => void
        postLoad: (evd: instancePostEventEvd<T> ) => void
    }>
    
    type instancePostEventEvd <T> = {
        readonly data: T
        readonly stringed: string
        readonly time: number
    }

    // return
    type instantEventReturn <T> = { readonly status: true } & instancePostEventEvd<T> | { readonly status: false }

    return storageInstance
})()

const instanceDefault = (() => {
    const curVer = 1.0101
    const defaultInstance = new instance<{
        [k: string]: any
        saveInfo: {
            version: number
        }
        storage: {
            autosaveInterval: number
        }
        permission: permissionSaveData
        chat: chatSaveData
        role: roleSaveData
        cc: ccStorageSaveData
    }>('SE_default')

    defaultInstance.autosaveInterval = 30000
    defaultInstance.ev.save.subscribe(function baseSave (data) {
        data.saveInfo = {
            version: curVer
        }
    }, Infinity)
    defaultInstance.ev.load.subscribe(function baseLoad (data, ctrl) {
        const br = (type = Error, reason?: string, disableAutosave = true) => {
            ctrl.break()
            if (disableAutosave) {
                defaultInstance.autosaveInterval = 0
                reason += ` Autosave has been disabled.`
            }
            throw new type(reason)
        }
        if (!data?.saveInfo) br(ReferenceError, 'Save data information unavaiable.')
        if (data.saveInfo.version > curVer) br(RangeError, `Unsupported save version v${curVer}.`)
        while (data.saveInfo.version != curVer) {
            switch (data.saveInfo.version) {
                case 1.0000: {
                    data.saveInfo.version = 1.0101
                    data.cc.ccs.push({
                        id: 'tps',
                        extends: true,
                        data: {}
                    })
                }; break
                default:
                    br(TypeError, `Unknown version v${data.saveInfo.version}.`)
            }
        }
    }, Infinity)

    defaultInstance.ev.save.subscribe((data) => {
        data.storage = {
            autosaveInterval: defaultInstance.autosaveInterval
        }
    })
    defaultInstance.ev.load.subscribe((data) => {
        if (!data.storage) return
        defaultInstance.autosaveInterval = data.storage.autosaveInterval
    })

    world.events.worldInitialize.subscribe(async ({propertyRegistry}) => {
        const reg = new DynamicPropertiesDefinition
        reg.defineString('STR:defId', 12)
        propertyRegistry.registerWorldDynamicProperties(reg)

        const newId = randomstr(12)
        defaultInstance.id = world.getDynamicProperty('STR:defId') as string ?? ( world.setDynamicProperty('STR:defId', newId), newId )
    })

    return defaultInstance
})()
