import cc from "../libcore/cc.js";
import { deepAssign, empty, parseRegex, viewObj } from "../libcore/misc.js";
import permission from "../libcore/permission.js";
import { TypedArray, TypedArraySpecific, TypedObject, TypedValue } from "../libcore/typedvalues.js";

// horrible type definition
const T = {
    string: new TypedValue('string'),
    number: new TypedValue('number'),
    boolean: new TypedValue('boolean'),
}
const T2 = {
    stringArr: new TypedArray(T.string)
}

// Custom command usage description type
const TdescUsage = new TypedArraySpecific([
    new TypedArray(
        new TypedValue(
            'string',
            new TypedObject()
                .define(
                    'type',
                    new TypedArray(
                        new TypedArraySpecific([
                            new TypedValue(['keyword', 'value']),
                            T.string
                        ])
                    )
                )
                .define('name', T.string, false)
                .define('required', T.boolean, false
            )
        )
    ),
    T.string,
    T.string
], 1)
TdescUsage.name = 'CCUsageDescriptionJSONData'
const TdescUsageArr = new TypedArray(TdescUsage)
TdescUsageArr.name = 'CCUsageDescriptionJSONDataArr'

// Custom command description type
const Tdesc = new TypedObject()
    .define('name', T.string, false)
    .define('description', T.string, false)
    .define('aliases', T2.stringArr, false)
    .define('usage', TdescUsageArr, false)
    .define('variables', new TypedObject().allowUnusedProperties(true).setIndexType(new TypedValue('any')), false)
    .define('format', T.string, false)
    .define(
        'formats',
        new TypedObject()
            .define(
                'aliases',
                new TypedObject()
                    .define('format', T.string, false)
                    .define('joinSeparator', T.string, false),
                false
            )
            .define(
                'type',
                new TypedObject()
                    .define(
                        'typeFormat',
                        new TypedObject()
                            .define('keyword', T.string, false)
                            .define('value', T.string, false)
                            .define('joinSeparator', T.string, false),
                        false
                    )
                    .define(
                        'format',
                        new TypedObject()
                            .define('typeOnly', T.string, false)
                            .define('withName', T.string, false)
                            .define('typeOnlyOptional', T.string, false)
                            .define('withNameOptional', T.string, false),
                        false
                    ),
                false
            )
            .define(
                'usage',
                new TypedObject()
                    .define(
                        'sequenceFormat',
                        new TypedObject()
                            .define('keyword', T.string, false)
                            .define('value', T.string, false)
                            .define('joinSeparator', T.string, false),
                        false
                    )
                    .define(
                        'format',
                        new TypedObject()
                            .define('usageOnly', T.string, false)
                            .define('withDescription', T.string, false)
                            .define('withExample', T.string, false)
                            .define('joinSeparator', T.string, false),
                        false
                    ),
                false
            ),
        false
    )
Tdesc.name = 'CCDescriptionJSONData'

// Custom command required tags JSON type.
const Trq = new TypedValue()
Trq.addType(
    new TypedArray(T.string),
    new TypedObject()
        .define('all', Trq, false)
        .define('any', Trq, false)
        .define('none', Trq, false)
)
Trq.name = 'CCRequiredTagsJSONData'

// Custom command typed array sequence value JSON type.
const Ttasv = new TypedValue(
    'string',
    new TypedObject().define('type', new TypedValue(['number', 'boolean', 'switch', 'selector', 'any']))
)
Ttasv.name = 'CCTypedArrSequenceJSONData'
const Ttasv2 = new TypedValue( new TypedArray(Ttasv), Ttasv)
Ttasv2.name = 'CCTypedArrSequenceJSONData'

// Custom command typed array JSON type.
const Tta = new TypedArray(
    new TypedObject()
        .define('sequence', Ttasv2 )
        .define('minArgs', T.number, false)
)
Tta.name = 'CCTypedArrJSONData'

// Custom command on trigger JSON type
const Tot = new TypedValue(
    new TypedObject()
        .define('type', new TypedValue(['command']))
        .define('commands', T2.stringArr)
        .define('ignoreError', T.boolean, false),
    new TypedObject()
        .define('type', new TypedValue(['eval']))
        .define('script', T.string)
)
Tot.name = 'CCOnTriggerJSONData'
const Tot2 = new TypedValue( new TypedArray(Tot), Tot )
Tot2.name = 'CCOnTriggerJSONData'

// Custom command JSON type
const Tcc = new TypedObject()
    //.define('id', T.string)
    .define('description', Tdesc, false)
    .define('minPermLvl', T.number, false)
    .define('isHidden', T.boolean, false)
    .define('isDisabled', T.boolean, false)
    .define('reqTags', Trq, false)
    .define('typedArgs', Tta, false)
    .define(
        'triggers',
        new TypedValue(
            new TypedObject()
                .define('type', new TypedValue(['regexp']))
                .define('value', T.string),
            new TypedObject()
                .define('type', new TypedValue(['array']))
                .define('value', T2.stringArr),
        )
    )
    .define('onTrigger', Tot2)
Tcc.name = 'CCJSONData'

// horrible typed arrays
const ccta = {
    description: new cc.typedArgs([
        { sequence: [ '-set_json', cc.parser.typedValues(Tdesc) ] },
        { sequence: [ '-assign_json', cc.parser.typedValues(Tdesc) ] },
        { sequence: [ '-set_name', cc.parser.any ] },
        { sequence: [ '-set_description', cc.parser.any ] },
        { sequence: [ '-set_format', cc.parser.any ] },
        { sequence: [ '-clear_cache' ] },
        { sequence: [ '-aliases', 'set_json', cc.parser.typedValues(T2.stringArr) ] },
        { sequence: [ '-aliases', 'add', cc.parser.any ] },
        { sequence: [ '-aliases', 'remove', cc.parser.any ] },
        { sequence: [ '-aliases', 'remove_at', cc.parser.number ] },
        { sequence: [ '-aliases', 'clear' ] },
        { sequence: [ '-usages', 'set_json', cc.parser.typedValues(TdescUsageArr) ] },
        { sequence: [ '-usages', 'add_json', cc.parser.typedValues(TdescUsage) ] },
        { sequence: [ '-usages', 'remove_at', cc.parser.number ] },
        { sequence: [ '-usages', 'clear' ] },
        { sequence: [ '-variables', 'set', cc.parser.any, 'boolean', cc.parser.boolean ] },
        { sequence: [ '-variables', 'set', cc.parser.any, 'number', cc.parser.number ] },
        { sequence: [ '-variables', 'set', cc.parser.any, 'json', cc.parser.typedValues(new TypedValue('any')) ] },
        { sequence: [ '-variables', 'set', cc.parser.any, 'string', cc.parser.any ] },
        { sequence: [ '-variables', 'delete', cc.parser.any ] },
        { sequence: [ '-variables', 'clear' ] },
        { sequence: [ '-exit' ] },
    ]),
    typedArgs: new cc.typedArgs([
        { sequence: [ '-set_json', cc.parser.typedValues(Tta) ] },
        { sequence: [ '-add_json', cc.parser.typedValues(Ttasv), ['auto', cc.parser.number] ] },
        { sequence: [ '-remove_at', cc.parser.number ] },
        { sequence: [ '-clear' ] },
        { sequence: [ '-exit' ] },
    ]),
    onTrigger: new cc.typedArgs([
        { sequence: [ '-set_json', cc.parser.typedValues(Tot2) ] },
        { sequence: [ '-add_json', cc.parser.typedValues(Tot) ] },
        { sequence: [ '-remove_at', cc.parser.number ] },
        { sequence: [ '-clear' ] },
        { sequence: [ '-exit' ] },
    ]),
    base: new cc.typedArgs([
        { sequence: [ '-description:' ] },
        { sequence: [ '-typed_args:' ] },
        { sequence: [ '-on_trigger:' ] },
        { sequence: [ '-assign_json', cc.parser.typedValues(Tcc) ] },
        { sequence: [ '-set_visibility', ['hide', 'hidden', 'show', 'visible', cc.parser.boolean] ] },
        { sequence: [ '-set_toggle', [cc.parser.boolean, cc.parser.switch] ] },
        { sequence: [ '-set_min_admin_level', cc.parser.number ] },
        { sequence: [ '-set_required_tags', cc.parser.typedValues(Trq) ] },
        { sequence: [ '-set_trigger', 'regex', cc.parser.regex ] },
        { sequence: [ '-set_trigger', 'array', cc.parser.typedValues(T2.stringArr) ] },
    ])
}

// horricble custom command creation
new cc('cc', {
    description: new cc.description({
        name: 'Custom Command',
        description: 'Manages custom command',
        aliases: ['custom-command', 'cc'],
        usage: []
    }),
    minPermLvl: 80,
    typedArgs: new cc.typedArgs([
        { sequence: [ 'create', cc.parser.any ] },
        { sequence: [ 'edit', cc.parser.any ] },
        { sequence: [ 'list' ] },
        { sequence: [ 'view', cc.parser.any ] },
        { sequence: [ 'delete', cc.parser.any ] },
    ]),
    triggers: /^(c(ustom-?)?c(md|ommand)?)$/i,
    onTrigger: ({log, typedArgs: tArgs, executer}) => {
        let ccd: cc
        switch (tArgs[0]) {
            case 'create': {
                if (cc.exist(tArgs[1])) throw new cc.error(`Custom command with ID '${tArgs[1]}' already exists.`)
                ccd = new cc(tArgs[1], {
                    description: new cc.description,
                    typedArgs: new cc.typedArgs,
                    onTrigger: [],
                })
                log(`Created custom command with ID '${tArgs[1]}'.`)

                tArgs.splice(0, 2)
                break
            }
            case 'edit': {
                ccd = cc.get(tArgs[1])
                if (!ccd) throw new cc.error(`Custom command with ID '${tArgs[1]}' not found.`, 'ReferenceError')

                tArgs.splice(0, 2)
                break
            }
            case 'list': {
                return log([
                    ` `,
                    `Custom command list:`,
                    ...[...cc.getList()].sort((a, b) => a.id.localeCompare(b.id)).map(v => ` §8:§r ${v.description?.name ?? v.id} §7(${v.id})§r §8-§r §7${v.description?.description ?? '(No description set)'}`),
                    ` `,
                ])
            }
            case 'view': {
                ccd = cc.get(tArgs[1])
                if (!ccd) throw new cc.error(`Custom command with ID '${tArgs[1]}' not found.`, 'ReferenceError')
                return log(ccd)
            }
            case 'delete': {
                if (!cc.delete(tArgs[1])) throw new cc.error(`Custom command with ID '${tArgs[1]}' not found.`, 'ReferenceError')
                return log(`Deleted custom command with ID '${tArgs[1]}'.`)
            }
        }
        log(`Editing custom command: '${ccd.id}'`)
        main:
        while (tArgs.length) {
            const eArg = ccta.base.parse(tArgs)
            switch (eArg[0]) {
                case '-assign_json': {
                    const o = eArg[1]
                    if ('description' in o) o.description = cc.description.fromJSON(o.description)
                    if ('typedArgs' in o) o.typedArgs = cc.typedArgs.fromJSON(o.typedArgs)
                    if ('triggers' in o) o.triggers = o.triggers.type == 'regexp' ? parseRegex(o.triggers.value) : o.triggers.value
                    Object.assign(ccd, o)
                    log(`Assigned JSON data to custom command.`)
                }; break
                case '-set_required_tags': {
                    ccd.reqTags = eArg[1]
                    log(`Required tags has been set to ${JSON.stringify(eArg[1], null, ' ').replace(/\n ?/g, ' ')}.`)
                }; break
                case '-set_min_admin_level': {
                    ccd.minPermLvl = eArg[1]
                    log(`Minimum permission level has been set to §a${eArg[1]}§r.`)
                }; break
                case '-set_toggle': {
                    ccd.isDisabled = !eArg[1]
                    log(`Custom command has been ${!eArg[1] ? 'disabled' : 'enabled'}.`)
                }; break
                case '-set_visibility': {
                    const v = eArg[1]
                    ccd.isHidden = typeof v == 'boolean' ? !v : v == 'hide' || v == 'hidden' ? true : false
                    log(`Custom command is now ${ccd.isHidden ? 'hidden' : 'visible'}.`)
                }; break
                case '-set_trigger': {
                    if (ccd.isDefault) throw new Error(`Cannot edit default command`)
                    ccd.triggers = eArg[2]
                    log(`Custom command trigger has been set to ${eArg[2] instanceof RegExp ? `§c${eArg[2]}§r` : eArg[2].map(v => `§a${v}§r`).join(', ')}.`)
                    tArgs.splice(0, 1)
                }; break
                case '-on_trigger:': {
                    if (ccd.isDefault) throw new Error(`Cannot edit default command`)
                    tArgs.splice(0, 1)
                    let ot = ccd.onTrigger
                    on_trigger:
                    while (tArgs.length) {
                        const eArg = ccta.onTrigger.parse(tArgs)
                        switch (eArg[0]) {
                            case '-set_json': {
                                ot = ccd.onTrigger = eArg[1]
                                log(`On trigger: Custom command on trigger data has been set.`)
                            }; break
                            case '-add_json': {
                                if (!Array.isArray(ot)) throw new cc.error(`On trigger: Not an array`, 'TypeError')
                                if (eArg[1].type == 'eval' && permission.getLevel(executer.getTags()) < 100) throw new Error(`On trigger 'eval' type can only be used by someone who has permission level equal to or higher than 100`)
                                ot.push(eArg[1])
                                log(`On trigger: Added on trigger data (type: ${eArg[1].type}).`)
                            }; break
                            case '-remove_at': {
                                if (!Array.isArray(ot)) throw new cc.error(`On trigger: Not an array`, 'TypeError')
                                const t = ot.splice(eArg[1] - 1, 1)[0]
                                if (!t) log(`On trigger: Nothing to remove on position ${eArg[1]}.`)
                                else log(`On trigger: Removed on trigger data on position ${eArg[1]} (type: ${t.type}).`)
                            }; break
                            case '-clear': {
                                ot = ccd.onTrigger = []
                                log(`On trigger: Custom command on trigger has been cleared.`)
                                tArgs.splice(0, 1)
                                continue
                            }
                            case '-exit': {
                                tArgs.splice(0, 1)
                                continue main
                            }
                        }
                        tArgs.splice(0, 2)
                    }
                    continue
                }
                case '-typed_args:': {
                    if (ccd.isDefault) throw new Error(`Cannot edit default command`)
                    tArgs.splice(0, 1)
                    let ta = ccd.typedArgs ??= new cc.typedArgs
                    typed_args:
                    while(tArgs.length) {
                        const eArg = ccta.typedArgs.parse(tArgs)
                        switch (eArg[0]) {
                            case '-set_json': {
                                ta = ccd.typedArgs = cc.typedArgs.fromJSON(eArg[1])
                                log(`Typed args: Custom command typed args data has been set.`)
                            }; break
                            case '-add_json': {
                                const {sequence, minArgs} = cc.typedArgs.fromJSON([{ sequence: eArg[1], minArgs: eArg[2] == 'auto' ? eArg[1].length : eArg[2] }]).sequence[0]
                                ta.addSequence(sequence, minArgs)
                                log(`Typed args: Added typed args data.`)
                            }; break
                            case '-remove_at': {
                                const t = ta.sequence.splice(eArg[1] - 1, 1)[0]
                                if (!t) log(`Typed args: Nothing to remove on position ${eArg[1]}.`)
                                else log(`Typed args: Removed typed args data on position ${eArg[1]}.`)
                            }; break
                            case '-clear': {
                                ta = ccd.typedArgs = new cc.typedArgs
                                log(`Typed args: Custom command typed args data has been cleared.`)
                                tArgs.splice(0, 1)
                                continue
                            }
                            case '-exit': {
                                tArgs.splice(0, 1)
                                continue main
                            }
                        }
                        tArgs.splice(0, 2)
                    }
                    continue
                }
                case '-description:': {
                    if (ccd.isDefault) throw new Error(`Cannot edit default command`)
                    tArgs.splice(0, 1)

                    let desc = ccd.description ??= new cc.description
                    delete desc.cache

                    description:
                    while(tArgs.length) {
                        const eArg = ccta.description.parse(tArgs)
                        description_sw:
                        switch (eArg[0]) {
                            case '-set_json': {
                                desc = ccd.description = new cc.description(eArg[1])
                                log(`Descripiton: Sets JSON data to custom command description.`)
                            }; break
                            case '-assign_json': {
                                deepAssign(desc, eArg[1])
                                log(`Descripiton: Assigned JSON data to custom command description.`)
                            }; break
                            case '-set_name': {
                                desc.name = eArg[1]
                                log(`Descripiton: Custom command name has been set to "${eArg[1]}".`)
                            }; break
                            case '-set_description': {
                                desc.description = eArg[1]
                                log(`Descripiton: Custom command descriptionhas been set to "${eArg[1]}".`)
                            }; break
                            case '-set_format': {
                                desc.format = JSON.parse(`"${eArg[1].replace(/\\(?!n|r|u[0-9a-fA-F]{4})/g, '\\\\')}"`)
                                log(`Descripiton: Custom command description format has been set to ${viewObj(eArg[1])}.`)
                            }; break
                            case '-aliases': {
                                switch (eArg[1]) {
                                    case 'set_json': {
                                        desc.aliases = eArg[2]
                                        log(`Descripiton: Custom command aliases has been set to ${eArg[2].map(v => `§a${v}§r`).join(', ')}.`)
                                    }; break
                                    case 'add': {
                                        desc.aliases.push(eArg[2])
                                        log(`Descripiton: Added custom command alias "${eArg[2]}".`)
                                    }; break
                                    case 'remove': {
                                        desc.aliases = desc.aliases.filter(v => v != eArg[2])
                                        log(`Descripiton: Removed custom command alias "${eArg[2]}".`)
                                    }; break
                                    case 'remove_at': {
                                        desc.aliases.splice(eArg[2] - 1, 1)
                                        log(`Descripiton: Removed custom command alias at position §a${eArg[2]}§r.`)
                                    }; break
                                    case 'clear': {
                                        desc.aliases = []
                                        log(`Descripiton: Cleared custom command aliasas.`)
                                        break description_sw
                                    }
                                }
                                tArgs.splice(0, 1)
                            }; break
                            case '-usages': {
                                switch (eArg[1]) {
                                    case 'set_json': {
                                        desc.usage = eArg[2]
                                        log(`Descripiton: Custom command usages has been set.`)
                                    }; break
                                    case 'add_json': {
                                        desc.usage.push(eArg[2])
                                        log(`Descripiton: Added custom command usage.`)
                                    }; break
                                    case 'remove_at': {
                                        desc.usage.splice(eArg[2] - 1, 1)
                                        log(`Descripiton: Removed custom command usage at position §a${eArg[2]}§r.`)
                                    }; break
                                    case 'clear': {
                                        desc.usage = []
                                        log(`Descripiton: Cleared custom command usages.`)
                                        break description_sw
                                    }
                                }
                                tArgs.splice(0, 1)
                            }; break
                            case '-variables': {
                                switch (eArg[1]) {
                                    case 'set': {
                                        desc.variables[eArg[2]] = eArg[4]
                                        log(`Descripiton: Custom command variable "${eArg[2]}" has been set to ${JSON.stringify(eArg[4])} (type ${eArg[3]}).`)
                                        tArgs.splice(0, 3)
                                    }; break
                                    case 'delete': {
                                        delete desc.variables[eArg[2]]
                                        log(`Descripiton: Custom command variable "${eArg[2]}" has been deleted.`)
                                        tArgs.splice(0, 1)
                                    }; break
                                    case 'clear': {
                                        desc.variables = empty()
                                        log(`Descripiton: Cleared custom command variables.`)
                                    }; break
                                }
                            }; break
                            case '-exit': {
                                tArgs.splice(0, 1)
                                continue main
                            }
                        }
                        tArgs.splice(0, 2)
                    }
                }
            }
            tArgs.splice(0, 2)
        }
    },
    isDefault: true
})
