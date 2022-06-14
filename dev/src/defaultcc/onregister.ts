import { Player } from "mojang-minecraft";
import cc from "../libcore/cc.js";
import { execCmd } from "../libcore/mc.js";
import plr from "../libcore/plr.js";
import storage from "../libcore/storage.js";
import { TypedArray, TypedValue } from "../libcore/typedvalues.js";

const TArrayString = new TypedArray(new TypedValue('string'))
TArrayString.name = 'string[]'

new cc('onregister', {
    description: new cc.description({
        name: 'On Register',
        description: 'Triggers commands when a player registered.',
        aliases: ['on-register', 'on-register-command', 'on-reg', 'on-reg-cmd'],
        usage: [
            [
                [ 'onreg', 'set', { type: [['value', 'string[]']], name: 'cmds' } ],
                'Sets register commands.'
            ], [
                [ 'onreg', 'add_top', { type: [['value', 'any']], name: 'cmd' } ],
                'Adds register command on the top position.'
            ], [
                [ 'onreg', 'add_bottom', { type: [['value', 'any']], name: 'cmd' } ],
                'Adds register command on the bottom position.'
            ], [
                [ 'onreg', 'add', { type: [['value', 'number']], name: 'pos' }, { type: [['value', 'any']], name: 'cmd' } ],
                'Adds register command on the specified position.'
            ], [
                [ 'onreg', 'remove_top', { type: [['value', 'any']], name: 'cmd' } ],
                'Removes register command on the top position.'
            ], [
                [ 'onreg', 'remove_bottom', { type: [['value', 'any']], name: 'cmd' } ],
                'Removes register command on the bottom position.'
            ], [
                [ 'onreg', 'remove', { type: [['value', 'number']], name: 'pos' }, { type: [['value', 'any']], name: 'cmd' } ],
                'Removes register command on the specified position.'
            ], [
                [ 'onreg', 'list' ],
                'Shows register command list.'
            ], [
                [ 'onreg', 'clear' ],
                'Clears register commands.'
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
        { sequence: [ 'clear' ] }
    ]),
    triggers: /^on-?(register|reg)(-?(cmd|command))?$/i,
    onTrigger: ({ log, typedArgs: tArgs }) => {
        switch (tArgs[0]) {
            case 'set': {
                cmds = tArgs[1]
                return log([
                    ` `,
                    `On register commands has been set to:`,
                    ...cmds.map((v, i) => ` §a${i+1} §8:§r ${format(v)}`),
                    ` `,
                ])
            }
            case 'add_top': {
                const ncmd = tArgs.slice(1).join(' ')
                cmds.unshift(ncmd)
                return log([
                    `Added on register command on top position (current length: ${cmds.length}).`,
                    format(ncmd)
                ])
            }
            case 'add_bottom': {
                const ncmd = tArgs.slice(1).join(' ')
                cmds.push(ncmd)
                return log([
                    `Added on register command on bottom position (current length: ${cmds.length}).`,
                    format(ncmd)
                ])
            }
            case 'add': {
                const ncmd = tArgs.slice(2).join(' ')
                cmds.splice(tArgs[1] - 1, 0, ncmd)
                return log([
                    `Added on register command on position ${tArgs[1]} (current length: ${cmds.length}).`,
                    format(ncmd)
                ])
            }
            case 'remove_top': {
                const rcmd = cmds.shift()
                return log([
                    `Removed on register command on top position (current length: ${cmds.length}).`,
                    format(rcmd)
                ])
            }
            case 'remove_bottom': {
                const rcmd = cmds.pop()
                return log([
                    `Removed on register command on bottom position (current length: ${cmds.length}).`,
                    format(rcmd)
                ])
            }
            case 'remove': {
                const rcmd = cmds.splice(tArgs[1] - 1, 1)[0]
                return log([
                    `Removed on register command on position ${tArgs[1]} (current length: ${cmds.length}).`,
                    format(rcmd)
                ])
            }
            case 'list': {
                return log([
                    ` `,
                    `On register command list:`,
                    ...cmds.map((v, i) => ` §a${i+1} §8:§r ${format(v)}`),
                    ` `,
                ])
            }
            case 'clear': {
                cmds = []
                return log(`On register commands has been cleared.`)
            }
        }
    },
    onDelete: () => {
        storage.instance.default.ev.save.unsubscribe(fnStorageSave)
        storage.instance.default.ev.load.unsubscribe(fnStorageLoad)
        plr.ev.playerRegister.subscribe(fnPlrReg)
    },
    isDefault: true
})

const format = (v: string) => v.replace(/\u00a7(.)/g, (m, k) => `§7[S${k}]§r`).replace(/#name/g, `§d$&§r`)

let cmds: string[] = []

type onSaveLoad = Parameters<typeof storage.instance.default.ev.save.subscribe>[0]
let fnStorageSave: onSaveLoad, fnStorageLoad: onSaveLoad, fnPlrReg: (plr: Player) => void

storage.instance.default.ev.save.subscribe(fnStorageSave = (data) => {
    data.icc_onReg = {
        cmds
    }
})

storage.instance.default.ev.load.subscribe(fnStorageLoad = (data) => {
    if (!data.icc_onReg) return
    cmds = data.icc_onReg.cmds
})

plr.ev.playerRegister.subscribe(fnPlrReg = (plr) => {
    for (const cmd of cmds) execCmd( cmd.replace(/#name/g, plr.nickname), plr )
})
