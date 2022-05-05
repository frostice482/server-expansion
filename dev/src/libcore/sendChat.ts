import { Player } from "mojang-minecraft"
import { dim, execCmd } from "./mc.js"
import { viewObj } from "./misc.js"

export const convertToString = (v: any) => typeof v == 'string' ? v : (Array.isArray(v) ? v : [v]).map(v => typeof v == 'string' ? v : viewObj(v)).join('\n§r')

const toExecutable = JSON.stringify

/**
 * Sends a message to selector / named player.
 * @param target Selector / player name.
 * @param message Message to be sent to the player(s).
 */
export const sendMsg = (target: string, message: any) =>
    void execCmd(`tellraw ${/^ *@[spear]( *\[.*\] *)?$/.test(target) ? target : toExecutable(target)} {"rawtext":[{"text":${toExecutable(convertToString(message))}}]}`, dim.o, true)

/**
 * Sends a message to the player.
 * @param target Player.
 * @param message Message to be sent to the player.
 */
export const sendMsgToPlayer = (target: Player, message: any) =>
    void execCmd(`tellraw @s {"rawtext":[{"text":${toExecutable(convertToString(message))}}]}`, target, true)

/**
 * Sends a message to players.
 * @param target Players.
 * @param message Message to be sent to players.
 */
export const sendMsgToPlayers = (target: Iterable<Player>, message: any) => {
    message = toExecutable(convertToString(message))
    for (let plr of target) execCmd(`tellraw @s {"rawtext":[{"text":${message}}]}`, plr, true)
}
