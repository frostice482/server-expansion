import bridgeHost from "../libcore/bridgehost.js";
import cc from "../libcore/cc.js";

new cc('bridge', {
    description: new cc.description({
        name: 'Bridge',
        description: 'Manages plugins',
        aliases: ['bridge', 'plugin'],
        usage: [
            [
                ['bridge', 'list', { type: [['value', 'any']], name: 'id', required: false }],
                'Shows plugin list. Shows version list if plugin ID is specified.'
            ], [
                ['bridge', 'info', { type: [['value', 'any']], name: 'id' }, { type: [['value', 'version'], ['keyword', 'latest']], name: 'versionCode', required: false }],
                'Shows plugin info. If version is unspecified, latest is assumed.'
            ], [
                ['bridge', 'execute', { type: [['value', 'any']], name: 'id' }, { type: [['value', 'version'], ['keyword', 'latest']], name: 'versionCode', required: false }],
                'Executes a plugin. If version is unspecified, latest is assumed.'
            ], [
                ['bridge', 'unload', { type: [['value', 'any']], name: 'id' }],
                'Unloads a plugin.'
            ], [
                ['bridge', 'delete', { type: [['value', 'any']], name: 'id' }, { type: [['value', 'version'], ['keyword', 'latest']], name: 'versionCode' }],
                'Deletes a plugin with specified version.'
            ], [
                ['bridge', 'delete-all', { type: [['value', 'any']], name: 'id' }],
                'Deletes the entire plugin version.'
            ]
        ]
    }),
    minPermLvl: 100,
    triggers: /^(bridge|plugin)$/i,
    typedArgs: new cc.typedArgs([
        { minArgs: 1, sequence: [ 'list' ] },
        { minArgs: 2, sequence: [ 'info', cc.parser.any, [cc.parser.number, 'latest'] ] },
        { minArgs: 2, sequence: [ 'execute', cc.parser.any, [cc.parser.number, 'latest'] ] },
        { sequence: [ 'unload' ] },
        { sequence: [ 'delete', cc.parser.any, [cc.parser.number, 'latest'] ] },
        { sequence: [ 'delete-all', cc.parser.any ] },
    ]),
    onTrigger: ({executer, log, typedArgs: tArgs}) => {
        switch (tArgs[0]) {
            case 'list': {
                if (!tArgs[1]) return log([
                    ` `,
                    `Plugin list`,
                    ...Array.from(bridgeHost.plugin.getList(), ([id, pliFamily]) => {
                        const versions = pliFamily.versions,
                            latest = pliFamily.versions.get('latest')
                        
                        return ` §8:§r ${latest.name} §7(${id})§r §8-§r `
                            + `${ versions.size - 1 } version${ versions.size - 1 == 1 ? '' : 's' } (latest: ${ latest.version }), `
                            + `${ pliFamily.commonLoaded ? `executed (${ pliFamily.getLoaded().version })` : 'not executed' }, `
                            + `${ latest.dependents.size } dependent${ latest.dependents.size == 1 ? '' : 's' }`
                    }),
                    ` `,
                ])

                const id = tArgs[1]

                const pliFamily = bridgeHost.plugin.getFamily(id)
                if (!pliFamily) throw new cc.error(`Plugin '${id}' does not exist.`, 'ReferenceError')

                const versions = new Map(pliFamily.versions.entries())
                versions.delete('latest')

                return log([
                    ` `,
                    `Plugin version list of '${id}':`,
                    ...Array.from(versions).sort( ([,a], [,b]) => b.versionCode - a.versionCode ).map( ([v, pli]) => `§8:§r §a${pli.version}§r (code: §a${pli.versionCode}§r)` ),
                    ` `,
                ])
            }
            case 'info': {
                const [,id, version = 'latest'] = tArgs

                const pliFamily = bridgeHost.plugin.getFamily(id)
                const pli = pliFamily?.versions.get(version)
                if (!pli) throw new cc.error(`Plugin '${id}' with version code ${version} does not exist.`, 'ReferenceError')

                return log([
                    ` `,
                    `${pli.name} §8-§r §a${pli.version}§r (code: §a${pli.versionCode}§r)`,
                    `Author: ${pli.author.map(v => `§a${v}§r`).join(', ')}`,
                    ` `,
                    pli.description,
                    ` `,
                    `Executed: §a${pli.isExecuted ? 'Yes' : 'No'}§r ${ pliFamily.commonLoaded && pliFamily.loadedVersion != pli.versionCode ? `(§a${ pliFamily.getLoaded().version }§r is)` : '' }`,
                    `Can be unloaded: §a${pli.canBeUnloaded ? 'Yes §7(Other plugin that requires this plugin may prevent unloading of this plugin)' : 'No'}§r`,
                    `Dependents: §a${pli.dependents.size}§r`,
                    ...Array.from(pli.dependents, v => ` §8:§r ${v.name} (§a${v.version}§r)`),
                    ` `,
                ])
            }
            case 'execute': {
                const [,id, version = 'latest'] = tArgs

                const pliFamily = bridgeHost.plugin.getFamily(id)
                const pli = pliFamily?.versions.get(version)
                if (!pli) throw new cc.error(`Plugin '${id}' with version code ${version} does not exist.`, 'ReferenceError')
                if (pliFamily.commonLoaded) throw new cc.error(`Plugin '${pli.name}' is already loaded (${pliFamily.getLoaded().version}). Please unload it first.`, 'TypeError')

                log(`Executing '${pli.name}' (§a${pli.version}§r).`)
                pli.execute().then(
                    () => log(`Successfully executed '${pli.name}' (§a${pli.version}§r).`),
                    (err) => log(`§cFailed to execute '${pli.name}' (${pli.version}): ${ err instanceof Error ? `${err}\n${err.stack}` : err }`),
                )
                return
            }
            case 'unload': {
                const [,id] = tArgs

                const pliFamily = bridgeHost.plugin.getFamily(id)
                if (!pliFamily.commonLoaded) return log(`Plugin '${id}' is not loaded.`)

                const pli = pliFamily.getLoaded()

                try {
                    if (!pli.unload())
                        throw new TypeError(`Failed to unload '${pli.name}' (${pli.version}): The plugin either cannot be unloaded or other plugin that requires this plugin doesn't allow the plugin to be unloaded.`)
                } catch (e) { throw new Error(e.message) }

                return log(`Successfully unloaded '${pli.name}' (§a${pli.version}§r).`)
            }
            case 'delete': {
                const [,id, version] = tArgs

                const pli = bridgeHost.plugin.get(id, version)
                if (!pli) throw new cc.error(`Plugin '${id}' with version code ${version} does not exist.`, 'ReferenceError')

                try {
                    if (!bridgeHost.plugin.delete(id, version))
                        throw new TypeError(`Failed to delete '${pli.name}' (${pli.version}): The plugin is executed and either it cannot be unloaded or other plugin that requires this plugin doesn't allow the plugin to be unloaded.`)
                } catch (e) { throw new Error(e.message) }

                return log(`Successfully deleted '${pli.name}' (§a${pli.version}§r).`)
            }
            case 'delete-all': {
                const [,id] = tArgs

                const pliFamily = bridgeHost.plugin.getFamily(id)
                if (!pliFamily) throw new cc.error(`Plugin '${id}' does not exist.`, 'ReferenceError')

                try {
                    if (!bridgeHost.plugin.deleteFamily(id))
                        throw new TypeError(`Failed to delete '${id}': The plugin is executed and either it cannot be unloaded or other plugin that requires this plugin doesn't allow the plugin to be unloaded.`)
                } catch (e) { throw new Error(e.message) }

                return log(`Successfully deleted '${id}'.`)
            }
        }
    },
    isDefault: true
})