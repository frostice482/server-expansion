import { world } from "mojang-minecraft"
import server from "./libcore/server.js"

world.events.tick.subscribe(({deltaTime}) => {
    for (const plr of world.getPlayers())
        plr.onScreenDisplay.setActionBar(`delta: ${(deltaTime * 1000).toFixed(2)}ms (tps: ${(1/deltaTime).toFixed(2)}) servertime: ${server.time}ms tickertime: ${server.ticker.time}ms (type: ${server.ticker.level})`)
})
