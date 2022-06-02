import cc from './libcore/cc.js'
import role from './libcore/role.js'
import chat from './libcore/chat.js'
import permission from './libcore/permission.js'
import './test.js'

server.ev.beforeChat.subscribe((evd) => {
    if (evd.cancel) return
    evd.cancel = true
    if (evd.message.startsWith(cc.prefix)) {
        cc.execute(evd)
        return
    } else {
        chat.send(evd.sender, evd.message)
    }
}, 0)

// permissions
permission.assign('owner', 100)
    .assign('admin', 80)
    .assign('mod', 60)

// chat groups
new chat.group('_default', 0)

// role groups
new role.group('admins', 100)
    .styles
        .add('owner', '[§dOWNER§r]')
        .add('admin', '[§5ADMIN§r]')
        .add('mod', '[§3MOD§r]')

new role.group('specials', 90)
    .styles
        .add('mvpp', '[§e§lMVP+§r]')
        .add('mvp', '[§gMVP§r]')
        .add('vipp', '[§a§lVIP+§r]')
        .add('vip', '[§2VIP§r]')

// teams
new chat.group('teamRed', 1, ['teamRed'])
new chat.group('teamBlue', 1, ['teamBlue'])

new role.group('team')
    .styles
        .add('teamRed', '[§cRED§r]')
        .add('teamBlue', '[§bBLUE§r]')

// custom commands
import './defaultcc/index.js'

// start ticker
import server from './libcore/server.js'
server.start()
