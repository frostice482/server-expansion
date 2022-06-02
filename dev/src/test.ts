import { BlockLocation, world } from "mojang-minecraft"
import * as gt from 'mojang-gametest'
import server from "./libcore/server.js"

world.events.tick.subscribe(({deltaTime}) => {
    for (const plr of world.getPlayers())
        plr.onScreenDisplay.setActionBar(`delta: ${(deltaTime * 1000).toFixed(2)}ms (tps: ${(1/deltaTime).toFixed(2)}) servertime: ${server.time}ms tickertime: ${server.ticker.time}ms (type: ${server.ticker.level})`)
})

gt.register("SE", "spawnFakePlayer", (test) => {
    test.print('A simulated player has been spawned. It will exist for up to 120 seconds.')

    const spawnLoc = new BlockLocation(1, 2, 1)
    let player = test.spawnSimulatedPlayer(spawnLoc, 'Dummy');

    test.succeedWhen(() => test.assertEntityPresentInArea('player', false))
    test.succeedOnTick(2400)
})
    .maxTicks(2420)
    .structureName("ComponentTests:platform")
