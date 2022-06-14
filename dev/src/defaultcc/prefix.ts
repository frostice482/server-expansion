import cc from "../libcore/cc.js";

new cc('prefix', {
    description: new cc.description({
        name: 'Prefix',
        description: 'Shows / sets custom command prefix',
        aliases: ['prefix'],
        usage: [
            [
                [ 'prefix' ],
                'Shows current prefix.'
            ], [
                [ 'prefix', { type: [['value', 'any']], name: 'newPrefix' } ],
                'Sets new prefix.'
            ]
        ]
    }),
    minPermLvl: 80,
    triggers: /^prefix$/i,
    onTrigger: ({ log, args }) => {
        if (!args[0]) return log(`Current prefix: "${cc.prefix}"`)
        try {
            cc.prefix = args[0]
            return log(`Current prefix has been set to '${cc.prefix}'.`)
        } catch (e) {
            throw new cc.error(e.message, e.name)
        }
    }
})