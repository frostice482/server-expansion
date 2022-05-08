import { Player, world } from "mojang-minecraft"
import eventManager, { MapEventList } from "./evmngr.js"

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
    readonly sleepAwait = <T extends Promise<any>>(promise: T, response: vThreadAwaitResponse<T>) => {
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
    constructor(fn: () => vThread['fn']) {
        this.fn = fn()
        this.name = fn.name || '<anonymous>'
        vThreadList.push(this)
    }
}

let timeoutList: timeout[] = []
let intervalList: Set<interval> = new Set
let vThreadList: vThread[] = []

const ticker = (function*(){
    let delta = 0
    while(true) {
        const waitTill = Date.now() + 50 - delta
        while ( Date.now() < waitTill ) {
            // timeout
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

            // interval
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

            // vthread
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

        const t1 = Date.now()
        yield
        delta = Date.now() - t1
    }
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

export default class server {
    static readonly interval = interval
    static readonly timeout = timeout
    static readonly vThread = vThread

    static readonly ev = events
    static readonly events = events

    static readonly start = () => {
        world.events.tick.subscribe(() => ticker.next())

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
}
