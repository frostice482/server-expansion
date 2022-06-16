import storage from './libcore/storage.js';
storage.instance.default.autoload = false
storage.instance.default.autosaveInterval = 0

import server from './libcore/server.js'
server.start()
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
