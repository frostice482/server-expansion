/**
 * Creates a new empty object.
 * @param obj Initial object.
 */
export const empty = <T extends {}> (obj: T = null): T => Object.defineProperties(Object.create(null), Object.getOwnPropertyDescriptors(obj ?? {}))

export const viewObj = (() => {
    const AsyncFunction = (async()=>{}).constructor,
        GeneratorFunction = (function*(){}).constructor,
        AsyncGeneratorFunction = (async function*(){}).constructor,

        GeneratorObjCst = (function*(){})().constructor,
        AsyncGeneratorObjCst = (async function*(){})().constructor,

        ArrayIteratorObj = Object.getPrototypeOf(new Set().values()),
        SetIteratorObj = Object.getPrototypeOf(new Set().values()),
        MapIteratorObj = Object.getPrototypeOf(new Map().values())
    
    Object.defineProperty(GeneratorObjCst, 'name', { value: 'Generator' })
    Object.defineProperty(AsyncGeneratorObjCst, 'name', { value: 'AsyncGenerator' })
    
    const excludeProtoKeys: {
        oc: any[]
        op: any[]
        o: ((o: any) => boolean)[]
    } = {
        oc: [
            GeneratorObjCst,
            AsyncGeneratorObjCst,
            Promise
        ],
        op: [
            ArrayIteratorObj,
            SetIteratorObj,
            MapIteratorObj
        ],
        o: [
            (o) => o instanceof Error
        ]
    }

    const strFormatKeys: List<0> = empty({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, a: 0, b: 0, c: 0, d: 0, e: 0, f: 0, g: 0 }),
        strEscDict = empty({
            '\t': 'TAB',
            '\v': 'VTAB',
            '\r': 'CR',
            '\n': 'LF',
            '\f': 'FF',
            '\0': 'NUL',
            '\ufffe': 'U+FFFE',
            '\uffff': 'U+FFFF',
        })
    
    const fnHead = (o: Function, oc: Function): string => {
        const fName = o.name || '<anonymous>',
            //@ts-ignore
            fLoc = o.fileName ? `${o.fileName}:${o.lineNumber}` : '<native>',

            notClass = Object.getOwnPropertyDescriptor(o, 'prototype')?.writable ?? true,
            asyncText = oc == AsyncFunction || oc == AsyncGeneratorFunction ? 'Async' : '',
            generatorText = oc == GeneratorFunction || oc == AsyncGeneratorFunction ? 'Generator' : '',

            prototypeOf = Object.getPrototypeOf(o),
            extendsClass = prototypeOf instanceof Function
        return notClass
            ? `§e[${asyncText}${generatorText}Function: ${fName} (${fLoc})]§r`
            : `§b[Class: ${fName}${ extendsClass ? ` (extends: ${ fnHead(o, oc).replace(/\u00a7./g, '') })` : '' } (${fLoc})]§r`
    }
    
    const getKeys = (o: any, op = Object.getPrototypeOf(o), getPrototypeKeys = true, excludeKeys: string[] = []) => {
        let keys = Reflect.ownKeys(o)
        if (getPrototypeKeys) keys = keys.concat(Reflect.ownKeys(op ?? {}))

        let keysSet = new Set(keys)
        for (const ek of excludeKeys) keysSet.delete(ek)

        return Array.from(keysSet, k => {
            const descriptor = Object.getOwnPropertyDescriptor(o, k) ?? Object.getOwnPropertyDescriptor(op, k),
                isGet = !!descriptor.get,
                isSet = !!descriptor.set
            return {
                key: k,
                isGet,
                isSet
            }
        })
    }

    const formatKey = (k: string | symbol, isGet = false, isSet = false) => `${ typeof k == 'symbol' ? '§a' : k[0] == '_' ? '§7' : '' }${String(k)}${ isGet && isSet ? ' §b[Get/Set]§r ' : isGet ? ' §b[Get]§r ' : isSet ? ' §b[Set]§r ' : '' }§r`
 
    const exec = (o: any, stack: any[], tab: string, tabLevel: number, tabSeparator: string) => {
        if (stack.includes(o)) return `§b[Circular]§r`
        if (o == null) return `§8${o}§r`

        const nStack = stack.concat([o]),
            cTab = tab.repeat(tabLevel),
            nTab = tab.repeat(tabLevel + 1),
            nTabLvl = tabLevel + 1,
            execNext = (k: string | number | symbol, obj = o[k]) => {
                try { return exec(obj, nStack, tab, nTabLvl, tabSeparator) }
                catch (e) { return `§c[Error]§r` }
            }
        
        const op = Object.getPrototypeOf(o),
            oc = op?.constructor

        switch (oc) {
            case String:
                return `§7"§r${ o.replace( /[\t\r\n\v\f\0\ufffe\uffff]|§./g, ([v, a]: string) => v == '§' ? a in strFormatKeys ? `§a[S${a}]§r` : `§7[S${a == '§' ? 'S' : a}]§r` : `§d[${strEscDict[v]}]§r` ) }§7"§r`

            case Number:
            case Boolean:
                return `§a${o}§r`

            case RegExp:
                return `§c${o}§r`

            case Symbol:
                return `§b${o}§r`

            case Function:
            case AsyncFunction:
            case GeneratorFunction:
            case AsyncGeneratorFunction: {
                const out = [fnHead(o, oc)]

                const keys = getKeys(o, op, false, ['length', 'name', 'prototype', 'arguments', 'caller'])
                if (keys.length) {
                    out[0] += ' {'
                    for (const { key, isGet, isSet } of keys ) out.push(`${nTab}${tabSeparator}${formatKey(key, isGet, isSet)}: ${execNext(key)}`)
                    out.push(`${cTab}${tabSeparator}}`)
                }

                return out.join('\n')
            }

            case Array: {
                if (!o.length) return `[] §7Array<${o.length}>§r`

                // one hell of a mess
                const out = [`[ §7Array<${o.length}>§r`]
                let exclude: List<0, string> = empty() //!
                for (const k in o) {
                    exclude[k] = 0 //!
                    out.push(`${nTab}${tabSeparator}${formatKey(k)}: ${execNext(k)}`)
                }
                for (let i = 0; i < o.length; i++) if (i in o && !(i in exclude)) out.push(`${nTab}${tabSeparator}${i} §7[F]§r : ${execNext(i)}`) //!
                out.push(`${cTab}${tabSeparator}]`)

                return out.join('\n')
            }

            case Set: {
                if (!o.size) return `[] §7Set<${o.size}>§r`

                const out = [`[ §7Set<${o.size}>§r`]
                for (const v of o) out.push(`${nTab}${tabSeparator}§l=>§r ${execNext(null, v)}`)
                out.push(`${cTab}${tabSeparator}]`)

                return out.join('\n')
            }

            case Map: {
                if (!o.size) return `{} §7Map<${o.size}>§r`

                const out = [`{ §7Map<${o.size}>§r`]
                for (const [k, v] of o) out.push(`${nTab}${tabSeparator}§l=>§r ${execNext(null, k)} -> ${execNext(null, v)}`)
                out.push(`${cTab}${tabSeparator}}`)

                return out.join('\n')
            }

            default: {
                let name = oc == null ? `[${o[Symbol.toStringTag] ?? 'Object'}: null prototype]`
                        : oc != Object ? oc.name
                        : Symbol.toStringTag in o ? `Object [${o[Symbol.toStringTag]}]`
                        : '',
                    getPrototypeKeys = !( oc == Object || excludeProtoKeys.o.some(fn => fn(o)) || excludeProtoKeys.oc.some(v => oc == v) || excludeProtoKeys.op.some(v => op == v) ),
                    excludeKeys = oc != Object ? ['constructor']
                        : []
                
                const keys = getKeys(o, op, getPrototypeKeys, excludeKeys)
                if (!keys.length) return `{} §7${name}§r`

                const out = [`{ §7${name}§r`]
                for (const { key, isGet, isSet } of keys ) out.push(`${nTab}${tabSeparator}${formatKey(key, isGet, isSet)}: ${execNext(key)}`)
                out.push(`${cTab}${tabSeparator}}`)

                return out.join('\n')
            }
        }
    }

    /**
     * Creates a readable object data.
     * @param o Object
     * @param tab Tab
     * @param tabSeparator Separator between tab and property
     */
    return (o: any, tab = ' §7:§r ', tabSeparator = ' ') => exec(o, [], tab, 0, tabSeparator)
})()

/**
 * Generates a string of random characters in the charset.
 * @param length String length.
 * @param charset Character set.
 */
export const randomstr = (length: number, charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz') => {
    let o = ''
    for (let i = 0; i < length; i++) o = o.concat( charset[ Math.floor( Math.random() * charset.length ) ] )
    return o
}

/**
 * Deep assigns an object. Acts like an `Object.assign`, but deeply assigns an object. Ignores symbol properties.
 * @param to Object.
 * @param source Source.
 */
export const deepAssign = <A, B>(to: any, source: any): A & B => {
    for (const k in source) {
        const sv = source[k],
            tv = to[k] ??= Array.isArray(sv) ? [] : {}
        if (typeof sv == 'object' && typeof tv == 'object') deepAssign(tv, sv)
        else to[k] = sv
    }
    return to
}

/**
 * Converts a number to readable time.
 * @param time Time.
 * @param isMillisecond Determines if time is in millisecond or not.
 */
export const convertToReadableTime = (time: number, isMillisecond = true) => {
    if (time == Infinity) return 'eternity'
    if (isMillisecond) time = time / 1000
    const x: [string, number][] = [
        [ 'week', ~~( time / 604800) ],
        [ 'day', ~~( time / 86400 % 30 ) ],
        [ 'hour', ~~( time / 3600 % 24 ) ],
        [ 'minute', ~~( time / 60 % 60 ) ],
        [ 'second', ~~( time % 60 ) ],
    ]
    for (const [i, [l, v]] of x.entries())
        if (v != 0 || i == x.length - 2) {
            x.splice(0, i + 1)
            break
        }
    return x.map(([l, v]) => `${v} ${l}${v == 1 ? '' : 's'}`).join(' ') || '0 seconds'
}

/**
 * Renames a function.
 * @param fn Function to be renamed.
 * @param name New function name.
 */
export const renameFn = <fn extends Function>(fn: fn, name: string | ((fName: string) => string)) =>
    Object.defineProperty(fn, 'name', { value: typeof name == 'function' ? name(fn.name) : name })
