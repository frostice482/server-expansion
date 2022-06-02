import { empty } from "./misc.js"

export default class eventManager <T extends MappedEventList> {
    /** Events. */
    readonly events: {
        [K in keyof T]: {
            /**
             * Subscribes to the event.
             * @param callback Function to be executed when the event is triggered.
             * @param priority Call priority.
             */
            subscribe: (callback: T[K], priority?: number) => void
            /**
             * Unsubscribes from the event.
             * @param callback Function to be unsubscribed from the event.
             */
            unsubscribe: (callback: T[K]) => boolean
        }
    } = empty()

    /** Triggers an event. */
    readonly triggerEvent: {
        [K in keyof T]: (eventData: Parameters<T[K]>[0], ctrl?: triggerEventControl) => eventControlDataBind
    } = empty()
    /** Event manager data. */
    readonly data: {
        [K in keyof T]: {
            list: Map<T[K], number>
            cached: boolean
        }
    } = empty()

    /**
     * Creates a new event manager.
     * @param eventKeys Event keys.
     * @param name Event manager name.
     */
    constructor(eventKeys: (keyof T)[], name = '<unnamed>') {
        const { events, triggerEvent, data } = this
        for (const k of eventKeys) {
            data[k] = {
                list: new Map,
                cached: true
            }
            const localData = data[k]

            events[k] = {
                subscribe: (evd, priority = 1) => { localData.list.set(evd, priority); localData.cached = false },
                unsubscribe: (evd) => localData.list.delete(evd)
            }

            triggerEvent[k] = (evd, ectrl = {}) => {
                if (!localData.cached) {
                    localData.cached = true
                    localData.list = new Map([...localData.list].sort( (a, b) => b[1] - a[1]) )
                }
                
                const dataBind: eventControlDataBind = { break: false }
                const ctrl = new eventControl(dataBind)
                for (const [fn] of localData.list)
                    try { fn(evd, ctrl) }
                    catch(e) {
                        const d = { break: false, log: true, reason: e }
                        ectrl.onError?.(d)

                        if (d.log) console.warn(`${name} > events > ${k} (${fn.name || '<anonymous>'}): ${ e instanceof Error ? `${e}\n${e.stack}` : e }`)
                        if (d.break) break
                    }
                    finally { if (dataBind.break) break }
                
                return dataBind
            }
        }
    }
}

type triggerEventControl = {
    onBreak?: (evd: { cancel: boolean, readonly reason?: any }) => void
    onError?: (evd: { break: boolean, log: boolean, readonly reason: any }) => void
}

type eventControlDataBind = {
    break: boolean
    breakReason?: any
}

class eventControl {
    /**
     * Stops event execution.
     * Any function that has lower priority won't be executed.
     */
    break: (reason?: any) => void

    constructor(dataBind: eventControlDataBind, ctrl: EventControlControl = {}) {
        this.break = (r) => {
            const d = { cancel: false, reason: dataBind.breakReason }
            ctrl.onBreak?.(d)

            if (!d.cancel) {
                dataBind.break = true
                dataBind.breakReason = r
            }
        }
    }
}

type EventControlControl = {
    onBreak?: (evd: { cancel: boolean, readonly reason?: any }) => void
}

type EventList = List<(eventData: any) => void>
export type MapEventList <T extends EventList> = { [K in keyof T]: (eventData: Parameters<T[K]>[0], control: eventControl) => void }
type MappedEventList = List<(eventData: any, control: eventControl) => void>
