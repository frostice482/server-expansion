import { DynamicPropertiesDefinition, world } from "mojang-minecraft"
import eventManager from "./evmngr.js"
import scoreboard from "./scoreboard.js"
import server from "./server.js"
import { empty, randomstr } from "./misc.js"

const auth = Symbol()

const storage = (() => {
    class storage {
        /** Storage instance. */
        static get instance() { return instance }
        /** Storage save info. */
        static get saveInfo() { return saveDataInfo }

        /**
         * Executes a save data.
         * @param id Save data identifier.
         */
        static readonly for = (id: string) => new saveDataInfo(auth, id)
    
        /**
         * Deletes a save data.
         * @param id Save data identifier.
         * @returns Boolean - True if save data successfully deleted.
         */
        static readonly delete = (id: string) => scoreboard.objective.delete(id)
    
        protected constructor() { throw new TypeError('Class is not constructable') }
    }

    class saveDataInfo {
        constructor(key: typeof auth, id: string) {
            if (key !== auth) throw new TypeError('Class is not constructable')
            this.id = id

            if (!scoreboard.objective.exist(id)) return
            const sb = scoreboard.objective.edit(id).dummies
            if (!sb.exist(`[SES::${id}]`)) return

            // grab data
            const list: Record<number, string> = empty()
            let len = 0
            for (const [data, order] of sb.getScores()) {
                list[order] = data
                len = len > order ? len : order
            }
            // combine data
            let value = ''
            for (let i = 0; i <= len; i++) value = value.concat(list[i])
            this.#value = JSON.parse(`"${value}"`)
        }
    
        /** Save data identifier. */
        id: string

        #value: string
        get value() { return this.#value }
        set value(v) {
            if (this.#value == v) return
            this.#value = v

            scoreboard.objective.delete(this.id)
            if (v == undefined) return

            const sb = scoreboard.objective.create(this.id).dummies
            sb.set(`[SES::${this.id}]`, -1)
            for (let i = 0; i < v.length / 32767; i++) sb.set(v.substr(i * 32767, 32767), i)
        }
    }

    return storage
})()

type storageDataInfo = typeof storage.saveInfo.prototype

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

            let saveInfo = this.#saveInfo = storage.for(id)

            this.save = () => {
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
                    data: saveData,
                    stringed: stringed,
                    time: Date.now() - t0
                }
            }
            this.load = () => {
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

            server.nextTick.then(() => {
                if (this.autoload && saveInfo.value) this.load()
            })
        }

        #id: string
        /** Storage identifier. */
        get id() { return this.#id }
        set id(v) {
            this.#id = v
            this.#saveInfo.id = v
            this.#execId = JSON.stringify(v)
        }

        #execId: string
        /** Executable identifier. */
        get execId() { return this.#execId }

        #saveInfo: storageDataInfo
        /** Save info. */
        get saveInfo() { return this.#saveInfo }

        readonly ev: eventManager<instanceEvents<T>>['events']
        readonly events: eventManager<instanceEvents<T>>['events']

        /**
         * Saves current data.
         * @returns Save data.
         */
        readonly save: () => instancePostEventEvd<T>
        /**
         * Loads saved data.
         * @returns Save data.
         */
        readonly load: () => instancePostEventEvd<T>
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
            if (v <= 0) {
                if (this.#autosaveInterval) {
                    this.#autosaveInterval.close()
                    this.#autosaveInterval = undefined
                }
                return
            }
            this.#autosaveInterval ??= new server.interval(this.save, 40000)
            this.#autosaveInterval.interval = Math.max(v, 5000)
        }
    }

    // events
    type instanceEvents <T> = {
        save: T
        postSave: instancePostEventEvd<T>
        load: T
        postLoad: instancePostEventEvd<T>
    }
    
    type instancePostEventEvd <T> = {
        readonly data: T
        readonly stringed: string
        readonly time: number
    }

    return storageInstance
})()

const instanceDefault = (() => {
    const curVer = 1.02
    return new (
        class storageInstanceDefault extends instance<{
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
        }> {
            constructor(id: string) {
                super(id)

                this.autosaveInterval = 30000
                this.ev.save.subscribe(function baseSave (data) {
                    data.saveInfo = {
                        version: curVer
                    }
                }, Infinity)
                this.ev.load.subscribe(function baseLoad (data, ctrl) {
                    const br = (type = Error, reason?: string, disableAutosave = true) => {
                        ctrl.break()
                        if (disableAutosave) {
                            this.autosaveInterval = 0
                            reason += ` Autosave has been disabled.`
                        }
                        throw new type(reason)
                    }
                    if (!data?.saveInfo) br(ReferenceError, 'Save data information unavaiable.')
                    if (data.saveInfo.version > curVer) br(RangeError, `Unsupported save version v${curVer}.`)
                    while (data.saveInfo.version != curVer) {
                        switch (data.saveInfo.version) {
                            default:
                                br(TypeError, `Unknown version v${data.saveInfo.version}.`)
                        }
                    }
                }, Infinity)
            
                this.ev.save.subscribe((data) => {
                    data.storage = {
                        autosaveInterval: this.autosaveInterval
                    }
                })
                this.ev.load.subscribe((data) => {
                    if (!data.storage) return
                    this.autosaveInterval = data.storage.autosaveInterval
                })
            
                server.ev.initialize.subscribe(({propertyRegistry}) => {
                    const reg = new DynamicPropertiesDefinition
                    reg.defineString('STR:id', 10)
                    propertyRegistry.registerWorldDynamicProperties(reg)
            
                    const newId = randomstr(10)
                    this.id = `STR:${ world.getDynamicProperty('STR:id') ?? ( world.setDynamicProperty('STR:id', newId), newId ) }`
                    this.#uniqueID = world.getDynamicProperty('STR:id') as string
                })
            }

            #uniqueID: string
            /** Unique save ID. */
            get uniqueID() { return this.#uniqueID }
        }
    )('SE_default')
})()
