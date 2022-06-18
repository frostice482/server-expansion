import areaLoader from "./arealoader.js";
import cc from "./cc.js";
import chat from "./chat.js";
import eventManager from "./evmngr.js";
import { execCmd } from "./mc.js";
import * as seMisc from './misc.js'
import permission from "./permission.js";
import plr from "./plr.js";
import role from "./role.js";
import scoreboard from "./scoreboard.js";
import * as sendChat from './sendChat.js'
import server from "./server.js";
import storage from "./storage.js";
import TypedValues from "./typedvalues.js";

const SEModule = seMisc.empty({
    areaLoader,
    cc,
    chat,
    eventManager,
    execCmd,
    permission,
    plr,
    role,
    scoreboard,
    sendChat,
    server,
    storage,
    TypedValues,
    misc: seMisc
})

export default SEModule
