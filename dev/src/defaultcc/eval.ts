import { world } from "mojang-minecraft";
import cc, { ccVars } from "../libcore/cc.js";
import role from "../libcore/role.js";
import chat from "../libcore/chat.js";
import eventManager from '../libcore/evmngr.js'
import { execCmd } from "../libcore/mc.js";
import * as misc from '../libcore/misc.js'
import permission from "../libcore/permission.js";
import plr from "../libcore/plr.js";
import scoreboard from "../libcore/scoreboard.js";
import * as sendChat from "../libcore/sendChat.js";
import { sendMsg } from "../libcore/sendChat.js";
import server from "../libcore/server.js";
import TypedValues from "../libcore/typedvalues.js";

import * as mc from 'mojang-minecraft'
import * as mcui from 'mojang-minecraft-ui'

let gExecuter: mc.Player,
    gEvd: mc.BeforeChatEvent,
    gVars: ccVars

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
    get vars() { return gVars },
    mc,
    mcui
}, {
    get: (t, p) => p in t ? t[p] : globalThis[p],
    has: () => true
})

const ccmd = new cc('eval')
ccmd.minPermLvl = 100
ccmd.triggers = /^eval$/i
ccmd.onTrigger = (v) => {
    const { executer, evd, argFull } = v
    const log = executer.sendMsg.bind(executer)

    gExecuter = executer
    gEvd = evd
    gVars = v

    try {
        log(`> ${argFull}`)
        new Function(`with (this) {\n${v.argFull}\n}`).call(o)
    } catch (e) {
        if (e instanceof Error) log(`${e}\n${e.stack}`)
        else log(misc.viewObj(e))
        log(' ')
    }
}