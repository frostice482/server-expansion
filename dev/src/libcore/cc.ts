import { BeforeChatEvent, Dimension, Player, world } from "mojang-minecraft"
import { dim, execCmd } from "./mc.js"
import { deepAssign, empty, parseRegex, renameFn } from "./misc.js"
import permission from "./permission.js"
import { convertToString, sendMsgToPlayers } from "./sendChat.js"
import storage from "./storage.js"
import TypedValues, { typedValuesAll, typedValuesJSON } from "./typedvalues.js"

export default class cc {
    static get parser() { return parser }
    static get typedArgs() { return TypedArgs }
    static get description() { return ccDescription }
    static get error() { return ccError }

    static #prefix: string = '!'
    static get prefix() { return this.#prefix }
    static set prefix(v) {
        if (v.includes(' ')) throw new TypeError(`Prefix cannot include a space`)
        if (v[0] == '/') throw new TypeError(`Prefix cannot start with '/'`)
        this.#prefix = v
    }

    /**
     * Gets a command from identifier.
     * @param id Identifier / command data.
     */
    static readonly 'get' = (id: string | cc) => ccList.get(typeof id == 'string' ? id : id.id)

    /**
     * Gets a command from trigger.
     * @param trigger Command trigger.
     */
    static readonly getCommandFromTrigger = (trigger: string) => {
        for (const cmd of ccList.values())
            if (cmd.triggers instanceof RegExp ? cmd.triggers.test(trigger) : cmd.triggers.includes(trigger))
                return cmd
    }

    /**
     * Test if a command exists.
     * @param id Identifier / command data.
     */
    static readonly exist = (id: string | cc) => ccList.has(typeof id == 'string' ? id : id.id)

    /**
     * Gets custom command list.
     */
    static readonly getList = () => ccList.values()

    /**
     * Deletes a custom command.
     * @param id Identifier / command data.
     */
    static readonly delete = (id: string | cc) => {
        id = typeof id == 'string' ? id : id.id
        if (!ccList.has(id)) return false
        
        const ccData = ccList.get(id)
        ccData.onDelete?.()
        ccList.delete(id)

        return true
    }

    /**
     * Executes a custom command.
     * @param evd Before chat event data.
     */
    static readonly execute = (evd: BeforeChatEvent) => {
        let {sender: executer, message} = evd
        try {
            message = message.substring(this.#prefix.length)

            const args = parser.arg(message),
                command = args.shift()

            const cmd = this.getCommandFromTrigger(command)
            if (!cmd) throw new cc.error(`Command not found: '${command}'`, 'ReferenceError')
            const executerPermLvl = permission.getLevel(executer.getTags())
            if (
                cmd.minPermLvl && executerPermLvl < cmd.minPermLvl
                || !this.testReqTags(cmd.reqTags, executer)
            ) throw new cc.error(`You have no permission to use this command: ${cmd.description?.name ?? `'${cmd}'`}`, 'TypeError')
            if (cmd.isDisabled) throw new cc.error(`Command is disabled: ${cmd.description?.name ?? `'${cmd}'`}`, 'TypeError')

            const argFull = message.substring(command.length + 1),
                typedArgs = cmd.typedArgs?.parse(args) ?? args
            
            const admins = cmd.minPermLvl >= 0 ? [...permission.getAdmins(executer)] : []

            const vars: ccVars = empty({
                command: cmd,
                trigger: command,
                executer,
                args,
                argFull,
                typedArgs,
                beforeChatEvd: evd,
                log: (msg) => {
                    const convertedMsg = convertToString(msg)
                    executer.sendMsg(convertedMsg)
                    if (cmd.minPermLvl >= 0) sendMsgToPlayers( admins, `§8${executer.nickname}§r§8: ${convertedMsg.replace(/(?<= ) +|\s(?<! )|\u00a7./g, '').substring(0, 100)}` )
                }
            })

            if (typeof cmd.onTrigger == 'function') cmd.onTrigger(vars)
            else
                for (const a of Array.isArray(cmd.onTrigger) ? cmd.onTrigger : [cmd.onTrigger]) {
                    switch (a.type) {
                        case 'command':
                            for (const cmd of a.commands)
                                try { execCmd(cmd, executer) }
                                catch(e) { if (a.ignoreError) throw e }
                        break
                        case 'eval':
                            //@ts-ignore
                            (a.scriptCache ??= renameFn(Function(`vars`, `(${a.script})(vars)`), `[Command: ${cmd.id}]`))(vars)
                        break
                    }
                }
        } catch (e) {
            if (e instanceof Error) {
                if (
                    e instanceof ccError
                    || e.name == 'Error'
                    || e.name == 'SyntaxError'
                ) executer.sendMsg(`§c${e}`)
                else executer.sendMsg(`An error occured when executing a custom command: \n${e}\n${e.stack}`)
            }
            else executer.sendMsg(e)
        }
    }

    /**
     * Creates a custom command from JSON data.
     * @param data JSON data.
     */
    static readonly fromJSON = (data: ccJSONData) => {
        const { id, description, minPermLvl, isHidden, isDisabled, isDefault, reqTags, typedArgs, triggers, onTrigger } = data
        return new this(id, {
            description: description ? ccDescription.fromJSON(description) : undefined,
            minPermLvl,
            isHidden,
            isDisabled,
            isDefault,
            reqTags,
            typedArgs: typedArgs ? TypedArgs.fromJSON(typedArgs) : undefined,
            triggers: triggers.type == 'regexp' ? parseRegex(triggers.value) : triggers.value,
            onTrigger
        })
    }

    /**
     * Creates a custom command from JSON save data.
     * @param data JSON save data.
     * @param overwrite Overwrites existing custom command.
     */
    static readonly fromJSONSave = (data: ccSaveJSONData, overwrite = false) => {
        const { id, data: ccData } = data
        if (data.extends == true) {
            const ccTarget = ccList.get(id)
            if (!ccTarget) throw new ReferenceError(`Failed to extend custom command with ID '${id}' because the command doesn't exist`)
            Object.assign(ccTarget, ccData)
            return ccTarget
        } else {
            if (overwrite) cc.delete(data.id)
            return this.fromJSON(data.data)
        }
    }

    static testReqTags = (() => {
        const test = empty({
            all: (v: number) => v == 1,
            any: (v: number) => v > 0,
            none: (v: number) => v == 0,
        })
        const exec = (reqTags: cc['reqTags'] = [], plr: Player) => {
            let testCnt = 0, success = 0
            
            if (Array.isArray(reqTags))
                for (const tag of reqTags) {
                    testCnt++
                    if (plr.hasTag(tag)) success++
                }
            
            else
                for (const k in reqTags) {
                    if (!(k in test)) continue
                    testCnt++
                    const r = exec(reqTags[k], plr)
                    if (test[k](r)) success++
                }
            
            return testCnt ? success / testCnt : 1
        }
        return (reqTags: cc['reqTags'] = [], plr: Player) => test.all(exec(reqTags, plr))
    })()

    /**
     * Creates a custom command.
     * @param id Custom command identifier.
     * @param properties Initializer properties.
     */
    constructor(id: string, properties: Optional<ExcludeSome<cc, 'id' | 'toJSONSave' | 'toJSON'>> = {} ) {
        if (ccList.has(id)) throw new TypeError(`Custom command with ID '${id}' already exists`)
        this.id = id
        Object.assign(this, properties)
        ccList.set(id, this)
    }

    /** Identfier. */
    readonly id: string
    /** Command description. */
    description?: ccDescription

    /** Minimum permission level to execute the command. */
    minPermLvl?: number
    /** Required tags. */
    reqTags?: { [K in 'all' | 'any' | 'none']: this['reqTags'] } | string[]

    /** Deterines whether command is hidden or not. */
    isHidden?: boolean
    /** Deterines whether command is disabled or not. */
    isDisabled?: boolean
    /** Deterines whether command is efault or not. Will only save partial info of this command. */
    isDefault?: boolean

    /** Typed arguments. */
    typedArgs?: TypedArgs

    /** Command triggers. */
    triggers: RegExp | string[] = []
    /** Function to be executed on trigger. */
    onTrigger: ccOnTriggerFn | ccOnTrigger['all'] | ccOnTrigger['all'][] = () => {}

    /** Function to be executed on delete. */
    onDelete: () => void

    /**
     * Converts to JSON data.
     */
    readonly toJSON = (): ccJSONData => {
        const { id, description, minPermLvl, isHidden, isDisabled, isDefault, reqTags, typedArgs, triggers, onTrigger } = this
        return {
            id,
            description: description?.toJSON(),
            minPermLvl,
            isHidden,
            isDisabled,
            isDefault,
            reqTags,
            typedArgs: typedArgs?.toJSON(),
            triggers: triggers instanceof RegExp ? { type: 'regexp', value: triggers.toString() } : { type: 'array', value: triggers },
            onTrigger: typeof onTrigger == 'function' ? [] : onTrigger
        }
    }

    /**
     * Converts to JSON save data.
     */
    readonly toJSONSave = (): ccSaveJSONData => {
        const {id, isDefault = false} = this
        return isDefault == false ? {
            id,
            extends: isDefault,
            data: this.toJSON()
        } : {
            id,
            extends: isDefault,
            data: {
                minPermLvl: this.minPermLvl,
                reqTags: this.reqTags,
                isHidden: this.isHidden,
                isDisabled: this.isDisabled,
            }
        }
    }
}

const ccList = new Map<string, cc>()

type ccOnTriggerFn = (vars: ccVars) => void
type ccOnTrigger = {
    command: {
        type: 'command'
        commands: string[]
        ignoreError?: boolean
    }
    eval: {
        type: 'eval'
        script: string
        scriptCache?: ccOnTriggerFn
    }
    all: ccOnTrigger[Exclude<keyof ccOnTrigger, 'all'>]
}
type ccOnTriggerJSONData = {
    command: {
        type: 'command'
        commands: string[]
        ignoreError?: boolean
    }
    eval: {
        type: 'eval'
        script: string
    }
    all: ccOnTrigger[Exclude<keyof ccOnTriggerJSONData, 'all'>]
}

type ccJSONData = {
    id: string
    description?: ccDescriptionJSONData
    minPermLvl?: number
    isHidden?: boolean
    isDisabled?: boolean
    isDefault?: boolean
    reqTags?: cc['reqTags']
    typedArgs?: TAJSONSeqs
    triggers: { type: 'regexp', value: string } | { type: 'array', value: string[] }
    onTrigger: ccOnTriggerJSONData['all'] | ccOnTriggerJSONData['all'][]
}

type ccSaveJSONData = {
    id: string
    extends: true
    data: Optional<Pick<cc, 'minPermLvl' | 'reqTags' | 'isHidden' | 'isDisabled'>>
} | {
    id: string
    extends: false
    data: ccJSONData
}

class ccDescription {
    /**
     * Creates a custom command description from JSON data.
     * @param data JSON data.
     */
    static readonly fromJSON = (data: ccDescriptionJSONData) => new this(data)

    /**
     * Creates a custom command description.
     * @param properties Property initializers.
     */
    constructor(properties: Optional<ccDescriptionJSONData> = {}) {
        deepAssign(this, properties)
    }

    /** Command name. */
    name = ''
    /** Command description. */
    description = ''
    /** Command aiases. */
    aliases: string[] = []
    /** Command usages. */
    usage: [
        usage: ( string | { type: [ type: 'keyword' | 'value', value: string ][], name?: string, required?: boolean } )[],
        description?: string,
        example?: string
    ][] = []

    /** Variables. */
    variables: List<any> = {}
    /** Formats. */
    formats: {
        /** Aliases format. */
        aliases?: {
            /** Alias format. Escape with `#~` for alias. */
            format?: string
            /** Join separator. */
            joinSeparator?: string
        }
        /** Value type format. */
        type?: {
            /** Type format. */
            typeFormat?: {
                /** Keyword format. Escape with `#~` for value. */
                keyword?: string
                /** Value format. Escape with `#~` for value. */
                value?: string
                /** Join separator. */
                joinSeparator?: string
            }
            /** Value type format. */
            format?: {
                /** Type-only format. Escape with `#~t` for type. */
                typeOnly?: string
                /** Type and name format. Escape with `#~t` for type, `#~n` for name. */
                withName?: string
                /** Type-only format if optional. Escape with `#~t` for type. */
                typeOnlyOptional?: string
                /** Type and name format if optional. Escape with `#~t` for type, `#~n` for name. */
                withNameOptional?: string
            }
        }
        /** Usage format. */
        usage?: {
            /** Usage format. */
            format?: {
                /** Usage-only format. Escape with `#~u` for usage. */
                usageOnly?: string
                /** Usage with description format. Escape with `#~u` for usage, `#~d` for description. */
                withDescription?: string
                /** Usage with description and example format. Escape with `#~u` for usage, `#~d` for description, `#~e` for example. */
                withExample?: string
                /** Usage join separator. */
                joinSeparator?: string
            }
            /** Sequence format. */
            sequenceFormat?: {
                /** Keyword format. Escape with `#~` for keyword. */
                keyword?: string
                /** Value format. Escape with `#~` for type. */
                type?: string
                /** Keyword / type join separator. */
                joinSeparator?: string
            }
        }
    } = {
        aliases: {
            format: '§7#~§8',
            joinSeparator: ', '
        },
        type: {
            typeFormat: {
                keyword: '§a#~§r',
                value: '§e#~§r',
                joinSeparator: ' | '
            },
            format: {
                typeOnly: '{#~t}',
                withName: '{§b#~n§r: #~t}',
                typeOnlyOptional: '{#~t?}',
                withNameOptional: '{§b#~n§r?: #~t}'
            }
        },
        usage: {
            format: {
                usageOnly: ' §8|§r #~u',
                withDescription: ' §8|§r #~u §8- §7#~d',
                withExample: ' §8|§r #~u §8- §7#~d\n§7Example: #~e',
                joinSeparator: '\n'
            },
            sequenceFormat: {
                keyword: '§a#~§r',
                type: '#~',
                joinSeparator: ' ',
            }
        }
    }
    /** Format. Escape with `#<var>`. */
    format = ([
        '#<name> §8- #<aliases>',
        '#<description>',
        ' ',
        '§d==[ Usages ]==§r',
        '#<usages>'
    ]).join('\n§r')

    /** Cache output. */
    cache?: string

    get [Symbol.toPrimitive]() { return this.generate }
    get toString() { return this.generate }

    /**
     * Generates a command description.
     * @param ignoreCache Ignores cache.
     */
    readonly generate = (ignoreCache = false) => {
        const useCache = Object.keys(this.variables).length == 0
        if (useCache && this.cache && !ignoreCache) return this.cache

        const {
            type: {
                format: {
                    typeOnly: tfm0,
                    withName: tfm1,
                    typeOnlyOptional: tfm2,
                    withNameOptional: tfm3
                },
                typeFormat: {
                    keyword: tfmkw,
                    value: tfmv,
                    joinSeparator: tfmj,
                }
            },
            aliases: {
                format: afmf,
                joinSeparator: afmj
            },
            usage: {
                format: {
                    usageOnly: ufm0,
                    withDescription: ufm1,
                    withExample: ufm2,
                    joinSeparator: ufmj
                },
                sequenceFormat: {
                    joinSeparator: usfmj,
                    keyword: usfmkw,
                    type: usfmt
                }
            }
        } = this.formats
        const _a = [ufm0, ufm1, ufm2] as const,
            _b = [ tfm0, tfm1, tfm2, tfm3 ] as const

        const vars = empty({
            name: this.name,
            description: this.description,
            v: this.variables,
            usages:
                this.usage.map(v => {
                    let [u, d, e] = v
                    const un = u.map(v => {
                        if (typeof v == 'string') return usfmkw.replace('#~', v)
                        const t = v.type
                            .map( ([t, v]) => ( t == 'keyword' ? tfmkw : tfmv ).replace('#~', v) ) // map keyword / value, replaces escaping `#~`
                            .join(tfmj)
                        return usfmt
                            .replace(
                                '#~', // replaces escaping `#~`
                                _b[ +!!v.name + +!( v.required ?? 1 ) * 2 ] // type format (0: type only, 1: type & name, 2: type only, optional, 3: type & name, optional)
                                    .replace( /#~([nt])/g, (m, x) => x == 't' ? t : v.name ?? '' ) // replaces escaping `#~n`, `#~t`
                            )
                    }).join(usfmj)
                    return _a[v.length - 1] // usage format (0: usage only, 1: usage & description, 2: usage, description, & examples)
                        .replace( /#~([ude])/g, (m, v) => v == 'u' ? un : v == 'd' ? d : e ) // replaces escaping `#~u`, `#~d`, `#~e`
                }).join(ufmj),
            aliases: this.aliases.map(v => afmf.replace('#~', v)).join(afmj)
        })

        const v = this.format.replace(/#<(\w+(.\w+)*)+>/g, (m, a: string) => {
            let obj: any = vars
            for (const p of a.split('.')) obj = (obj ?? {})[p]
            return obj ?? ''
        })

        return useCache && !ignoreCache ? this.cache = v : v
    }

    /**
     * Converts description data to JSON.
     */
    readonly toJSON = (): ccDescriptionJSONData => {
        const { name, description, aliases, usage, variables, formats, format, cache } = this
        return { name, description, aliases, usage, variables, formats, format, cache }
    }
}

type ccDescriptionJSONData = {
    [K in Extract<Exclude<keyof ccDescription, 'toJSON' | 'generate' | 'toString'>, string>]: ccDescription[K]
}

export type ccVars = {
    [k: string]: any
    /** Command triggered. */
    readonly command: cc
    /** Command keyword used to call the command. */
    readonly trigger: string
    /** Full argument passed to the command. */
    readonly argFull: string
    /** Arguments passed to the command.  */
    readonly args: string[]
    /** Typed arguments parse output. */
    readonly typedArgs: any[]
    /** Command executer. */
    readonly executer: Player
    /** Before chat event data. */
    readonly beforeChatEvd: BeforeChatEvent
    /** Logs a message to executer and admins. */
    readonly log: (msg: any) => void
}

class ccError extends Error {
    constructor(message?: string, name = 'Error') {
        super(message)
        this.name = name
        this.stack = this.stack.replace(/^.*\n?/, '')
    }
}

class parser {
    /**
     * Parses a number from string.
     * @param arg Number to be parsed.
     */
    static readonly number = Object.assign(
        (arg: string) => {
            const v = Number(arg)
            if (isNaN(v)) throw new TypeError(`'${arg}' is not a number`)
            return v
        }, {
            toJSON: (): parserJSONData['number'] => ({ type: 'number' })
        }
    )

    /**
     * Parses a boolean from string.
     * @param arg Boolean to be parsed.
     */
    static readonly boolean = (() => {
        const defs = {
            true: empty({
                true: 1,
                1: 1
            }),
            false: empty({
                false: 1,
                0: 1
            })
        }
        return Object.assign(
            (arg: string) => {
                const v = arg in defs.true ? true : arg in defs.false ? false : null
                if (v === null) throw new TypeError(`'${arg}' is not a boolean`)
                return v
            }, {
                toJSON: (): parserJSONData['boolean'] => ({ type: 'boolean' })
            }
        )
    })()

    /**
     * Parses a switch from string.
     * @param arg String to be parsed.
     */
    static readonly switch = (() => {
        const defs = {
            true: empty({
                on: 1,
                enable: 1,
                enabled: 1
            }),
            false: empty({
                off: 1,
                disable: 1,
                disabled: 1
            })
        }
        return Object.assign(
            (arg: string) => {
                const v = arg in defs.true ? true : arg in defs.false ? false : null
                if (v === null) throw new TypeError(`'${arg}' is not a switch`)
                return v
            }, {
                toJSON: (): parserJSONData['switch'] => ({ type: 'switch' })
            }
        )
    })()

    /**
     * Parses regular expression
     */
    static readonly regex = Object.assign(parseRegex, {
        toJSON: (): parserJSONData['regex'] => ({ type: 'regex' })
    })

    /**
     * Parses string argument.
     * @param arg String argument.
     */
    static readonly arg = (arg: string) => {
        const group = empty({
            '(': ')',
            '{': '}',
            '[': ']',
            '"': '"'
        })
        let sequence: string[] = [],
            curSequence = '',
            isEscaped = false,
            groupCloseData: string[] = [],
            groupClose = ''
        for (const char of arg + ' ') {
            if (isEscaped) {
                isEscaped = false
            }
            else if (char == '\\') {
                isEscaped = true
                if (groupCloseData[0] === '"') continue
            }
            else if (char in group && groupClose !== '"') {
                const close = group[char]
                groupCloseData.push(close)
                groupClose = close
            }
            else if (char === groupClose) {
                groupCloseData.pop()
                groupClose = groupCloseData[groupCloseData.length - 1]
            }
            else if (char === ' ' && !groupClose) {
                if (curSequence) {
                    if (curSequence[0] === '"' && curSequence[curSequence.length - 1] === '"') curSequence = curSequence.slice(1, -1)
                    sequence.push(curSequence)
                    curSequence = ''
                }
                continue
            }
            curSequence += char
        }
        if (curSequence) sequence.push(curSequence)
        return sequence
    }

    /**
     * Creates a typed value parser function.
     * @param type Typed value.
     */
    static readonly typedValues = <T>(type: typedValuesAll) => Object.assign(
        (arg: string) => {
            const v = JSON.parse(arg)
            if (!type.test(v)) throw new TypeError(`Argument '${arg}' does not match type ${type.name ?? '(unnamed)'}`)
            return v as T
        }, {
            toJSON: (): parserJSONData['typedValue'] => ({ type: 'typedValue', data: type.toJSON() })
        }
    )

    /**
     * Parses a player selector.
     * @param selector Player selector to be parsed.
     */
    static readonly playerSelector = (() => {
        class PlayerSelector {
            constructor(selector: string) {
                this.#selector = selector
                if (!/^ *@[spear]( *\[.*\] *)?$/.test(selector)) {
                    if (selector[0] == '@') {
                        selector = selector.slice(1)
                        if (selector[0] == '"' && selector[selector.length - 1] == '"') {
                            selector = selector.slice(1, -1)
                        }
                    }
                    for (const plr of world.getPlayers())
                        if (plr.name == selector || plr.nickname == selector) {
                            this.#plrCache = plr
                            break
                        }
                }
            }

            readonly execute = (() => {
                const t = this
                return function* (source: Player | Dimension = dim.o) {
                    if (t.#plrCache !== undefined) return yield t.#plrCache
    
                    const nameList: List<0> = empty()
                    for (const v of execCmd(`testfor ${t.#selector}`, source, true).victim ?? []) nameList[v] = 0
                    for (const plr of world.getPlayers())
                        if (plr.name in nameList) yield plr
                }
            })()

            #selector: string
            #plrCache: Player

            get toString() { return this[Symbol.toPrimitive] }
            readonly [Symbol.toPrimitive] = () => this.#selector
        }
        return Object.assign(
            (selector: string) => new PlayerSelector(selector),
            {
                toJSON: (): parserJSONData['selector'] => ({ type: 'selector' })
            }
        )
    })()

    static readonly any = Object.assign( (v) => v, { toJSON: (): parserJSONData['any'] => ({ type: 'any' }) } )

    protected constructor() { throw new TypeError('Class is not constructable') }
}

type parserJSONData = {
    number: {
        type: 'number'
    }
    boolean: {
        type: 'boolean'
    }
    switch: {
        type: 'switch'
    }
    selector: {
        type: 'selector'
    }
    any: {
        type: 'any'
    }
    regex: {
        type: 'regex'
    }
    typedValue: {
        type: 'typedValue'
        data: typedValuesJSON['all'][]
    }
    all: parserJSONData[Exclude<keyof parserJSONData, 'all'>]
}

class TypedArgs {
    /**
     * Parses a typed argument from json.
     * @param data JSON Data.
     */
    static readonly fromJSON = (() => {
        const _a = (v: TAJSONSeqPart | TAJSONSeqPart[]): TASeqPart | TASeqPart[] =>
            typeof v == 'string' ? v
            : Array.isArray(v) ? v.map(_a) as TASeqPart[]
            : v.type == 'boolean' ? parser.boolean
            : v.type == 'switch' ? parser.switch
            : v.type == 'number' ? parser.number
            : v.type == 'selector' ? parser.playerSelector
            : v.type == 'regex' ? parser.regex
            : v.type == 'typedValue' ? parser.typedValues(TypedValues.fromJSON(v.data))
            : null

        return (data: TAJSONSeqs) => new this( data.map( ({sequence, minArgs}) => ({ sequence: sequence.map(_a), minArgs }) ) )
    })()

    /**
     * Creates a typed argument.
     * @param sequences Argument sequences.
     */
    constructor(sequences: TASeqs = []) {
        this.#seqs = sequences
    }

    #seqs: TASeqs

    /**
     * Adds an argument sequence.
     * @param sequence Argument sequence.
     * @param minArgs Minimum arguments to be passed.
     */
    readonly addSequence = (sequence: ( TASeqPart | TASeqPart[] )[], minArgs = sequence.length) => {
        this.#seqs.push({sequence, minArgs})
    }

    /**
     * Converts typed argument to json.
     */
    readonly toJSON = (() => {
        const _a = (v: TASeqPart | TASeqPart[]): TAJSONSeqPart | TAJSONSeqPart[] =>
            typeof v == 'string' ? v
            : typeof v == 'function' ? v.toJSON()
            : v.map(_a) as TAJSONSeqPart[]
        
        return (): TAJSONSeqs => this.#seqs.map( ({sequence, minArgs}) => ({ sequence: sequence.map(_a), minArgs: minArgs ?? sequence.length }) )
    })()

    /**
     * Parses a arguments.
     * @param v Arguments.
     */
    readonly parse = (v: string | string[]) => {
        v = Array.isArray(v) ? v : parser.arg(v)
        if (this.#seqs.length == 0) return v

        let highestErrLevel = 0,
            errMessage = [],
            err = (lev: number, ...msg: any[]) => {
                highestErrLevel == lev ? errMessage.push(...msg)
                : highestErrLevel < lev ? ( highestErrLevel = lev, errMessage = msg )
                : null
            }
        
        a:
        for (const { sequence, minArgs = sequence.length } of this.#seqs) {
            if (minArgs > v.length) {
                err(0, RangeError(`Not enough arguments passed to the command: expecting ${ minArgs == sequence.length ? `at least ${minArgs}` : `${minArgs}-${sequence.length}` } argument(s), got ${v.length}`))
                continue a
            }
            let o = []
            b:
            for (
                let i = 0, m = v.length, arg: string, OseqPart: typeof sequence[number];
                arg = v[i], OseqPart = sequence[i], i < m;
                i++
            ) {
                if (OseqPart === undefined) {
                    o.push(arg)
                    continue b
                }
                const errs = []
                for ( const seqPart of Array.isArray(OseqPart) ? OseqPart : [OseqPart] )
                    try {
                        if (typeof seqPart == 'string') {
                            if (arg !== seqPart) throw new SyntaxError(`Expecting '${seqPart}', got '${arg}'`)
                            o.push(arg)
                        } else {
                            o.push(seqPart(arg))
                        }
                        continue b
                    } catch(e) {
                        errs.push(e)
                    }
                err(i, ...errs)
                continue a
            }
            return o
        }
        const [e] = errMessage
        throw new ccError(e.message, e.name)
    }

    get sequence() { return this.#seqs }
}

type TASeqPart = string | { (v: string): any, toJSON: () => parserJSONData['all'] }
type TASeqs = { sequence: ( TASeqPart | TASeqPart[] )[], minArgs?: number }[]
type TAJSONSeqPart = string | parserJSONData['all']
type TAJSONSeqs = { sequence: ( TAJSONSeqPart | TAJSONSeqPart[] )[], minArgs: number }[]

// storage stuff
export type ccStorageSaveData = {
    prefix: string
    ccs: ccSaveJSONData[]
}

storage.instance.default.ev.save.subscribe((data) => {
    data.cc = {
        prefix: cc.prefix,
        ccs: Array.from(cc.getList(), v => v.toJSONSave())
    }
})

storage.instance.default.ev.load.subscribe((data) => {
    if (!data.cc) return
    cc.prefix = data.cc.prefix

    const newcclist = empty( Object.fromEntries( data.cc.ccs.map(v => [v.id, 0] as [string, 0]) ) )
    for (const k of ccList.keys())
        if (!(k in newcclist))
            try { cc.delete(k) }
            catch (e) { console.warn(`storage > events > onLoad (cc) > delete (${k}): ${ e instanceof Error ? `${e}\n${e.stack}` : e }`) }

    for (const ccs of data.cc.ccs)
        try { cc.fromJSONSave(ccs, true) }
        catch (e) { console.warn(`storage > events > onLoad (cc) > load (${ccs.id}): ${ e instanceof Error ? `${e}\n${e.stack}` : e }`) }
})
