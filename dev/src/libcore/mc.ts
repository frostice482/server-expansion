import { Dimension, Entity, world } from 'mojang-minecraft'
import { empty } from './misc.js'

const auth = Symbol()

/**
 * Minecraft dimensions.
 */
export const dim = (() => {
    const o = world.getDimension('overworld'),
        n = world.getDimension('nether'),
        e = world.getDimension('the end')
    return Object.freeze(
        empty({
            overworld: o,
            nether: n,
            end: e,
            o,
            n,
            e
        })
    )
})()

type dimKeys = keyof typeof dim

/**
 * Executes Minecraft command.
 * @param command Minecraft command.
 * @param source Source where the command will be executed at.
 * @param ignoreError Determines whether error thrown should be ignored or not.
 */
export const execCmd = (command: string, source: dimKeys | Entity | Dimension = 'overworld', ignoreError: boolean = false): CommandResponse => {
    try {
        return ( typeof source == 'string' ? dim[source] : source ).runCommand(command)
    } catch(e) {
        if (e instanceof Error) throw e
        const r: CommandResponse = JSON.parse(e)
        if (ignoreError) return r
        throw new CommandError(auth, r.statusCode, r.statusMessage, command)
    }
}

type CommandResponse = {
    [k: string]: any
    /** Command response code. Returns `0` if succeed, `-2147483648` if syntax error, `-2147352576` if command error. */
    readonly statusCode: number
    /** Command response message. */
    readonly statusMessage: string
}

class CommandError extends Error {
    readonly code: number
    readonly command: string
    constructor(key: typeof auth, code: number, message: string, command: string) {
        super()
        if (key !== auth) throw new TypeError('Class is not constructable')
        this.name = this.constructor.name
        this.message = `${message}\nCode: ${code}  -  Command: ${command}`
        this.stack = this.stack.replace(/.*\n/, '')
        Object.assign(this, { code, command })
    }
}
