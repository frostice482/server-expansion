import { Player } from "mojang-minecraft";
import cc from "../libcore/cc.js";
import permission from "../libcore/permission.js";

const canExec = (plr: Player, cmd: cc) => cmd && !(
    cmd.isDisabled
    || cmd.isHidden
    || ( cmd.minPermLvl && permission.getLevel(plr.getTags()) < cmd.minPermLvl )
    || ( cmd.reqTags && cc.testReqTags(cmd.reqTags, plr) )
)

new cc('help', {
    description: new cc.description({
        name: 'Help',
        description: 'Shows command list / info',
        aliases: ['h', 'help', 'l', 'list'],
        usage: [
            [
                [ 'help', { type: [['value', 'number']], name: 'page', required: false } ],
                'Shows command list in a specified page. Shows command list in the first page if not specified.'
            ],             [
                [ 'help', { type: [['value', 'any']], name: 'command' } ],
                'Shows information of a command.'
            ]
        ]
    }),
    minPermLvl: 0,
    typedArgs: new cc.typedArgs([
        { minArgs: 0, sequence: [ [cc.parser.number, cc.parser.any] ] }
    ]),
    triggers: /^(h(elp)?|l(i(st)?)?)$/i,
    onTrigger: ({ log, executer, typedArgs: tArgs }) => {
        const [x] = tArgs
        if (typeof x != 'string') {
            let cmdList = [...cc.getList()]
                .filter(v => canExec(executer, v))
                .sort((a, b) => a.id.localeCompare(b.id))

            const cmdPerPage = 15
            const page = Math.max( Math.min( ( x ?? 0 ) - 1, ~~( ( cmdList.length - 1 ) / cmdPerPage ) ), 0 )

            cmdList = cmdList.splice(page * cmdPerPage, cmdPerPage)

            return log([
                ` `,
                `Command list: §7(showing ${cmdList.length} command${cmdList.length == 1 ? '' : 's'} in page ${page + 1}):`,
                ...Array.from(cmdList, (v, i) => ` §8:§r ${v.description?.name ?? `'${v.id}'`} §8- §7${v.description?.description ?? '(No description)'}`),
                ` `
            ])
        }

        const cmd = cc.getCommandFromTrigger(x)
        if (!canExec(executer, cmd)) throw new cc.error(`Command not found: '${x}'`, `ReferenceError`)
        
        return log([
            ` `,
            cmd.description?.generate() ?? `(No description provided for command '${cmd.id}')`,
            ` `,
        ])
    },
    isDefault: true
})