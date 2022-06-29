import Area from "./area.js";
import cc from "./cc.js";
import role from "./role.js";
import chat from "./chat.js";
import eventManager from './evmngr.js'
import { execCmd } from "./mc.js";
import * as misc from './misc.js'
import permission from "./permission.js";
import plr from "./plr.js";
import scoreboard from "./scoreboard.js";
import * as sendChat from "./sendChat.js";
import storage from "./storage.js";
import server from "./server.js";
import TypedValues from "./typedvalues.js";

const SEModule = misc.empty({
    Area,
    cc,
    role,
    chat,
    eventManager,
    execCmd,
    misc,
    permission,
    plr,
    scoreboard,
    sendChat,
    storage,
    server,
    TypedValues
})

export default SEModule
