import { world } from "mojang-minecraft"
import server from "./libcore/server.js"
import storage from "./libcore/storage.js"

world.events.tick.subscribe(({deltaTime}) => {
    for (const plr of world.getPlayers())
        plr.onScreenDisplay.setActionBar(`delta: ${(deltaTime * 1000).toFixed(2)}ms (tps: ${(1/deltaTime).toFixed(2)}) servertime: ${server.time}ms tickertime: ${server.ticker.time}ms (type: ${server.ticker.level})`)
})

storage.instance.default.ev.save.subscribe(data => console.warn('storage save initialized'), 1000)
storage.instance.default.ev.postSave.subscribe(data => console.warn(`storage save done, time: ${data.time}, size: ${data.stringed.length}`), 1000)

storage.instance.default.ev.load.subscribe(data => console.warn('storage load initialized'), 1000)
storage.instance.default.ev.postLoad.subscribe(data => console.warn(`storage load done, time: ${data.time}, size: ${data.stringed.length}`), 1000)
