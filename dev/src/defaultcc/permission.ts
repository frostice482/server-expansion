import cc from "../libcore/cc.js";
import permission from "../libcore/permission.js";

new cc('permission', {
    description: new cc.description({
        name: 'Permission',
        description: 'Configures permission level of a tag',
        aliases: ['permission', 'permission-level'],
        usage: [
            [
                [ 'permission', 'assign', { type: [['value', 'any']], name: 'tag' }, { type: [['value', 'number']], name: 'level' } ],
                'Assigns permission level to a tag.'
            ], [
                [ 'permission', 'rename', { type: [['value', 'any']], name: 'tag1' }, { type: [['value', 'any']], name: 'tag2' } ],
                'Renames a tag to a new tag that has permission level assigned to it.'
            ], [
                [ 'permission', 'list' ],
                'Shows permission level list.'
            ], [
                [ 'permission', 'delete', { type: [['value', 'any']], name: 'tag' } ],
                'Deletes a permission level assigned to the tag.'
            ]
        ]
    }),
    minPermLvl: 80,
    typedArgs: new cc.typedArgs([
        { sequence: [ 'assign', cc.parser.any, cc.parser.number ] },
        { sequence: [ 'rename', cc.parser.any, cc.parser.any ] },
        { sequence: [ 'list' ] },
        { sequence: [ 'delete', cc.parser.any ] },
    ]),
    triggers: /^(permission|admin)(-?level)?$/i,
    onTrigger: ({ log, executer, typedArgs: tArgs }) => {
        const executerLvl = permission.getLevel(executer.getTags())
        switch (tArgs[0]) {
            case 'assign': {
                const id = tArgs[1],
                    level = tArgs[2]

                if (permission.isAssigned(id)) throw new cc.error(`Permission level has already been assigned to tag '${id}'.`)
                if (level >= executerLvl) throw new cc.error(`Cannot assign permission level to a tag equal or higher than you have\n(assigning ${level} to '${id}', maximum: ${executerLvl})`, `RangeError`)

                permission.assign(id, level)
                return log(`Successfully assigned permission level ${level} to '${id}'.`)
            }
            case 'rename': {
                const id1 = tArgs[1],
                    id2 = tArgs[2]

                if (!permission.isAssigned(id1)) throw new cc.error(`Permission level is not assigned to tag '${id1}'.`)
                if (permission.isAssigned(id2)) throw new cc.error(`Permission level has already been assigned to tag '${id2}'.`)

                const tagLevel = permission.get(id1)
                if (tagLevel > executerLvl) throw new cc.error(`Cannot rename tag which has permission level higher than you have\n(renaming '${id1}' (${tagLevel}) to '${id2}' (${tagLevel}), maximum: ${executerLvl})`, `RangeError`)

                permission.deassign(id1)
                permission.assign(id2, tagLevel)
                return log(`Successfully renamed tag '${id1}' (${tagLevel}) to '${id2}' (${tagLevel}).`)
            }
            case 'list': {
                return log([
                    ` `,
                    `Permission level list:`,
                    ...permission.getList().sort((a, b) => b[1] - a[1]).map(([t, l]) => ` §8:§r "${t}" => §a${l}§r`),
                    ` `,
                ])
            }
            case 'delete': {
                const id = tArgs[1]

                if (!permission.isAssigned(id)) throw new cc.error(`Permission level is not assigned to tag '${id}'.`)

                const tagLevel = permission.get(id)
                if (tagLevel >= executerLvl) throw new cc.error(`Cannot assign permission level to a tag equal  or higher than you have\n(deleting '${id}' (${tagLevel}), maximum: ${executerLvl})`, `RangeError`)

                permission.deassign(id)
                return log(`Successfully deleted permission level from tag '${id}'.`)
            }
        }
    },
    isDefault: true,
    onDelete: () => { throw new Error(`Cannot be deleted`) }
})