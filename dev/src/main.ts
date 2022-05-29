import { world } from 'mojang-minecraft'
import cc from './libcore/cc.js'
import role from './libcore/role.js'
import chat from './libcore/chat.js'
import permission from './libcore/permission.js'
import './test.js'

world.events.beforeChat.subscribe((evd) => {
    evd.cancel = true
    if (evd.message.startsWith(cc.prefix)) {
        cc.execute(evd)
        return
    } else {
        chat.send(evd.sender, evd.message)
    }
})

// permissions
permission.assign('owner', 100)
    .assign('admin', 80)
    .assign('mod', 60)

// chat groups
new chat.group('_default', 0)

// role groups
new role.group('admins', 100)
    .styles
        .add('owner', '[§bOWNER§r]')
        .add('admin', '[§3ADMIN§r]')
        .add('mod', '[§5MOD§r]')

new role.group('specials', 90)
    .styles
        .add('mvpp', '[§e§lMVP+§r]')
        .add('mvp', '[§gMVP§r]')
        .add('vipp', '[§a§lVIP+§r]')
        .add('vip', '[§2VIP§r]')

// custom commands
import './libcc/index.js'

// start ticker
import server from './libcore/server.js'
server.start()
