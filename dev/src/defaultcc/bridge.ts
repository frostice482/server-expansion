import SEBridgeHost from "../libcore/bridgehost.js";
import cc from "../libcore/cc.js";

new cc('bridge', {
    description: new cc.description({
        name: 'Bridge',
        description: 'Manages plugins',
        aliases: ['bridge', 'plugin'],
        usage: [
        ]
    }),
    minPermLvl: 80,
    typedArgs: new cc.typedArgs([
        { sequence: ['list'] },
        { minArgs: 2, sequence: ['info', cc.parser.any, cc.parser.boolean] },
        { sequence: ['execute', cc.parser.any] },
        { sequence: [['delete'], cc.parser.any] },
    ]),
    triggers: /^(bridge|plugins?)$/i,
    onTrigger: ({ log, typedArgs: tArgs }) => {
        switch (tArgs[0]) {
            case 'list': {
                return log([
                    ` `,
                    `Plugin list:`,
                    ...Array.from(SEBridgeHost.plugin.getList(), v => ` §8:§r ${v.name} §7(${v.id})§r §8-§r version §a${v.versionCode}§r${ v.isExecuted ? ', executed' : '' }${ v.type == 'module' ? ', not executable' : '' }`),
                    ` `,
                ])
            }
            case 'info': {
                const pli = SEBridgeHost.plugin.get(tArgs[1])
                if (!pli) throw new cc.error(`Plugin with ID '${tArgs[1]}' not found`, 'ReferenceError')
                const pliExt = pli.toJSON()

                return log([
                    ` `,
                    pli.name,
                    pli.description,
                    ` `,
                    `Author: ${pli.author.map(v => `§a${v}§r`).join(', ')}`,
                    `Version code: §a${pli.versionCode}§r`,
                    `Executed: §a${pli.isExecuted ? 'Yes' : 'No'}§r`,
                    ` `,
                    `Executable: §a${pli.type == 'executable' ? 'Yes' : 'No'}§r`,
                    `Save on register: §a${pliExt.saveOnRegister ? 'Yes' : 'No'}§r`,
                    `Executable on register: §a${pliExt.executeOnRegister ? 'Yes' : 'No'}§r`,
                    ...(tArgs[2] ? [
                    ` `,
                    `§7Storage unique ID: §2${pli.uniqueID}`,
                    `§7Internal modules: ${Object.keys(pliExt.internalModules).join(', ')}`,
                    `§7Execute module entry: ${pliExt.execMain}`,
                    ] : []),
                    ` `
                ])
            }
            case 'execute': {}; break
            case 'delete': {}; break
        }
    }
})
