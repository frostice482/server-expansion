import { Player } from "mojang-minecraft";
import cc from "../libcore/cc.js";
import chat from "../libcore/chat.js";
import role from "../libcore/role.js";
import { sendMsgToPlayers } from "../libcore/sendChat.js";

const adminTag = 'adminChat'

const cGroup = (() => {
    if (!chat.group.exist('_adminchat')) {
        const g = new chat.group('_adminchat', 0, [adminTag])
        chat.group.delete('_adminchat')
        return g
    } else return chat.group.get('_adminchat')
})()

new cc('adminchat', {
    description: new cc.description({
        name: 'Admin Chat',
        description: 'Joins / leaves admin chat.',
        aliases: ['admin-chat'],
        usage: [
            [
                ['adminchat', 'join'],
                'Joins admin chat.'
            ], [
                ['adminchat', 'leave'],
                'Leaves admin chat.'
            ], [
                ['adminchat', 'list'],
                'Shows players in admin chat.'
            ], [
                ['adminchat', 'pull', { type: [['value', 'player']], name: 'target' }],
                'Pulls player(s) to admin chat.'
            ], [
                ['adminchat', 'kick', { type: [['value', 'player']], name: 'target' }],
                'Kicks player(s) from admin chat.'
            ],
        ]
    }),
    minPermLvl: 40,
    typedArgs: new cc.typedArgs([
        { sequence: ['join'] },
        { sequence: ['leave'] },
        { sequence: ['list'] },
        { sequence: ['pull', cc.parser.playerSelector] },
        { sequence: ['kick', cc.parser.playerSelector] },
    ]),
    triggers: /^admin-?chat$/i,
    onTrigger: ({ log, executer, typedArgs: tArgs }) => {
        switch (tArgs[0]) {
            case 'join': {
                if (executer.hasTag(adminTag)) return log('You are currently in the admin chat.')

                const targets = cGroup.getTargets(),
                    l = targets.length
                sendMsgToPlayers(targets, `Player §a${executer.nickname}§r joined the admin chat.`)

                executer.addTag(adminTag)
                log([
                    `You have joined the admin chat.`,
                    `There ${l == 1 ? 'is' : 'are'} ${l == 0 ? 'no one here' : `${l} player${l == 1 ? '' : 's'} here: ${targets.map(v => `§a${v.nickname}§r`).join(', ')}`}.`
                ])
                return
            }
            case 'leave': {
                if (!executer.hasTag(adminTag)) return log('You are currently not in the admin chat.')

                executer.removeTag(adminTag)
                log(`You have left the admin chat.`)

                sendMsgToPlayers(cGroup.getTargets(), `Player §a${executer.nickname}§r left the admin chat.`)
                return
            }
            case 'list': {
                return log([
                    ` `,
                    `Players in admin chat:`,
                    ...cGroup.getTargets().map(v => ` §8:§r ${v.nickname} §7(uid: ${v.uid})`),
                    ` `,
                ])
            }
            case 'pull': {
                let isExec = false
                for (const plr of tArgs[1].execute(executer)) {
                    if (plr.hasTag(adminTag)) continue
                    isExec = true

                    const targets = cGroup.getTargets(),
                        l = targets.length
                    sendMsgToPlayers(targets, `Player §a${plr.nickname}§r has been pulled into the admin chat by §a${executer.nickname}§r.`)

                    plr.addTag(adminTag)
                    plr.sendMsg([
                        `You have been pulled into the admin chat by §a${executer.nickname}§r.`,
                        `There ${l == 1 ? 'is' : 'are'} ${l == 0 ? 'no one here' : `${l} player${l == 1 ? '' : 's'} here: ${targets.map(v => `§a${v.nickname}§r`).join(', ')}`}.`
                    ])

                    log(`Pulled §a${plr.nickname}§r to the admin chat.`)
                }
                if (!isExec) log(`No one has been pulled into the admin chat.`)
                return
            }
            case 'kick': {
                let isExec = false
                for (const plr of tArgs[1].execute(executer)) {
                    if (!plr.hasTag(adminTag)) continue
                    isExec = true

                    plr.removeTag(adminTag)
                    plr.sendMsg(`You have been kicked from the admin chat by §a${executer.nickname}§r.`)

                    sendMsgToPlayers(cGroup.getTargets(), `Player §a${plr.nickname}§r has been kicked from the admin chat by §a${executer.nickname}§r.`)

                    log(`Kicked §a${plr.nickname}§r from the admin chat.`)
                }
                if (!isExec) log(`No one has been kicked from the admin chat.`)
                return
            }
        }
    },
    onDelete: () => {
        chat.ev.chat.unsubscribe(onChatFn)
        role.ev.format.unsubscribe(onFormatFn)
    },
    isDefault: true
})

type onChatFn = Parameters<typeof chat.ev.chat.subscribe>[0]
type onFormatFn = Parameters<typeof role.ev.format.subscribe>[0]
let onChatFn: onChatFn, onFormatFn: onFormatFn

chat.ev.chat.subscribe(onChatFn = (data) => {
    if (!data.sender.hasTag(adminTag)) return
    data.targets = cGroup.getTargets()
}, 1000)

role.ev.format.subscribe(onFormatFn = (data) => {
    if (data.formatType == 'nametag' || !data.plr.hasTag(adminTag)) return
    data.format = '§e§lAdmin Chat §f>§r ' + data.format
})
