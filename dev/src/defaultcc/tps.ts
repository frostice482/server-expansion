import { world } from "mojang-minecraft"
import cc from "../libcore/cc.js"
import { execCmd } from "../libcore/mc.js"
import permission from "../libcore/permission.js"
import server from "../libcore/server.js"
import storage from "../libcore/storage.js"
import { TypedArray, TypedValue } from "../libcore/typedvalues.js"

new cc('tps', {
    triggers: /^(server-?)?tps$/,
    onTrigger: ({log, args, executer}) => {
        if (!args[0]) return log([
            ` `,
            `Server TPS: §a${tpsObj.cur.toFixed(2)}§r (min: §a${tpsObj.min.toFixed(2)}§r)`,
            `Load: ${server.ticker.level < 2 ? '§7(unknown)§r' : `§a~${server.time * 2}%§r`}`,
            ` `,
        ])
        const tArgs = cmdta.parse(args)
        switch (tArgs[0]) {
            case 'cmd': {
                const lvl = permission.getLevel(executer.getTags())
                if (lvl <= 80) throw new Error(`Access denied`)
                switch (tArgs[1]) {
                    case 'set': {
                        cmd = tArgs[2]
                        cmdCached = cmd.map(cache)
                        return log([
                            ` `,
                            `TPS commands has been set to:`,
                            ...cmd.map((v, i) => ` §a${i+1} §8:§r ${format(v)}`),
                            ` `,
                        ])
                    }
                    case 'add_top': {
                        const ncmd = tArgs.slice(2).join(' ')
                        cmd.unshift(ncmd)
                        cmdCached.unshift(cache(ncmd))
                        return log([
                            `Added TPS command on top position (current length: ${cmd.length}).`,
                            format(ncmd)
                        ])
                    }
                    case 'add_bottom': {
                        const ncmd = tArgs.slice(2).join(' ')
                        cmd.push(ncmd)
                        cmdCached.push(cache(ncmd))
                        return log([
                            `Added TPS command on bottom position (current length: ${cmd.length}).`,
                            format(ncmd)
                        ])
                    }
                    case 'add': {
                        const ncmd = tArgs.slice(3).join(' ')
                        cmd.splice(tArgs[2] - 1, 0, ncmd)
                        cmdCached.splice(tArgs[2] - 1, 0, cache(ncmd))
                        return log([
                            `Added TPS command on position ${tArgs[2]} (current length: ${cmd.length}).`,
                            format(ncmd)
                        ])
                    }
                    case 'remove_top': {
                        const rcmd = cmd.shift()
                        cmdCached.shift()
                        return log([
                            `Removed TPS command on top position (current length: ${cmd.length}).`,
                            format(rcmd)
                        ])
                    }
                    case 'remove_bottom': {
                        const rcmd = cmd.pop()
                        cmdCached.pop()
                        return log([
                            `Removed TPS command on bottom position (current length: ${cmd.length}).`,
                            format(rcmd)
                        ])
                    }
                    case 'remove': {
                        const rcmd = cmd.splice(tArgs[2] - 1, 1)[0]
                        cmdCached.splice(tArgs[2] - 1, 1)[0]
                        return log([
                            `Removed TPS command on position ${tArgs[2]} (current length: ${cmd.length}).`,
                            format(rcmd)
                        ])
                    }
                    case 'list': {
                        return log([
                            ` `,
                            `TPS command list:`,
                            ...cmd.map((v, i) => ` §a${i+1} §8:§r ${format(v)}`),
                            ` `,
                        ])
                    }
                    case 'clear': {
                        cmd = []
                        cmdCached = []
                        return log(`TPS commands has been cleared.`)
                    }
                    case 'interval': {
                        if (!(2 in tArgs)) return log(`TPS command interval: §a${interval.interval}ms`)
                        return log(`TPS command interval has been set to §a${interval.interval = tArgs[2]}ms`)
                    }
                }
            }
        }
    },
    isDefault: true,
    onDelete: () => {
        storage.instance.default.ev.save.unsubscribe(fnStorageSave)
        storage.instance.default.ev.load.unsubscribe(fnStorageLoad)
        world.events.tick.unsubscribe(refresh)
        interval.close()
    }
})

const cmdta = new cc.typedArgs([
    { sequence: [ 'cmd', 'set', cc.parser.typedValues(new TypedArray(new TypedValue('string'))) ] },
    { sequence: [ 'cmd', 'add_top', cc.parser.any ] },
    { sequence: [ 'cmd', 'add_bottom', cc.parser.any ] },
    { sequence: [ 'cmd', 'add', cc.parser.number, cc.parser.any ] },
    { sequence: [ 'cmd', 'remove_top' ] },
    { sequence: [ 'cmd', 'remove_bottom' ] },
    { sequence: [ 'cmd', 'remove', cc.parser.number ] },
    { sequence: [ 'cmd', 'list' ] },
    { sequence: [ 'cmd', 'clear' ] },
    { minArgs: 2, sequence: [ 'cmd', 'interval', cc.parser.number ] },
])

const format = (v: string) => v.replace(/\$\{tps(\.\w+)*(,\d+)?(,\d+)?\}/g, '§d$&§r')

// command
let cmd: string[] = []

// command cache stuff
let cmdCached: (string | { dir: string[], minWidth: number, fixedDecimal: number })[][] = []
const cache = (cmd: string) => {
    const r = /\$\{tps(?<dir>(\.\w+)*)(,(?<fixedDecimal>\d+))?(,(?<minWidth>\d+))?\}/g,
        o: typeof cmdCached[number] = []
    let m: RegExpExecArray

    while (m = r.exec(cmd)) {
        const { dir, minWidth = '0', fixedDecimal = '1' } = m.groups

        o.push(cmd.substring(0, m.index))
        o.push({
            dir: dir.substring(1).split('.').filter(v => v),
            minWidth: +minWidth,
            fixedDecimal: +fixedDecimal
        })

        cmd = cmd.substring(r.lastIndex)
        r.lastIndex = 0
    }
    o.push(cmd)

    return o
}
cmdCached = cmd.map(cache)

// tps data stuff
type tpsObjData = {
    get servertime(): number
    cur: number
    avg: number
    min: number
    max: number
    unstable: {
        cur: number
        ttl: number
        avg: number
        min: number
        max: number
    }
    count: number
}
let tpsObj: tpsObjData & { get p(): tpsObjData } = Object.defineProperty({
    get p() { return tpsObjP },
    get servertime() { return server.time },
    get tickertime() { return server.ticker.time },
    cur: 20,
    avg: 20,
    min: 20,
    max: 20,
    unstable: {
        cur: 0,
        ttl: 0,
        avg: 0,
        min: 0,
        max: 0,
    },
    count: 20
}, 'p', { enumerable: false })
let tpsObjP: tpsObjData = Object.assign({}, tpsObj)

let tpsArr = Array(20).fill(20)

let refresh = world.events.tick.subscribe(({deltaTime}) => {
    const tps = 1 / deltaTime

    tpsArr.push(tps)
    tpsArr.splice(0, Math.max( Math.min( tpsArr.length - Math.round( tps * tps / 20 ), tpsArr.length - 1 ), 0))

    const avg = tpsArr.reduce((a, b) => a + b, 0) / tpsArr.length,
        min = Math.min(...tpsArr),
        max = Math.max(...tpsArr),
        uArr = tpsArr.map(v => Math.abs(v - 20) * 50),
        uttl = uArr.reduce((a, b) => a + b, 0),
        uavg = uttl / uArr.length,
        umin = Math.min(...uArr),
        umax = Math.max(...uArr)
    
    Object.assign(tpsObj, {
        cur: tps,
        avg,
        min,
        max,
        count: tpsArr.length,
        unstable: {
            cur: uArr[uArr.length-1],
            ttl: uttl,
            avg: uavg,
            min: umin,
            max: umax,
        }
    })
})

// command execution
const interval = new server.interval(() => {
    Object.assign(tpsObjP, tpsObj)
    for (const cmd of cmdCached)
        try {
            execCmd(
                cmd.map(v => {
                    if (typeof v == 'string') return v // return if string
                    
                    let o = v.dir.reduce((v, d) => v[d] ?? 0, tpsObj as any) // get object value from directory
                    if (typeof o != 'number') o = o.cur ?? 0 // convert to number if not number
                    return o.toFixed(v.fixedDecimal).padStart(v.minWidth) // 
                }).join(''),
            )
        } catch(e) {
            console.warn(`${e}`)
        }
}, 100)

// storage stuff
type onSaveLoad = Parameters<typeof storage.instance.default.ev.save.subscribe>[0]
let fnStorageSave: onSaveLoad, fnStorageLoad: onSaveLoad

storage.instance.default.ev.save.subscribe(fnStorageSave = (data) => {
    data.icc_tps_cmd = {
        interval: interval.interval,
        cmd: cmd,
    }
})
storage.instance.default.ev.load.subscribe(fnStorageLoad = (data) => {
    if (!data.icc_tps_cmd) return
    interval.interval = data.icc_tps_cmd.interval
    cmd = data.icc_tps_cmd.cmd
    cmdCached = data.icc_tps_cmd.cmd.map(cache)
})
