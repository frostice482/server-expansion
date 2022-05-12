import cc from "./cc.js";
import chat from "./chat.js";
import eventManager from "./evmngr.js";
import { execCmd } from "./mc.js";
import { empty } from "./misc.js";
import permission from "./permission.js";
import plr from "./plr.js";
import role from "./role.js";
import scoreboard from "./scoreboard.js";
import * as sendChat from './sendChat.js'
import server from "./server.js";
import * as _misc from "./misc.js";

export type { pluginConnectorInfo } from './bridgehost.js'

const SEModule = empty({
    cc,
    chat,
    execCmd,
    permission,
    plr,
    role,
    scoreboard,
    sendChat,
    server,
    misc: empty({
        ..._misc,
        eventManager,
    })
})

export default SEModule
