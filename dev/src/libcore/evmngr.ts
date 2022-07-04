import { empty } from "./misc.js"

export default class eventManager <T extends Record<string, any>> {
    /** Events. */
    readonly events: {
        [K in keyof T]: {
            /**
             * Subscribes to the event.
             * @param callback Function to be executed when the event is triggered.
             * @param priority Call priority.
             */
            subscribe: (callback: fnCallback<T[K]>, priority?: number) => void
            /**
             * Unsubscribes from the event.
             * @param callback Function to be unsubscribed from the event.
             */
            unsubscribe: (callback: fnCallback<T[K]>) => boolean
        }
    } = empty()

    /** Triggers an event. */
    readonly triggerEvent: {
        [K in keyof T]: (eventData: T[K], ctrl?: controlEvents) => eventControlDataBind
    } = empty()

    /** Event manager data. */
    readonly data: {
        [K in keyof T]: {
            list: Map<fnCallback<T[K]>, number>
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
                
                const controlDataBind: eventControlDataBind = { break: false }
                const control = new eventControl(controlDataBind)
                for (const [fn] of localData.list)
                    try { fn(evd, control) }
                    catch(e) {
                        const d: triggerOnErrorEvent = { break: false, log: true, reason: e }
                        ectrl.onError?.(d)

                        if (d.log) console.warn(`${name} > events > ${k} (${fn.name || '<anonymous>'}): ${ e instanceof Error ? `${e}\n${e.stack}` : e }`)
                        if (d.break) break
                    }
                    finally { if (controlDataBind.break) break }
                
                return controlDataBind
            }
        }
    }
}

class eventControl {
    /**
     * Stops event execution.
     * Any function that has lower priority won't be executed.
     */
    break: (reason?: any) => void

    constructor(dataBind: eventControlDataBind, ctrl: controlEvents = {}) {
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

// type definition
type eventControlDataBind = {
    break: boolean
    breakReason?: any
}

type controlEvents = {
    onBreak?: (evd: controlOnBreakEvent) => void
    onError?: (evd: triggerOnErrorEvent) => void
}

type controlOnBreakEvent = {
    cancel: boolean,
    readonly reason?: any
}

type triggerOnErrorEvent = {
    break: boolean,
    log: boolean,
    readonly reason: any
}

type fnCallback<T> = (evd: T, control: eventControl) => any