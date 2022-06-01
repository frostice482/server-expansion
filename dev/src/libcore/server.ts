import { Player, world } from "mojang-minecraft"
import eventManager, { MapEventList } from "./evmngr.js"

export default class server {
    static get interval() { return interval }
    static get timeout() { return timeout }
    static get vThread() { return vThread }

    static get ev() { return events }
    static get events() { return events }

    static get ticker() { return ticker }

    /** Server time. */
    static time: number = null

    static readonly start = () => {
        world.events.tick.subscribe(() => {
            // next tick
            this.#nextTickRes()
            this.nextTick = new Promise(res => this.#nextTickRes = res)
            // ticker
            ticker[ticker.level]()
        })

        world.events.tick.subscribe(() => {
            for (const plr of eventQueues.playerJoin)
                try {
                    plr.nameTag // fails: player doesn't exist, success: player exist
                    try {
                        plr.runCommand('testfor @s') // fails: player hasn't loaded, success: player loaded
                        eventQueues.playerJoin.delete(plr)
                        triggerEvent.playerLoad(plr)
                    } catch {}
                } catch {
                    eventQueues.playerJoin.delete(plr)
                }
        })

        world.events.playerJoin.subscribe(({player}) => {
            eventQueues.playerJoin.add(player)
            triggerEvent.playerJoin(player)
        })

        for (const plr of world.getPlayers()) {
            triggerEvent.playerJoin(plr)
            triggerEvent.playerLoad(plr)
        }
    }

    static #nextTickRes: (v?: any) => void
    static nextTick = new Promise(res => this.#nextTickRes = res)

    protected constructor() { throw new TypeError('Class is not constructable') }
}

// interval, timeout, vthread
class timeout {
    /** Function to be called. */
    fn: (delay: number) => void
    /** Name. */
    readonly name: string
    /** Next call time in UNIX milliseconds. */
    call: number
    /** Creation time in UNIX milliseconds. */
    creation: number
    /** Tolerated delay. */
    tolerate: number
    isClosed = false
    /** Closes timeout. */
    close = () => void ( this.isClosed = true )

    /**
     * Creates a new timeout object.
     * @param fn Function to be called.
     * @param ms Call time.
     * @param tolerate Tolerated delay.
     */
    constructor(fn: timeout['fn'], ms: number, tolerate = 25) {
        const t = Date.now()
        this.fn = fn
        this.name = fn.name || '<anonymous>'
        this.creation = t
        this.call = t + ms + tolerate
        this.tolerate = tolerate
        timeoutList.push(this)
    }
}
class interval {
    /** Function to be called. */
    fn: (delay: number) => void
    /** Name. */
    readonly name: string
    /** Next call time in UNIX milliseconds. */
    nextCall: number
    /** Previous call time in UNIX milliseconds. */
    lastCall: number
    /** Call interval. */
    interval: number
    /** Maximum call per tick. */
    maxCallPerTick: number
    /** Tolerated delay. */
    tolerate: number
    /** Closes interval. */
    close = () => void intervalList.delete(this)

    /**
     * Creates a new interval object.
     * @param fn Function to be called.
     * @param ms Call time.
     * @param tolerate Tolerated delay.
     * @param maxCallPerTick Maximum function call per tick.
     */
    constructor(fn: timeout['fn'], ms: number, tolerate = 25, maxCallPerTick = 2) {
        const t = Date.now()
        this.fn = fn
        this.name = fn.name || '<anonymous>'
        this.interval = ms
        this.lastCall = t
        this.nextCall = t + ms + tolerate
        this.tolerate = tolerate
        this.maxCallPerTick = maxCallPerTick
        intervalList.add(this)
    }
}
type vThreadAwaitResponse<T extends Promise<any>> = {
    /** Function to be called on resolve. */
    onResolve?: (v: Awaited<T>) => void
    /** Function to be called on reject. */
    onReject?: (v: Awaited<T>) => void
    /** Makes the generator throw an error if rejected and `onReject` function is undefined. */
    onRejectThrow?: boolean
}
class vThread {
    /** Generator. */
    fn: Generator<any, any, any>
    /** Sleeps the thread until specified time in UNIX milliseconds. */
    sleepUntil = -Infinity
    /** Name. */
    readonly name: string
    /**
     * Sleeps the thread until specified time.
     * @param duration Sleep duration.
     */
    readonly sleep = (duration: number) => ( this.sleepUntil = Date.now() + duration, this )
    /**
     * Sleeps the thread, waiting for the promise to be resolved / rejected, then reawakes the thread.
     * @param promise Promise.
     */
    readonly sleepAwait = <T extends Promise<any>>(promise: T, response: vThreadAwaitResponse<T> = {}) => {
        this.sleepUntil = Infinity
        promise.then((v) => {
            this.sleepUntil = -Infinity
            try { response.onResolve?.(v) }
            catch (e) { console.error(`server > vThread > sleepAwait (resolve) (${this.name}): ${ e instanceof Error ? `${e}\n${e.stack}` : e }`) }
        }, (v) => {
            this.sleepUntil = -Infinity
            if ( ( response.onRejectThrow ?? true ) && !response.onReject )
                try { this.fn.throw(v) }
                finally { return }
            try { response.onReject?.(v) }
            catch (e) { console.error(`server > vThread > sleepAwait (reject) (${this.name}): ${ e instanceof Error ? `${e}\n${e.stack}` : e }`) }
        })
    }
    /**
     * Closes the thread.
     */
    readonly close = () => void this.fn.return(null)

    /**
     * Creates a new vThread data.
     * @param fn Generator function.
     */
    constructor(fn: (v: vThread) => vThread['fn']) {
        this.fn = fn(this)
        this.name = fn.name || '<anonymous>'
        vThreadList.push(this)
    }
}

let timeoutList: timeout[] = []
let intervalList: Set<interval> = new Set
let vThreadList: vThread[] = []

const subticker = {
    timeout: () => {
        const newTimeoutList: timeout[] = []
        for (let timeout of timeoutList) {
            if (timeout.isClosed) continue
            const t = Date.now()
            if ( timeout.call <= t + timeout.tolerate )
                try { timeout.fn( t - timeout.creation ) }
                catch (e) { console.error(`server > timeout (${timeout.name}): ${ e instanceof Error ? `${e}\n${e.stack}` : e }`) }
            else newTimeoutList.push(timeout)
        }
        timeoutList = newTimeoutList
    },
    interval: () => {
        for (let interval of intervalList) {
            let c = interval.maxCallPerTick,
                t: number
            while ( c > 0 && interval.nextCall <= ( t = Date.now() ) + interval.tolerate )
                try { interval.fn( t - interval.lastCall ) }
                catch (e) { console.error(`server > interval (${interval.name}): ${ e instanceof Error ? `${e}\n${e.stack}` : e }`) }
                finally {
                    c--
                    interval.lastCall = t
                    interval.nextCall += interval.interval
                }
            if ( !c && interval.nextCall <= ( t = Date.now() ) - interval.tolerate )
                interval.nextCall = t + interval.interval + interval.tolerate - ( t - interval.nextCall ) % interval.interval
        }
    },
    vThread: () => {
        const newVThreadList: vThread[] = []
        for (let thread of vThreadList) {
            const t = Date.now()
            if (t < thread.sleepUntil) {
                newVThreadList.push(thread)
                continue
            }
            try { if (thread.fn.next().done) continue }
            catch (e) {
                console.error(`server > vThread (${thread.name}): ${ e instanceof Error ? `${e}\n${e.stack}` : e }`)
                continue
            }
            newVThreadList.push(thread)
        }
        vThreadList = newVThreadList
    }
}

const ticker = (() => {
    const { timeout, interval, vThread } = subticker
    let tickerTime: number = null
    const o = {
        /**
         * Operates ticker at full usage.
         * High precision timeout and interval, vThread executed every free loop
         * Allows serverTime and tickerTime
         */
        3: (() => {
            const gen = (function*(){
                let delta = 0
                while(true) {
                    const t1 = Date.now()
                    const waitTill = t1 + 50 - delta
                    
                    do {
                        timeout()
                        interval()
                        vThread()
                    } while ( Date.now() < waitTill )
                    
                    const t2 = Date.now()
                    tickerTime = Math.max(50 - delta, 0)
                    
                    delta = ( yield null ) ?? Date.now() - t2
                    server.time = delta
                }
            })()
            gen.next()
            return gen.next.bind(gen) as typeof gen.next
        })(),
        /**
         * Operates ticker at full usage.
         * Low precision timeout and interval, vThread executed every free loop
         * Allows serverTime and tickerTime
         */
        2: (() => {
            const gen = (function*(){
                let delta = 0
                while(true) {
                    const t1 = Date.now()
                    const waitTill = t1 + 50 - delta
                    
                    timeout()
                    interval()
                    do vThread()
                    while ( Date.now() < waitTill ) 
                    
                    const t2 = Date.now()
                    tickerTime = Math.max(50 - delta, 0)
                    
                    delta = ( yield null ) ?? Date.now() - t2
                    server.time = delta
                }
            })()
            gen.next()
            return gen.next.bind(gen) as typeof gen.next
        })(),
        /**
         * Operates ticker at lower usage.
         * Low precision timeout and interval, vThread executed 10 times per tick
         * allows tickerTime
         */
        1: () => {
            const t1 = Date.now()
            
            timeout()
            interval()
            for (let i = 0; i < 10; i++) vThread()
            
            const t2 = Date.now()
            tickerTime = t2 - t1
        },
        /**
         * Operates ticker at lower usage.
         * Low precision timeout and interval, executed once per tick
         * allows tickerTime
         */
        0: () => {
            const t1 = Date.now()
            
            timeout()
            interval()
            vThread()
            
            const t2 = Date.now()
            tickerTime = t2 - t1
        },

        get level() { return current },
        set level(v) {
            if ( v == current || (current != 0 && current != 1 && current != 2 && current != 3 ) ) return
            current = v
            server.time = null
            tickerTime = null
            switch (v) {
                case 0:
                case 1: break
                case 2:
                case 3:
                    o[v](0)
                break
            }
        },

        /** Ticker time. */
        get time() { return tickerTime }
    }
    let current: 0 | 1 | 2 | 3 = 1
    return o
})()

// event stuff
type EventList = MapEventList<{
    playerJoin: (plr: Player) => void
    playerLoad: (plr: Player) => void
}>

const { events, triggerEvent } = new eventManager<EventList>(['playerLoad', 'playerJoin'], 'server')

const eventQueues = {
    playerJoin: new Set<Player>()
}