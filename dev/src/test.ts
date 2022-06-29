import { BlockLocation, MinecraftBlockTypes } from "mojang-minecraft"
import * as gt from 'mojang-gametest'

gt.register("SE", "spawnFakePlayer", (test) => {
    test.print('A simulated player has been spawned. It will exist for up to 120 seconds.')

    const spawnLoc = new BlockLocation(1, 2, 1)
    for (let i = 0; i < 100; i++) test.spawnSimulatedPlayer(spawnLoc, 'Dummy');

    test.succeedWhen(() => test.assertBlockPresent(MinecraftBlockTypes.air, spawnLoc, false))
    test.succeedOnTick(2147483627)
})
    .maxTicks(2147483647)
    .structureName("ComponentTests:platform")
