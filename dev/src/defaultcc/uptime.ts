import cc from "../libcore/cc.js";
import { convertToReadableTime } from "../libcore/misc.js";

const startTime = Date.now()

new cc('uptime', {
    description: new cc.description({
        name: 'Uptime',
        description: 'Shows server uptime',
        aliases: ['uptime', 'server-uptime'],
        usage: [
            [
                [ 'uptime' ],
                'Shows world / server uptime'
            ]
        ]
    }),
    minPermLvl: 0,
    triggers: /^(server-?)?uptime$/i,
    onTrigger: ({ log }) => {
        return log(`Server uptime: §a${ convertToReadableTime( Date.now() - startTime ) }`)
    },
    isDefault: true
})