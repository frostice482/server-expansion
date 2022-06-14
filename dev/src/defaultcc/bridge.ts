import SEBridgeHost from "../libcore/bridgehost.js";
import cc from "../libcore/cc.js";

new cc('bridge', {
    description: new cc.description({
        name: 'Bridge',
        description: 'Manages plugins',
        aliases: ['bridge', 'plugin'],
        usage: [
            [
                ['bridge', 'list'],
                'Shows plugin list.'
            ], [
                ['bridge', 'info', { type: [['value', 'any']], name: 'id' }, { type: [['value', 'boolean']], name: 'showAdvanced', required: false }],
                'Shows plugin info.'
            ], [
                ['bridge', 'execute', { type: [['value', 'any']], name: 'id' }],
                'Executes a plugin.'
            ], [
                ['bridge', 'delete', { type: [['value', 'any']], name: 'id' }],
                'Deletes a plugin.'
            ]
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
            case 'execute': {
                const pli = SEBridgeHost.plugin.get(tArgs[1])
                if (!pli) throw new cc.error(`Plugin with ID '${tArgs[1]}' not found`, 'ReferenceError')
                if (pli.isExecuted) throw new cc.error(`Plugin has already been executed`)
                if (pli.type == 'module') throw new cc.error(`Plugin cannot be executed by user`)

                const t1 = Date.now()
                log(`Executing ${pli.name} (${pli.id})`)

                pli.execute().then(
                    () => log(`Successfully executed ${pli.name} (${pli.id}). Time taken: ${Date.now() - t1}ms`),
                    (err) => log(`§cFailed to execute ${pli.name} (${pli.id}): ${ err instanceof Error ? `${err}\n${err.stack}` : err }`)
                )
                return
            }
            case 'delete': {
                const pli = SEBridgeHost.plugin.get(tArgs[1])
                if (!pli) throw new cc.error(`Plugin with ID '${tArgs[1]}' not found`, 'ReferenceError')
                if (pli.isExecuted) throw new cc.error(`Plugin has already been executed and cannot be unloaded.`)

                SEBridgeHost.plugin.delete(tArgs[1])
                return log(`Deleted plugin with ID '${tArgs[1]}'.`)
            }
        }
    }
})
