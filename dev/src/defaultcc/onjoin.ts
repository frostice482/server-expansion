import { Player } from "mojang-minecraft";
import cc from "../libcore/cc.js";
import { execCmd } from "../libcore/mc.js";
import plr from "../libcore/plr.js";
import server from "../libcore/server.js";
import storage from "../libcore/storage.js";
import { TypedArray, TypedValue } from "../libcore/typedvalues.js";

const TArrayString = new TypedArray(new TypedValue('string'))
TArrayString.name = 'string[]'

new cc('onjoin', {
    description: new cc.description({
        name: 'On Join',
        description: 'Triggers commands when a player joins the server.',
        aliases: ['on-join', 'on-join-command', 'on-join', 'on-join-cmd'],
        usage: [
            [
                [ 'onjoin', 'set', { type: [['value', 'string[]']], name: 'cmds' } ],
                'Sets join commands.'
            ], [
                [ 'onjoin', 'add_top', { type: [['value', 'any']], name: 'cmd' } ],
                'Adds join command on the top position.'
            ], [
                [ 'onjoin', 'add_bottom', { type: [['value', 'any']], name: 'cmd' } ],
                'Adds join command on the bottom position.'
            ], [
                [ 'onjoin', 'add', { type: [['value', 'number']], name: 'pos' }, { type: [['value', 'any']], name: 'cmd' } ],
                'Adds join command on the specified position.'
            ], [
                [ 'onjoin', 'remove_top', { type: [['value', 'any']], name: 'cmd' } ],
                'Removes join command on the top position.'
            ], [
                [ 'onjoin', 'remove_bottom', { type: [['value', 'any']], name: 'cmd' } ],
                'Removes join command on the bottom position.'
            ], [
                [ 'onjoin', 'remove', { type: [['value', 'number']], name: 'pos' }, { type: [['value', 'any']], name: 'cmd' } ],
                'Removes join command on the specified position.'
            ], [
                [ 'onjoin', 'list' ],
                'Shows join command list.'
            ], [
                [ 'onjoin', 'clear' ],
                'Clears join commands.'
            ], [
                [ 'onjoin', 'config' ],
                'Shows on join configuration.'
            ], [
                [ 'onjoin', 'config', { name: 'propertyKey', type: [['keyword', 'execute_after_register']] }, { name: 'value', type: [['value', 'any*']], required: false } ],
                'Shows / sets a property of on join configuration.'
            ]
        ]
    }),
    minPermLvl: 80,
    typedArgs: new cc.typedArgs([
        { sequence: [ 'set', cc.parser.typedValues(TArrayString) ] },
        { sequence: [ 'add_top', cc.parser.any ] },
        { sequence: [ 'add_bottom', cc.parser.any ] },
        { sequence: [ 'add', cc.parser.number, cc.parser.any ] },
        { sequence: [ 'remove_top', cc.parser.any ] },
        { sequence: [ 'remove_bottom', cc.parser.any ] },
        { sequence: [ 'remove', cc.parser.number, cc.parser.any ] },
        { sequence: [ 'list' ] },
        { sequence: [ 'clear' ] },
        { minArgs: 1, sequence: [ 'config', 'execute_after_register', cc.parser.boolean ] },
    ]),
    triggers: /^on-?join(-?(cmd|command))?$/i,
    onTrigger: ({ log, typedArgs: tArgs }) => {
        switch (tArgs[0]) {
            case 'set': {
                cmds = tArgs[1]
                return log([
                    ` `,
                    `On join commands has been set to:`,
                    ...cmds.map((v, i) => ` §a${i+1} §8:§r ${format(v)}`),
                    ` `,
                ])
            }
            case 'add_top': {
                const ncmd = tArgs.slice(1).join(' ')
                cmds.unshift(ncmd)
                return log([
                    `Added on join command on top position (current length: ${cmds.length}).`,
                    format(ncmd)
                ])
            }
            case 'add_bottom': {
                const ncmd = tArgs.slice(1).join(' ')
                cmds.push(ncmd)
                return log([
                    `Added on join command on bottom position (current length: ${cmds.length}).`,
                    format(ncmd)
                ])
            }
            case 'add': {
                const ncmd = tArgs.slice(2).join(' ')
                cmds.splice(tArgs[1] - 1, 0, ncmd)
                return log([
                    `Added on join command on position ${tArgs[1]} (current length: ${cmds.length}).`,
                    format(ncmd)
                ])
            }
            case 'remove_top': {
                const rcmd = cmds.shift()
                return log([
                    `Removed on join command on top position (current length: ${cmds.length}).`,
                    format(rcmd)
                ])
            }
            case 'remove_bottom': {
                const rcmd = cmds.pop()
                return log([
                    `Removed on join command on bottom position (current length: ${cmds.length}).`,
                    format(rcmd)
                ])
            }
            case 'remove': {
                const rcmd = cmds.splice(tArgs[1] - 1, 1)[0]
                return log([
                    `Removed on join command on position ${tArgs[1]} (current length: ${cmds.length}).`,
                    format(rcmd)
                ])
            }
            case 'list': {
                return log([
                    ` `,
                    `On join command list:`,
                    ...cmds.map((v, i) => ` §a${i+1} §8:§r ${format(v)}`),
                    ` `,
                ])
            }
            case 'clear': {
                cmds = []
                return log(`On join commands has been cleared.`)
            }
            case 'config': {
                const isSet = 2 in tArgs
                
                switch (tArgs[1]) {
                    case 'execute_after_register': {
                        if (isSet) return log(`Executer after register has been set to $a${executeAfterRegister = tArgs[2]}`)
                        return log(`Executer after register: $a${executeAfterRegister}`)
                    }
                    default:
                        return log([
                            ` `,
                            `On join configuration list:`,
                            ` §8:§r Executer after register §7(execute_after_register)§r: $a${executeAfterRegister}`,
                            ` `,
                        ])
                }
            }
        }
    },
    onDelete: () => {
        storage.instance.default.ev.save.unsubscribe(fnStorageSave)
        storage.instance.default.ev.load.unsubscribe(fnStorageLoad)
        plr.ev.playerRegister.subscribe(fnPlrReg)
        server.ev.playerLoad.subscribe(fnPlrLoad)
    }
})

const format = (v: string) => v.replace(/\u00a7(.)/g, (m, k) => `§7[S${k}]§r`).replace(/#name/g, `§d$&§r`)

let cmds: string[] = [],
    executeAfterRegister = true

type onSaveLoad = Parameters<typeof storage.instance.default.ev.save.subscribe>[0]
let fnStorageSave: onSaveLoad, fnStorageLoad: onSaveLoad, fnPlrReg: (plr: Player) => void, fnPlrLoad: (plr: Player) => void

storage.instance.default.ev.save.subscribe(fnStorageSave = (data) => {
    data.icc_onJoin = {
        cmds,
        executeAfterRegister
    }
})

storage.instance.default.ev.load.subscribe(fnStorageLoad = (data) => {
    if (!data.icc_onJoin) return
    cmds = data.icc_onJoin.cmds
    executeAfterRegister = data.icc_onJoin.executeAfterRegister
})

const regPlrSets = new WeakSet<Player>()

plr.ev.playerRegister.subscribe(fnPlrReg = (plr) => {
    if (!executeAfterRegister) regPlrSets.add(plr)
})

server.ev.playerLoad.subscribe(fnPlrLoad = (plr) => {
    if (regPlrSets.has(plr)) return regPlrSets.delete(plr)
    for (const cmd of cmds) execCmd( cmd.replace(/#name/g, plr.nickname), plr )
})
