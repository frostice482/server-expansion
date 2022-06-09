import { BlockLocation, Dimension, DynamicPropertiesDefinition, EntityTypes, Location, world } from "mojang-minecraft"
import eventManager, { MapEventList } from "./evmngr.js"
import { execCmd } from "./mc.js"
import server from "./server.js"

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
         * @param id Identifier.
         */
        static readonly for = (id: string) => {
            if (!this.isLoaded) throw new Error(`Storage is not loaded`)
            return new saveDataInfo(id)
        }
    
        /**
         * Deletes a save data.
         * @param id Identifier.
         */
        static readonly delete = (id: string) => {
            if (!this.isLoaded) throw new Error(`Storage is not loaded`)
            return !execCmd(`structure delete ${ JSON.stringify(id) }`, dim, true).statusCode
        }
    
        protected constructor() { throw new TypeError('Class is not constructable') }
    }

    class saveDataInfo {
        constructor(id: string) {
            this.id = id
            this.execId = JSON.stringify(this.id)

            try {
                execCmd(`structure load ${this.execId} ${x} ${y} ${z}`, dim) // load
                const l: string[] = []
                for (const data of dim.getEntitiesAtBlockLocation(blLoc)) l[data.getDynamicProperty('order') as number] = data.nameTag
                clear()
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
                execCmd(`structure save ${this.execId} ${x} ${y} ${z} ${x} ${y} ${z} true disk`, dim, true) // save
            }
        }
    }

    const clear = () => {
        for (const ent of dim.getEntitiesAtBlockLocation(blLoc)) {
            ent.teleport(Object.assign(ent.location, {y: 400}), dim, 0, 0)
            ent.triggerEvent('se:kill')
        }
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
    world.events.worldInitialize.subscribe(({propertyRegistry}) => {
        const dataEnt = EntityTypes.get('se:storage_data'),
            dataDefs = new DynamicPropertiesDefinition()
        dataDefs.defineNumber('order')
        propertyRegistry.registerEntityTypeDynamicProperties(dataDefs, dataEnt)

        load()
    })

    return storage
})()

export default storage

import type { saveData as permissionSaveData } from "./permission.js"
import type { saveData as chatSaveData } from "./chat.js"
import type { saveData as roleSaveData } from "./role.js"
import areaLoader from "./arealoader.js"
import { randomstr } from "./misc.js"

const instance = (() => {
    class storageInstance <T = {}> {
        /** Gets default instance. */
        static get default() { return instanceDefault }

        /**
         * Creates a storage instance.
         * @param id Identifier.
         */
        constructor(id: string) {
            this.#id = id
            this.#execId = JSON.stringify(this.id)

            let saveInfo: ReturnType<typeof storage.for>
            storage.onLoad(() => saveInfo = storage.for(id))

            this.save = () => {
                if (!saveInfo) return new instantEventReturnFalse
                const t0 = Date.now()

                const evd: any = {}
                const d = triggerEvent.save(evd)
                
                const str = saveInfo.value = JSON.stringify(evd)
                if (!d.break) triggerEvent.postSave(new instancePostEventEvd<T>(evd, str, Date.now() - t0))

                return new instantEventReturnTrue(evd, str, Date.now() - t0)
            }
            this.load = () => {
                if (!saveInfo) return new instantEventReturnFalse
                const t0 = Date.now()

                const str = saveInfo.value

                const evd: any = JSON.parse(saveInfo.value)
                const d = triggerEvent.load(evd)

                if (!d.break) triggerEvent.postLoad(new instancePostEventEvd<T>(evd, str, Date.now() - t0))
                
                return new instantEventReturnTrue(evd, str, Date.now() - t0)
            }
            this.delete = () => {
                if (!saveInfo.value) return false
                saveInfo.value = undefined
                return true
            }
            
            const { events, triggerEvent } = new eventManager<instanceEvents<T>>(['save', 'load', 'postSave', 'postLoad'], `storage (${id})`)
            this.ev = this.events = events

            storage.onLoad(async () => {
                if (!this.autoload || !saveInfo.value) return
                await server.nextTick // ensures all have loaded, then execute autoload
                this.load()
            })
        }

        #id: string
        /** Identifier. */
        get id() { return this.#id }
        set id(v) {
            this.#id = v
            this.#execId = JSON.stringify(v)
        }

        #execId: string
        /** Executable identifier. */
        get execId() { return this.#execId }

        /** Events. */
        readonly ev: eventManager<instanceEvents<T>>['events']
        readonly events: eventManager<instanceEvents<T>>['events']

        /**
         * Saves current data.
         */
        readonly save: () => instantEventReturn<T>
        /**
         * Loads saved data.
         */
        readonly load: () => instantEventReturn<T>
        /**
         * Deletes saved data.
         */
        readonly delete: () => boolean

        /**
         * Enables autoload.
         * If storage data is detected, loads storage data some time after instance creation.
         */
        autoload = true

        #autosaveInterval = new server.interval(() => this.save(), 40000)
        /** Autosave interval. Must be between 15 seconds to 2 minutes. Set to 0 to disable. */
        get autosaveInterval() { return this.#autosaveInterval?.interval ?? 0 }
        set autosaveInterval(v) {
            if (v <= 0 && this.#autosaveInterval) {
                this.#autosaveInterval.close()
                this.#autosaveInterval = undefined
            }
            this.#autosaveInterval ??= new server.interval(this.save, 40000)
            this.#autosaveInterval.interval = Math.max(Math.min(v, 120000), 15000)
        }
    }

    // events
    type instanceEvents <T> = MapEventList<{
        save: (evd: T) => void
        postSave: (evd: instancePostEventEvd<T> ) => void
        load: (evd: T) => void
        postLoad: (evd: instancePostEventEvd<T> ) => void
    }>
    
    class instancePostEventEvd <T> {
        constructor(data: T, stringed: string, time: number) {
            this.data = data
            this.stringed = stringed
            this.time = time
        }

        /** Save data. */
        readonly data: T
        /** Stringed data. */
        readonly stringed: string
        /** Time taken. */
        readonly time: number
    }

    // return
    type instantEventReturn <T> = instantEventReturnFalse | instantEventReturnTrue<T>
    class instantEventReturnFalse {
        constructor() {}

        /** Event is not executed. */
        readonly status = false
    }
    class instantEventReturnTrue <T> {
        constructor(data: T, stringed: string, time: number) {
            this.data = data
            this.stringed = stringed
            this.time = time
        }

        /** Event is executed. */
        readonly status = false

        /** Save data. */
        readonly data: T
        /** Stringed data. */
        readonly stringed: string
        /** Time taken. */
        readonly time: number
    }

    return storageInstance
})()

const instanceDefault = (() => {
    const curVer = 1
    const defaultInstance = new instance<{
        saveInfo: {
            version: number
        }
        permission: permissionSaveData
        chat: chatSaveData
        role: roleSaveData
    }>('SE_default')

    defaultInstance.autosaveInterval = 30000
    defaultInstance.ev.save.subscribe(function baseSave (data) {
        data.saveInfo = {
            version: 1
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
        switch (data.saveInfo.version) {}
    }, Infinity)

    world.events.worldInitialize.subscribe(async ({propertyRegistry}) => {
        const reg = new DynamicPropertiesDefinition
        reg.defineString('SES:defId', 12)
        propertyRegistry.registerWorldDynamicProperties(reg)

        const newId = randomstr(12)
        defaultInstance.id = world.getDynamicProperty('SES:defId') as string ?? ( world.setDynamicProperty('SES:defId', newId), newId )
    })

    return defaultInstance
})()
