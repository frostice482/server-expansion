import areaLoader from "../libcore/arealoader.js";
import { world } from "mojang-minecraft";
import cc, { ccVars } from "../libcore/cc.js";
import role from "../libcore/role.js";
import chat from "../libcore/chat.js";
import eventManager from '../libcore/evmngr.js'
import { dim, execCmd } from "../libcore/mc.js";
import * as misc from '../libcore/misc.js'
import permission from "../libcore/permission.js";
import plr from "../libcore/plr.js";
import scoreboard from "../libcore/scoreboard.js";
import * as sendChat from "../libcore/sendChat.js";
import { sendMsg } from "../libcore/sendChat.js";
import storage from "../libcore/storage.js";
import server from "../libcore/server.js";
import TypedValues from "../libcore/typedvalues.js";
import SEBridgeConnector from "../libcore/bridgeconnector.js";
import SEBridgeHost from "../libcore/bridgehost.js";

import * as mc from 'mojang-minecraft'
import * as mcui from 'mojang-minecraft-ui'

const ccmd = new cc('eval', {
    description: new cc.description({
        name: 'Eval',
        description: 'Executes JavaScript code.',
        aliases: ['eval'],
        usage: [
            [ [ 'eval' ], 'Enters REPL mode.'],
            [ [ 'eval', { type: [['value', 'any']], name: 'code' } ], 'Executes JavaScript code.'],
        ]
    }),
    minPermLvl: 100,
    triggers: /^eval$/i,
    onTrigger: (v) => {
        if (v.argFull)
            execEval(v.beforeChatEvd, v.argFull)
        else {
            const {executer} = v
            replList.add(executer)
            executer.sendMsg([
                ` `,
                `Entering REPL mode.`,
                `Type '.send' to send a message to chat.`,
                `Type '.exit' to exit.`,
                ` `
            ])
        }
    }
})

const execEval = (evd: mc.BeforeChatEvent, cmd: string) => {
    const { sender: executer } = evd
    const log = executer.sendMsg.bind(executer)

    gExecuter = executer

    let v
    try {
        log(`> ${cmd}`)
        v = misc.renameFn( Function( `context`, `with (context) return eval(${JSON.stringify(cmd)})` ), 'runInThisContext' )(o)
    } catch (e) {
        return log( 'Uncaught ' + ( e instanceof Error ? `${e}\n${e.stack}` : misc.viewObj(e) ) )
    }
    log(misc.viewObj(v))
}

// repl mode
const replList = new WeakSet<mc.Player>()

server.ev.beforeChat.subscribe((evd, ctrl) => {
    if (!replList.has(evd.sender)) return

    ctrl.break()
    evd.cancel = true

    if (evd.message.startsWith('.exit')) {
        evd.sender.sendMsg(`Exited REPL.`)
        return replList.delete(evd.sender)
    }
    else if (evd.message.startsWith('.send')) {
        return chat.send(evd.sender, evd.message.substring(6))
    }
    else execEval(evd, evd.message)
}, 1)

// variables
let gExecuter: mc.Player

const o = new Proxy({
    areaLoader,
    cc,
    chat,
    dim,
    eventManager,
    world,
    execCmd,
    misc,
    permission,
    plr,
    role,
    scoreboard,
    sendChat,
    sendMsg,
    server,
    storage,
    TypedValues,
    SEBridgeHost,
    SEBridgeConnector,
    get executer() { return gExecuter },
    mc,
    mcui
}, {
    get: (t, p) => p in t ? t[p] : globalThis[p],
    has: () => true
})
