import { world } from "mojang-minecraft";
import cc from "./libcore/cc.js";
import role from "./libcore/role.js";
import chat from "./libcore/chat.js";
import eventManager from './libcore/evmngr.js'
import { execCmd } from "./libcore/mc.js";
import * as misc from './libcore/misc.js'
import permission from "./libcore/permission.js";
import plr from "./libcore/plr.js";
import scoreboard from "./libcore/scoreboard.js";
import * as sendChat from "./libcore/sendChat.js";
import { sendMsg, sendMsgToPlayer } from "./libcore/sendChat.js";
import server from "./libcore/server.js";
import TypedValues from "./libcore/typedvalues.js";

import * as mc from 'mojang-minecraft'
import * as mcui from 'mojang-minecraft-ui'

let gExecuter: mc.Player,
    gEvd: mc.BeforeChatEvent

const o = new Proxy({
    cc,
    chat,
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
    TypedValues,
    get executer() { return  gExecuter },
    get evd() { return  gEvd },
    mc,
    mcui
}, {
    get: (t, p) => p in t ? t[p] : globalThis[p],
    has: () => true
})

world.events.beforeChat.subscribe((evd) => {
    const { sender, message } = evd
    evd.cancel = true
    gEvd = evd
    gExecuter = sender
    try {
        sendMsgToPlayer(sender, `> ${message}`)
        Function(`with (this) {\n${message}\n}`).call(o)
    } catch(e) {
        sendMsgToPlayer(sender, e instanceof Error ? `${e}\n${e.stack}` : e)
        sendMsgToPlayer(sender, ' ')
    }
})
