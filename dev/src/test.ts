import { BlockLocation } from "mojang-minecraft"
import * as gt from 'mojang-gametest'

gt.register("SE", "spawnFakePlayer", (test) => {
    test.print('A simulated player has been spawned. It will exist for up to 120 seconds.')

    const spawnLoc = new BlockLocation(1, 2, 1)
    let player = test.spawnSimulatedPlayer(spawnLoc, 'Dummy');

    test.succeedWhen(() => test.assertEntityPresentInArea('player', false))
    test.succeedOnTick(2400)
})
    .maxTicks(2420)
    .structureName("ComponentTests:platform")
