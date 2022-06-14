import cc from "../libcore/cc.js";
import { convertToReadableTime } from "../libcore/misc.js";
import role from "../libcore/role.js";

new cc('role', {
    description: new cc.description({
        name: 'Role',
        description: 'Configures role',
        aliases: ['role', 'chat-role', 'rank', 'chat-rank'],
        usage: [
            [
                [ 'role', 'group', 'create', { name: 'id', type: [['value', 'any']] }, { name: 'pos', type: [['value', 'number']], required: false }, { name: 'display', type: [['keyword', 'always'], ['keyword', 'auto'], ['keyword', 'never']], required: false }, { name: 'defaultStyle', type: [['value', 'any']], required: false } ],
                'Creates a role group'
            ], [
                [ 'role', 'group', 'edit', { name: 'id', type: [['value', 'any']] }, { name: 'propertyKey', type: [['keyword', 'pos'], ['keyword', 'display'], ['keyword', 'defaultStyle']] }, { name: 'value', type: [['value', 'any*']] } ],
                'Edits a role group'
            ], [
                [ 'role', 'group', 'list' ],
                'Shows role group list.'
            ], [
                [ 'role', 'group', 'delete', { name: 'id', type: [['value', 'any']] } ],
                'Deletes a role group.'
            ], [
                [ 'role', 'style', 'add_top', { name: 'id', type: [['value', 'any']] }, { name: 'tag', type: [['value', 'any']] }, { name: 'style', type: [['value', 'any']] } ],
                'Adds a role style on a role group at the top position.'
            ], [
                [ 'role', 'style', 'add_bottom', { name: 'id', type: [['value', 'any']] }, { name: 'tag', type: [['value', 'any']] }, { name: 'style', type: [['value', 'any']] } ],
                'Adds a role style on a role group at the bottom position.'
            ], [
                [ 'role', 'style', 'add', { name: 'id', type: [['value', 'any']] }, { name: 'pos', type: [['value', 'number']] }, { name: 'tag', type: [['value', 'any']] }, { name: 'style', type: [['value', 'any']] } ],
                'Adds a role style on a role group at the specified position.'
            ], [
                [ 'role', 'style', 'remove_top', { name: 'id', type: [['value', 'any']] } ],
                'Deletes a role style on a role group at the top position.'
            ], [
                [ 'role', 'style', 'remove_bottom', { name: 'id', type: [['value', 'any']] } ],
                'Deletes a role style on a role group at the bottom position.'
            ], [
                [ 'role', 'style', 'remove', { name: 'id', type: [['value', 'any']] }, { name: 'pos', type: [['value', 'number']] } ],
                'Deletes a role style on a role group at the specified position.'
            ], [
                [ 'role', 'style', 'edit', { name: 'id', type: [['value', 'any']] }, { name: 'propertyKey', type: [['keyword', 'tag'], ['keyword', 'style']] }, { name: 'value', type: [['value', 'any*']] } ],
                'Edits a role style on a role group'
            ], [
                [ 'role', 'style', 'list', { name: 'id', type: [['value', 'any']] } ],
                'Shows role style list on a role group.'
            ], [
                [ 'role', 'config' ],
                'Shows role configuration.'
            ], [
                [ 'role', 'config', { name: 'propertyKey', type: [['keyword', 'apply_nametag'], ['keyword', 'nametag_update_interval'], ['keyword', 'nametag_format'], ['keyword', 'message_format'], ['keyword', 'role_separator']] }, { name: 'value', type: [['value', 'any*']], required: false } ],
                'Shows / sets a property of role configuration.'
            ]
        ]
    }),
    minPermLvl: 80,
    triggers: /^(chat-?)?(role|rank)$/i,
    typedArgs: new cc.typedArgs([
        { minArgs: 3, sequence: [ 'group', 'create', cc.parser.any, cc.parser.number, ['alaways', 'auto', 'never'], cc.parser.any ] },
        { sequence: [ 'group', 'edit', 'pos', cc.parser.number ] },
        { sequence: [ 'group', 'edit', 'display', ['alaways', 'auto', 'never'] ] },
        { sequence: [ 'group', 'edit', 'defaultStyle', cc.parser.any ] },
        { sequence: [ 'group', 'list' ] },
        { sequence: [ 'group', 'delete', cc.parser.any ] },
        { sequence: [ 'style', 'add_top', cc.parser.any, cc.parser.any, cc.parser.any ] },
        { sequence: [ 'style', 'add_bottom', cc.parser.any, cc.parser.any, cc.parser.any ] },
        { sequence: [ 'style', 'add', cc.parser.any, cc.parser.number, cc.parser.any, cc.parser.any ] },
        { sequence: [ 'style', 'remove_top', cc.parser.any, ] },
        { sequence: [ 'style', 'remove_bottom', cc.parser.any, ] },
        { sequence: [ 'style', 'remove', cc.parser.any, cc.parser.number, ] },
        { sequence: [ 'style', 'edit', cc.parser.any, cc.parser.number, ['tag', 'style'], cc.parser.any ] },
        { sequence: [ 'style', 'list', cc.parser.any ] },
        { minArgs: 1, sequence: [ 'config', 'apply_nametag', cc.parser.boolean ] },
        { minArgs: 1, sequence: [ 'config', 'nametag_update_interval', cc.parser.number ] },
        { minArgs: 1, sequence: [ 'config', 'nametag_format', cc.parser.any ] },
        { minArgs: 1, sequence: [ 'config', 'message_format', cc.parser.any ] },
        { minArgs: 1, sequence: [ 'config', 'role_separator', cc.parser.any ] },
    ]),
    onTrigger: ({ log, typedArgs: tArgs }) => {
        switch (tArgs[0]) {
            case 'group': {
                switch (tArgs[1]) {
                    case 'create': {
                        if (role.group.exist(tArgs[2])) throw new cc.error(`Role group with ID '${tArgs[2]}' already exists.`, 'ReferenceError')
                        //@ts-ignore
                        new role.group(...tArgs.slice(2))
                        return log(`Created role group with ID '${tArgs[2]}'.`)
                    }
                    case 'edit': {
                        const group = role.group.get(tArgs[2])
                        if (!group) throw new cc.error(`Role group with ID '${tArgs[2]}' not found.`, 'ReferenceError')
                        group[tArgs[3]] = tArgs[4]
                        return log(`Edited property '${tArgs[3]}' of role group with ID '${tArgs[2]}' to '${tArgs[4]}§r'.`)
                    }
                    case 'list': {
                        return log([
                            ` `,
                            `Role group list:`,
                            ...Array.from(role.group.getList(), v => ` §8:§r ${v.id} §8-§r pos: §a${v.pos}§r, display: §a${v.display}§r, defaultStyle: "${v.defaultStyle || '§8(empty)'}§r"`),
                            ` `
                        ])
                    }
                    case 'delete': {
                        if (!role.group.delete(tArgs[2])) throw new cc.error(`Role group with ID '${tArgs[2]}' not found.`, 'ReferenceError')
                        return log(`Deleted role group with ID '${tArgs[2]}'.`)
                    }
                }
            }; break
            case 'style': {
                const group = role.group.get(tArgs[2])
                if (!group) throw new cc.error(`Role group with ID ${tArgs[2]} not found.`, 'ReferenceError')
                const style = group.styles

                switch (tArgs[1]) {
                    case 'add': {
                        style.addAt(tArgs[3] - 1, tArgs[4], tArgs[5])
                        return log(`Added role style at position ${tArgs[3]} in role group with ID '${tArgs[2]}' (current length: ${style.length}).`)
                    }
                    case 'add_top': {
                        style.addFront(tArgs[3], tArgs[4])
                        return log(`Added role style at top position at role style in role group with ID '${tArgs[2]}' (current length: ${style.length}).`)
                    }
                    case 'add_bottom': {
                        style.add(tArgs[3], tArgs[4])
                        return log(`Added role style at bottom position at role style in role group with ID '${tArgs[2]}' (current length: ${style.length}).`)
                    }
                    case 'remove': {
                        if (!style.removeAt(tArgs[3] - 1)) throw new cc.error(`Nothing to remove.`, 'ReferenceError')
                        return log(`Removed role style at position ${tArgs[3]} in role group with ID '${tArgs[2]}' (current length: ${style.length}).`)
                    }
                    case 'remove_top': {
                        if (!style.removeFront()) throw new cc.error(`Nothing to remove.`, 'ReferenceError')
                        return log(`Removed role style at top position at role style in role group with ID '${tArgs[2]}' (current length: ${style.length}).`)
                    }
                    case 'remove_bottom': {
                        if (!style.remove()) throw new cc.error(`Nothing to remove.`, 'ReferenceError')
                        return log(`Removed role style at bottom position at role style in role group with ID '${tArgs[2]}' (current length: ${style.length}).`)
                    };
                    case 'edit': {
                        const d = style.getAt(tArgs[3] - 1)
                        if (!d) throw new cc.error(`Role style data not found at position ${tArgs[3]}.`, 'ReferenceError')
                        d[ tArgs[4] == 'tag' ? 0 : 1 ] = tArgs[5]
                        return log(`Edited property '${tArgs[4]}' at role style position ${tArgs[3]} in role group with ID '${tArgs[2]}' to '${tArgs[5]}§r'.`)
                    }
                    case 'list': {
                        return log([
                            ` `,
                            `Role style list: §7(role group: ${group.id})`,
                            ...Array.from(style, ([t, s], i) => ` §a${i+1} §8:§r "${t}" => "${s}§r"`),
                            ` `,
                        ])
                    }
                }
            }; break
            case 'config': {
                const isSet = 2 in tArgs
                const config = role.config

                const formatStr = (v: string) =>
                    v.replace(/\u00a7(.)/g, (m, k) => `§7[S${k}]§r`)
                    .replace(/(?<!\\)#[\w\-]+(\{.*?\})?/g, `§d$&§r`)

                switch (tArgs[1]) {
                    case 'apply_nametag': {
                        if (isSet) return log(`Property of role configuration '${tArgs[1]}' has been set to §a${config.applyRoleToNametag = tArgs[2]}§r.`)
                        return log([
                            `Apply role to nametag §7(apply_nametag)§r: §a${config.applyRoleToNametag}`,
                            `Sets whether role will be applied to player nametag or not.`,
                        ])
                    }
                    case 'nametag_update_interval': {
                        if (isSet) return log(`Property of role configuration '${tArgs[1]}' has been set to §a${convertToReadableTime(config.nametagUpdateInterval = tArgs[2] * 1000)}§r.`)
                        return log([
                            `Nametag update interval §7(nametag_update_interval)§r: §a${convertToReadableTime(config.nametagUpdateInterval)}`,
                            `Sets the time interval of nametag update. Between 10 and 120 seconds.`,
                        ])
                    }
                    case 'nametag_format': {
                        if (isSet) return log(`Property of role configuration '${tArgs[1]}' has been set to "${formatStr(config.nametagFormat = tArgs[2])}".`)
                        return log([
                            `Nametag format §7(nametag_format)§r: "${formatStr(config.nametagFormat)}"`,
                            `Sets how nametag should be formatted.`,
                        ])
                    }
                    case 'message_format': {
                        if (isSet) return log(`Property of role configuration '${tArgs[1]}' has been set to "${formatStr(config.messageFormat = tArgs[2])}".`)
                        return log([
                            `Message format §7(message_format)§r: "${formatStr(config.messageFormat)}"`,
                            `Sets how message should be formatted.`,
                        ])
                    }
                    case 'role_separator': {
                        if (isSet) return log(`Property of role configuration '${tArgs[1]}' has been set to "${config.roleGroupStyleSeparator = tArgs[2]}".`)
                        return log([
                            `Role separator §7(role_separator)§r: "${config.roleGroupStyleSeparator}"`,
                            `Sets how role should be separated.`,
                        ])
                    }
                    default:
                        return log([
                            ` `,
                            `Role configuration list:`,
                            ` §8:§r Apply role to nametag §7(apply_nametag)§r: §a${config.applyRoleToNametag}`,
                            ` §8:§r Nametag update interval §7(nametag_update_interval)§r: §a${convertToReadableTime(config.nametagUpdateInterval)}`,
                            ` §8:§r Nametag format §7(nametag_format)§r: "${formatStr(config.nametagFormat)}"`,
                            ` §8:§r Message format §7(message_format)§r: "${formatStr(config.messageFormat)}"`,
                            ` §8:§r Role separator §7(role_separator)§r: "${config.roleGroupStyleSeparator}"`,
                            ` `,
                        ])
                }
            }; break
        }
    },
    isDefault: true
})