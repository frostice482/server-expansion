import cc from "../libcore/cc.js";
import chat from "../libcore/chat.js";
import { TypedArray, TypedObject, TypedValue } from "../libcore/typedvalues.js";

const TTagFilter = new TypedValue(new TypedArray(new TypedValue('string')))
TTagFilter.name = 'TagFilter'
TTagFilter.addType(new TypedObject().define('all', TTagFilter, false).define('any', TTagFilter, false).define('none', TTagFilter, false))
const PTTagFilter = cc.parser.typedValues(TTagFilter)

new cc('chatgroup', {
    description: new cc.description({
        name: 'Chat Group',
        description: 'Configures chat group',
        aliases: ['chat-group', 'cg'],
        usage: [
            [
                [ 'chatgroup', 'create', { type: [['value', 'any']], name:'id' }, { type: [['value', 'number']], name: 'priority', required: false }, { type: [['value', 'tagFilter']], name: 'tagFilter', required: false }, ],
                'Creates a chat group.'
            ], [
                [ 'chatgroup', 'edit', { type: [['value', 'any']], name:'id' } , { type: [['keyword', 'priority'], ['keyword', 'tagFilter'], ['keyword', 'defaultCancelLevel'], ['keyword', 'defaultCancelMessage']], name: 'propertyKey' }, { type: [['value', 'any*']], name: 'value' } ],
                'Edits a property on a chat group.'
            ], [
                [ 'chatgroup', 'list' ],
                'Shows chat group list.'
            ], [
                [ 'chatgroup', 'info', { type: [['value', 'any']], name: 'id', required: false } ],
                'Shows information of a chat group. Shows property information if group is not specified.'
            ], [
                [ 'chatgroup', 'delete', { type: [['value', 'any']], name: 'id' } ],
                'Deletes a chat group.'
            ]
        ]
    }),
    minPermLvl: 80,
    typedArgs: new cc.typedArgs([
        { minArgs: 2, sequence: [ 'create', cc.parser.any, cc.parser.number, PTTagFilter ] },
        { sequence: [ 'edit', cc.parser.any, 'priority', cc.parser.number ] },
        { sequence: [ 'edit', cc.parser.any, 'tagFilter', PTTagFilter ] },
        { sequence: [ 'edit', cc.parser.any, 'defaultCancelLevel', ['0', '1', '2'] ] },
        { minArgs: 2, sequence: [ 'edit', cc.parser.any, 'defaultCancelMessage', cc.parser.any ] },
        { sequence: [ 'list' ] },
        { minArgs: 1, sequence: [ 'info', cc.parser.any ] },
        { sequence: [ 'delete', cc.parser.any ] },
    ]),
    triggers: /^(cg|chat-?group)$/i,
    onTrigger: ({ log, typedArgs: tArgs }) => {
        switch(tArgs[0]) {
            case 'create': {
                const id = tArgs[1],
                    priority = tArgs[2],
                    tagFilter = tArgs[3]
                if (chat.group.exist(id)) throw new cc.error(`Chat group with ID '${id}' already exists.`, 'TypeError')
                
                new chat.group(id, priority, tagFilter)
                return log(`Created chat group with ID '${id}'.`)
            }
            case 'edit': {
                const id = tArgs[1],
                    group = chat.group.get(id)
                if (!group) throw new cc.error(`Chat group with ID '${tArgs[1]}' not found.`, 'ReferenceError')

                group[tArgs[2]] = tArgs[3]
                return log(`Edited property '${tArgs[2]}' of chat group with ID '${tArgs[1]}' to '${tArgs[3]}§r'.`)
            }
            case 'list': {
                return log([
                    ` `,
                    `Chat group list:`,
                    ...Array.from(chat.group.getList()).sort((a, b) => b.priority - a.priority).map(v => ` §8:§r ${v.id} §8-§r priority: §a${v.priority}§r, cancelLevel: §a${v.defaultCancelLevel}§r`),
                    ` `
                ])
            }
            case 'info': {
                if (!tArgs[1])return log([
                    ' ',
                    'Priority §7(priority)§r: Determines the order of tag filter test of groups.',
                    '   Higher means it has bigger chance for its tag filter to be tested first.',
                    ' ',
                    'Default cancel level §7(defaultCancelLevel)§r: Determines the default cancel level for message sending.',
                    '   0: Do not cancel',
                    '   1: Cancel for all players but for message sender',
                    '   1: Cancel for all players.',
                    ' ',
                    'Default cancel message §7(defaultCancelMessage)§r: Used if cancel level is set to 2.',
                    '   Used to send a message to message sender.',
                    ' ',
                    'Tag filter §7(tagFilter)§r: Filters players thet can be in a group based on their tag.',
                    '   Also used to determine which group the message sender will send their message to.',
                    ' ',
                ])

                const id = tArgs[1],
                    group = chat.group.get(id)
                if (!group) throw new cc.error(`Chat group with ID '${tArgs[1]}' not found.`, 'ReferenceError')
                return log([
                    ` `,
                    `Chat group data: §7(id: '${id}')§r `,
                    ` §8:§r Priority §7(priority)§r: §a${group.priority}`,
                    ` §8:§r Default cancel level §7(defaultCancelLevel)§r: §a${group.defaultCancelLevel}`,
                    ` §8:§r Default cancel message §7(defaultCancelMessage)§r: "${group.defaultCancelMessage.replace(/\u00a7(.)/g, (m, k) => `§7[S${k}]§r`)}"`,
                    ` §8:§r Tag filter §7(tagFilter)§r: ${JSON.stringify(group.tagFilter, null, ' ').replace(/\n ?/g, ' ')}`,
                    ` `
                ])
            }
            case 'delete': {
                if (!chat.group.delete(tArgs[1])) throw new cc.error(`Chat group with ID '${tArgs[1]}' not found.`, 'ReferenceError')
                return log(`Deleted chat group with ID '${tArgs[1]}'.`)
            }
        }
    },
    isDefault: true
})