import { BeforeChatEvent, BlockAreaSize, Entity, EntityQueryOptions, EntityQueryScoreOptions, Location, MinecraftBlockTypes, Player, world } from "mojang-minecraft"
import { dim } from "./mc.js"
import { empty } from "./misc.js"
import permission from "./permission.js"
import TypedValues, { typedValuesAll, typedValuesJSON } from "./typedvalues.js"

export default class cc {
    static get parser() { return parser }
    static get typedArgs() { return TypedArgs }

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
    static readonly delete = (id: string | cc) => ccList.delete(typeof id == 'string' ? id : id.id)

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
            if (!cmd) throw new Error(`Command not found: '${command}'`)
            if (cmd.minPermLvl && permission.getLevel(executer.getTags()) < cmd.minPermLvl) throw new Error(`You have no permission to use this command: '${command}'`)

            const argFull = message.substring(command.length + 1),
                typedArgs = cmd.typedArgs?.parse(args) ?? args

            const vars: ccVars = empty({
                executer,
                args,
                argFull,
                typedArgs,
                command,
                beforeChatEvd: evd
            })

            cmd.onTrigger(vars)
        } catch (e) {
            if (e instanceof Error) {
                if (
                    e instanceof ccError
                    || e.name == 'Error'
                    || e.name == 'SyntaxError'
                ) executer.sendMsg(`${e}`)
                else executer.sendMsg(`An error occured when executing a custom command: \n${e}\n${e.stack}`)
            }
            else executer.sendMsg(e)
        }
    }

    /**
     * Creates a custom command.
     * @param id Custom command identifier.
     */
    constructor(id: string) {
        this.id = id
        ccList.set(id, this)
    }

    /** Identfier. */
    readonly id: string
    /** Minimum permission level to execute the command. */
    minPermLvl: number = 0
    /** Typed arguments. */
    typedArgs: TypedArgs = new TypedArgs
    /** Command triggers. */
    triggers: RegExp | string[] = []
    /** Function to be executed on trigger. */
    onTrigger: (vars: ccVars) => void = () => {}
}

const ccList = new Map<string, cc>()

export type ccVars = {
    [k: string]: any
    /** Command keyword used to call the command. */
    readonly command: string
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
                enable: 1
            }),
            false: empty({
                off: 1,
                disable: 1
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
     * Parses a selector.
     * @param selector Selector to be parsed.
     */
    static readonly selector = (() => {
        const selectorValue: ( (data: string, pos?: number) => void | { data: any, rmSize: number } )[] = [
            function objectParse (data, pos = 0) {
                if (data[0] != '{') return
                const oPos = pos,
                    trimStart = () =>
                        data = data.replace(/^ +/, (v) => {
                            pos += v.length
                            return ''
                        }),
                    sub = (v: number) => {
                        data = data.substring(v)
                        pos += v
                    }

                // removes the first character which is basically '{'
                sub(1)

                const obj: any = empty()
                
                while (data) {
                    // check for closure
                    //@ts-expect-error
                    if (data[0] == '}') {
                        sub(1)
                        break
                    }

                    // get key
                    trimStart()
                    const k = data.match(/\w+/)?.[0]
                    if (typeof k == 'undefined') throw new SyntaxError(`Expecting key identifier at position ${pos}`)
                    sub(k.length)

                    // syntax '='
                    trimStart()
                    //@ts-expect-error
                    if (data[0] != '=') throw new SyntaxError(`Expecting '=' at position ${pos}`)
                    sub(1)

                    // get value
                    trimStart()
                    const { data: v, rmSize } = selectorGetValue(data, pos)
                    sub(rmSize)
                    obj[k] = v

                    // syntax ',' | '}'
                    trimStart()
                    if (data[0] != ',' && data[0] != '}') throw new SyntaxError(`Expecting ',' or '}' at position ${pos}`)

                    // check for closure
                    if (data[0] == '}') {
                        sub(1)
                        break
                    }

                    sub(1)
                }
                return { data: obj, rmSize: pos - oPos }
            },
            function arrayParse (data, pos = 0) {
                if (data[0] != '[') return
                const oPos = pos,
                    trimStart = () =>
                        data = data.replace(/^ +/, (v) => {
                            pos += v.length
                            return ''
                        }),
                    sub = (v: number) => {
                        data = data.substring(v)
                        pos += v
                    }

                // removes the first character which is basically '['
                sub(1)

                const arr = []
                
                while (data) {
                    // check for closure
                    //@ts-expect-error
                    if (data[0] == ']') {
                        sub(1)
                        break
                    }

                    // get value
                    trimStart()
                    const { data: v, rmSize } = selectorGetValue(data, pos)
                    sub(rmSize)
                    arr.push(v)

                    // syntax ',' | '}'
                    trimStart()
                    //@ts-expect-error
                    if (data[0] != ',' && data[0] != ']') throw new SyntaxError(`Expecting ',' or '}' at position ${pos}`)

                    // check for closure
                    if (data[0] == ']') {
                        sub(1)
                        break
                    }

                    sub(1)
                }
                return { data: arr, rmSize: pos - oPos }
            },
            function stringParse (data) {
                const v = data.match(/^((?<!\\)(\\\\)*['"]).*?(?<!\\)(\\\\)*\1/)?.[0]
                return v ? { data: JSON.parse(v), rmSize: v.length } : undefined
            },
            function numberRangeParse (data) {
                const m = data.match(/^!?(?<min>-?\d+(\.\d*)?)?\.\.(?<max>-?\d+(\.\d*)?)?/),
                    { min = '-Infinity', max = 'Infinity' } = m?.groups ?? {}
                return m ? { data: { exclude: m[0][0] == '!', min: +min, max: +max }, rmSize: m[0].length } : undefined
            },
            function numberParse (data) {
                const m = data.match(/^-?\d+(\.\d*)?/)?.[0]
                const v = +( m ?? '-' )
                return !isNaN(v) ? { data: v, rmSize: m.length } : undefined
            },
            function keyParse(data) {
                const v = data.match(/^[\w-:\u00a7]+/)?.[0]
                return v ? { data: v, rmSize: v.length } : undefined
            }
        ]
        const selectorGetValue = (data: string, pos = 0) => {
            for (const fn of selectorValue) {
                const v = fn(data)
                if (typeof v != 'undefined') return v
            }
            throw new SyntaxError(`Expecting a value at position ${pos}`)
        }

        const { array: TArray, object: TObject, value: TValue } = TypedValues

        const TNumber = new TValue('number'),
            TBoolean = new TValue('boolean'),
            TString = new TValue('string'),
            TArrayStr = new TArray(TString),
            TGamemode = new TValue(['s', 'a', 'c', 'sp', 'hc'], 'number'),
            GamemodeEnum = empty({
                s: 0,
                c: 1,
                a: 2,
                sp: 6,
                hc: 99
            }),
            selectorObjectType = new TObject()
                // position
                .define('x', TNumber, false)
                .define('y', TNumber, false)
                .define('z', TNumber, false)
                // volume
                .define('dx', TNumber, false)
                .define('dy', TNumber, false)
                .define('dz', TNumber, false)
                // distance
                .define('r', TNumber, false)
                .define('rm', TNumber, false)
                // level
                .define('l', TNumber, false)
                .define('lm', TNumber, false)
                // count
                .define('c', TNumber, false)
                // rotation
                .define('rx', TNumber, false)
                .define('rxm', TNumber, false)
                .define('ry', TNumber, false)
                .define('rym', TNumber, false)
                // name
                .define('name', TString, false)
                .define('ename', TArrayStr, false)
                // type
                .define('type', TString, false)
                .define('etype', TArrayStr, false)
                // tag
                .define('tag', TArrayStr, false)
                .define('etag', TArrayStr, false)
                // family
                .define('family', TArrayStr, false)
                .define('efamily', TArrayStr, false)
                // gamemode
                .define('m', TGamemode, false)
                .define('em', new TArray(TGamemode), false)
                // other
                .define(
                    'scores',
                    new TObject()
                        .allowUnusedProperties(true)
                        .setIndexType(
                            new TObject()
                                .define('min', TNumber)
                                .define('max', TNumber)
                                .define('exclude', TBoolean)
                        ),
                    false
                )

        const fn = (selector: string) => {
            type o = {
                [Symbol.iterator]: (source?: Entity) => Generator<Entity>
                [Symbol.toPrimitive]: () => string
                execute: (source: Entity) => Generator<Entity>
                subject: string | Entity
                queryOptions: EntityQueryOptions
                //queryOptionData: any
            }
            const o: o = {
                [Symbol.iterator]: function*(source) {
                    if (!(o.subject || o.queryOptions)) return
                    if (o.subject instanceof Entity) return yield o.subject;
                    const dimT = source ? source.dimension : dim.o
                    const {x, y, z} = Object.assign(source ? source.location : new Location(0, 0, 0), selectorLoc)
                    o.queryOptions.location = new Location(x, y, z)
                    switch (o.subject) {
                        case 's': {
                            for (const ent of dimT.getEntities(o.queryOptions))
                                if (ent == source) {
                                    yield source
                                    break
                                }
                        }; break
                        case 'p': {
                            const [_a, p1] = dimT.getPlayers(o.queryOptions)
                            yield p1
                        }; break
                        case 'r': {
                            const pList = [...dimT.getPlayers(o.queryOptions)]
                            yield pList[~~( pList.length * Math.random() )]
                        }; break
                        case 'a': {
                            for (const ent of dimT.getPlayers(o.queryOptions)) yield ent
                        }; break
                        case 'e': {
                            for (const ent of dimT.getEntities(o.queryOptions)) yield ent
                        }; break
                    }
                    o.queryOptions.location = selectorLoc2
                },
                [Symbol.toPrimitive]: () => selector,
                execute: (source: Entity) => o[Symbol.iterator](source),
                subject: null,
                queryOptions: null,
                //queryOptionData: null
            }

            const selectorData = selector.match(/^@(?<target>[spear])(\[(?<opts>.*)\])?$/)
            let selectorLoc: { x?: number, y?: number, z?: number } = {},
                selectorLoc2: Location

            if (selectorData) {
                let {target, opts = ''} = selectorData.groups; opts = `{${opts}}`
                const { data: optsData, rmSize } = Object.assign( { data: null, rmSize: opts.length }, selectorValue[0](opts) )

                if (rmSize != opts.length) throw new SyntaxError(`Unexpected end of group at position ${rmSize}`)
                if (!selectorObjectType.test(optsData)) throw new TypeError(`Selector options does not match type selector`)

                o.subject = target
                //o.queryOptionData = optsData
                const q = o.queryOptions = new EntityQueryOptions()

                if ('c' in optsData)       q[ Math.sign(optsData.c) >= 0 ? 'closest' : 'farthest' ] = Math.abs(optsData.c)
                if (   'x' in optsData
                    || 'y' in optsData
                    || 'z' in optsData
                ) {
                    const {x, y, z} = optsData
                    q.location = selectorLoc2 = new Location(x ?? 0, y ?? 0, z ?? 0)
                    selectorLoc = { x, y, z }
                }
                if (   'dx' in optsData
                    || 'dy' in optsData
                    || 'dz' in optsData
                )                          q.volume = new BlockAreaSize(optsData.dx ?? 0, optsData.dy ?? 0, optsData.dz ?? 0)
                if ('r' in optsData)       q.maxDistance = optsData.r
                if ('rm' in optsData)      q.minDistance = optsData.rm
                if ('l' in optsData)       q.maxLevel = optsData.l
                if ('lm' in optsData)      q.minLevel = optsData.lm
                if ('rx' in optsData)      q.maxVerticalRotation = optsData.rx
                if ('rxm' in optsData)     q.minVerticalRotation = optsData.rxm
                if ('ry' in optsData)      q.maxHorizontalRotation = optsData.ry
                if ('rym' in optsData)     q.minHorizontalRotation = optsData.rym
                if ('name' in optsData)    q.name = optsData.name
                if ('ename' in optsData)   q.excludeNames = optsData.ename
                if ('tag' in optsData)     q.tags = optsData.tag
                if ('etag' in optsData)    q.excludeTags = optsData.etag
                if ('type' in optsData)    q.type = optsData.type
                if ('etype' in optsData)   q.excludeTypes = optsData.etype
                if ('family' in optsData)  q.families = optsData.family
                if ('efamily' in optsData) q.excludeFamilies = optsData.efamily
                if ('m' in optsData)       q.gameMode = typeof optsData.m == 'string' ? GamemodeEnum[optsData.m] : optsData.m
                if ('em' in optsData)      q.gameMode = optsData.em.map(v => typeof v == 'string' ? GamemodeEnum[v] : v)
                if ('scores' in optsData)  q.scoreOptions = Object.entries(optsData.scores as List<any>).map(([k, v]) => {
                    const qs = new EntityQueryScoreOptions
                    qs.exclude = v.exclude
                    qs.objective = k
                    qs.minScore = Math.max(v.min, -(2**31))
                    qs.maxScore = Math.min(v.max, 2**31-1)
                    return qs
                })
            } else {
                if (selector[0] == '@') selector = selector.substring(1)
                if (selector[0] == '"' && selector[selector.length - 1] == '"') selector = selector.slice(1, -1)
                for (const plr of world.getPlayers())
                    if (plr.nickname == selector || plr.name == selector) {
                        o.subject = plr
                        break
                    }
            }
            return o
        }

        return Object.assign(fn, { toJSON: (): parserJSONData['selector'] => ({ type: 'selector' }) })
    })()

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
            : v.type == 'selector' ? parser.selector
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
        
        return () => this.#seqs.map( ({sequence, minArgs}) => ({ sequence: sequence.map(_a), minArgs: minArgs ?? sequence.length }) )
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
        throw new Error(`An error occured while parsing arguments. Errors are shown below: \n${ errMessage.map(v => ` : ${v}`).join('\n') }`)
    }
}

type TASeqPart = string | { (v: string): any, toJSON: () => parserJSONData['all'] }
type TASeqs = { sequence: ( TASeqPart | TASeqPart[] )[], minArgs?: number }[]
type TAJSONSeqPart = string | parserJSONData['all']
type TAJSONSeqs = { sequence: ( TAJSONSeqPart | TAJSONSeqPart[] )[], minArgs: number }[]