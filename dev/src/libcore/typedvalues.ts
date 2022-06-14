import { empty } from "./misc.js"

type valueTypes = {
    valueType: 'string' | 'number' | 'boolean' | 'any'
    specifics: ( string | number | boolean )[]
    objects: ( TypedValue | TypedObject | TypedArray | TypedArraySpecific )
    all: valueTypes[Exclude<keyof valueTypes, 'all'>]
}
type allTypes = TypedValue | TypedObject | TypedArray | TypedArraySpecific
export { allTypes as typedValuesAll }

export default class TypedValues {
    static get value() { return TypedValue }
    static get object() { return TypedObject }
    static get array() { return TypedArray }
    static get arraySpecific() { return TypedArraySpecific }

    /**
     * Creates a typed value, typed object, or typed array from JSON data.
     * @param jsonData JSON data.
     */
    static readonly fromJSON = (jsonData: JSONData['all'][]) => refId[jsonData[0].type].fromJSON(jsonData)

    protected constructor() { throw new TypeError('Class is not constructable') }
}

export class TypedValue {
    /**
     * Creates a typed value from JSON data.
     * @param jsonData JSON data.
     * @param index Index to be parsed.
     * @param referenceStack Reference stack.
     */
    static readonly fromJSON = (jsonData: JSONData['all'][], referenceStack: List<allTypes, number> = empty(), index = 0) => {
        const data = jsonData[index]
        if (data?.type != 'value') throw new TypeError(`Type mismatched: expecting 'value', got '${data.type}'`)

        const n = new this()
        referenceStack[index] = n
        n.name = data.name

        const d = n.#data
        const { data: { type: vType, objects: vObj = [], specifics: vSpec = {} } } = data
        for (const k of vType) d.type[k] = 1
        for (const i of vObj) {
            const objData = jsonData[i]
            d.objects.add( referenceStack[i] ??= refId[objData.type].fromJSON(jsonData, referenceStack, i) )
        };
        for (const k in vSpec)
            for (const v of vSpec[k]) d.specifics[v] = 1
        
        return n
    }

    /**
     * Creates a typed value.
     * @param type Value types.
     */
    constructor(...type: valueTypes['all'][]) {
        this.addType(...type)
    }

    #data: {
        type: List<1, valueTypes['valueType']>
        specifics: {
            string: List<1, string>
            number: List<1, number>
            boolean: List<1, 'true' | 'false'>
        }
        objects: Set<TypedObject | TypedArray | TypedArraySpecific | TypedValue>
    } = {
        type: empty(),
        specifics: {
            string: empty(),
            number: empty(),
            boolean: empty()
        },
        objects: new Set
    }

    /** Type name. */
    name = ''

    /**
     * Adds a type to value type.
     * @param type Type to be added.
     */
    readonly addType = (...type: valueTypes['all'][]) => {
        for (const t of type)
            if (typeof t == 'string') this.#data.type[t] = 1
            else if (Array.isArray(t)) for (const ts of t) this.#data.specifics[typeof ts][ts] = 1
            else this.#data.objects.add(t)
        return this
    }

    /**
     * Removes a type from value type.
     * @param type Type to be removed.
     */
    readonly removeType = (...type: valueTypes['all'][]) => {
        for (const t of type)
            if (typeof t == 'string') delete this.#data.type[t]
            else if (Array.isArray(t)) for (const ts of t) delete this.#data.specifics[typeof ts][ts]
            else this.#data.objects.delete(t)
        return this
    }

    /**
     * Tests if a value matches the type.
     * @param o Value to be tested.
     */
    readonly test = (o: any) => {
        if ('any' in this.#data.type) return true
        const vt = typeof o
        if ( vt == 'string' || vt == 'number' || vt == 'boolean' ) return vt in this.#data.type || o in this.#data.specifics[vt]
        else for (const tobj of this.#data.objects) if (tobj.test(o)) return true
        return false
    }

    /**
     * Converts to JSON format.
     */
    readonly toJSON = () => toJSON(this)

    /**
     * Gets reference list.
     * @param stack Reference stack.
     */
    readonly getReferenceList = (stack: allTypes[] = []): allTypes[] => {
        if (stack.includes(this)) return stack
        stack.push(this)
        for (const tobj of this.#data.objects) tobj.getReferenceList(stack)
        return stack
    }

    /**
     * Converts to JSON.
     * @param refData Reference datas.
     */
    readonly JSONConvertion = (refData: Map<allTypes, number>): JSONData['TypedValue'] => {
        const { type, specifics, objects } = this.#data
        return {
            type: 'value',
            name: this.name,
            data: {
                type: Object.keys(type) as any,
                specifics: {
                    string: Object.keys(specifics.string),
                    number: Object.keys(specifics.number).map(Number),
                    boolean: Object.keys(specifics.boolean) as any,
                },
                objects: Array.from(objects, (v) => refData.get(v))
            }
        }
    }
}

export class TypedObject {
    /**
     * Creates a typed object from JSON data.
     * @param jsonData JSON data.
     * @param index Index to be parsed.
     * @param referenceStack Reference stack.
     */
    static readonly fromJSON = (jsonData: JSONData['all'][], referenceStack: List<allTypes, number> = empty(), index = 0) => {
        const data = jsonData[index]
        if (data?.type != 'object') throw new TypeError(`Type mismatched: expecting 'object', got '${data.type}'`)

        const n = new this()
        referenceStack[index] = n
        n.name = data.name
        n.#data = new Map( data.data.objData.map( ([k, [i, r] ]) => [ k, [ referenceStack[i] ??= refId[jsonData[i].type].fromJSON(jsonData, referenceStack, i), r ] ] as [string, [allTypes, boolean]] ) )
        n.#allowUnusedProperties = data.data.allowUnusedProperties
        n.#indexType = referenceStack[data.data.indexType] ??= refId[jsonData[data.data.indexType].type].fromJSON(jsonData, referenceStack, data.data.indexType)

        return n
    }

    /**
     * Creates a typed array.
     */
    constructor() {}

    #data = new Map<string, [type: allTypes, required: boolean]>()

    /** Type name. */
    name = ''
    /** Allows unused properties. */
    #allowUnusedProperties = false
    /** Index type. Ignored if `allowUnusedProperties` is set to `false` or value is set to `null`. */
    #indexType: allTypes = null

    /**
     * Allows extra / unused properties.
     * @param v Type.
     */
    readonly allowUnusedProperties = (v: boolean) => {
        this.#allowUnusedProperties = v
        return this
    }

    /**
     * Sets index type.
     * @param v Type.
     */
     readonly setIndexType = (v: allTypes) => {
        this.#indexType = v
        return this
    }

    /**
     * Defines a property.
     * @param key Property key.
     * @param type Value type.
     * @param required Determines if property is required or not.
     */
    readonly define = (key: string, type: allTypes, required = true) => ( this.#data.set(key, [ type, required ]), this )

    /**
     * Deletes a property.
     * @param key Property key.
     */
    readonly 'delete' = (key: string) => ( this.#data.delete(key), this )

    /**
     * Tests if an array matches the type.
     * @param o Array to be tested.
     */
    readonly test = (o: any) => {
        if (typeof o != 'object' || Array.isArray(o)) return false
        const keys = new Map(Object.entries(o))
        for (const [k, [t, r]] of this.#data) {
            if (!(k in o)) {
                if (r) return false
                else continue
            }
            if (!t.test(o[k])) return false
            keys.delete(k)
        }
        if (keys.size) {
            if (!this.#allowUnusedProperties) return false
            if (!this.#indexType?.test) return true
            for (const v of keys.values())
                if (!this.#indexType.test(v)) return false
        }
        return true
    }

    /**
     * Converts to JSON format.
     */
    readonly toJSON = () => toJSON(this)
    
    /**
     * Gets reference list.
     * @param stack Reference stack.
     */
    readonly getReferenceList = (stack: allTypes[] = []): allTypes[] => {
        if (stack.includes(this)) return stack
        stack.push(this)
        for (const [t] of this.#data.values()) t.getReferenceList(stack)
        this.#indexType?.getReferenceList(stack)
        return stack
    }
    
    /**
     * Converts to JSON.
     * @param refData Reference datas.
     */
    readonly JSONConvertion = (refData: Map<allTypes, number>): JSONData['TypedObject'] => ({
        type: 'object',
        name: this.name,
        data: {
            allowUnusedProperties: this.#allowUnusedProperties,
            indexType: refData.get(this.#indexType),
            objData: Array.from(this.#data, ([ k, [o, r] ]) => [ k, [ refData.get(o), r ] ] )
        }
    })
}

export class TypedArray {
    /**
     * Creates a typed array from JSON data.
     * @param jsonData JSON data.
     * @param index Index to be parsed.
     * @param referenceStack Reference stack.
     */
    static readonly fromJSON = (jsonData: JSONData['all'][], referenceStack: List<allTypes, number> = empty(), index = 0) => {
        const data = jsonData[index]
        if (data?.type != 'array') throw new TypeError(`Type mismatched: expecting 'array', got '${data.type}'`)

        const n = new this()
        referenceStack[index] = n
        n.name = data.name
        n.type = referenceStack[data.data] ??= refId[jsonData[data.data].type].fromJSON(jsonData, referenceStack, data.data)

        return n
    }

    /**
     * Creates a typed array.
     * @param type Value types.
     */
    constructor(type?: allTypes) {
        if (type) this.type = type
    }

    /** Type data. */
    type: allTypes = null

    /** Type name. */
    name = ''

    /**
     * Tests if an array matches the type.
     * @param o Array to be tested.
     */
    readonly test = (o: any[] = []) => Array.isArray(o) && o.every( this.type.test ?? (() => false) )

    /**
     * Converts to JSON format.
     */
    readonly toJSON = () => toJSON(this)

    /**
     * Gets reference list.
     * @param stack Reference stack.
     */
    readonly getReferenceList = (stack: allTypes[] = []): allTypes[] => {
        if (stack.includes(this)) return stack
        stack.push(this)
        return this.type.getReferenceList(stack)
    }

    /**
     * Converts to JSON.
     * @param refData Reference datas.
     */
    readonly JSONConvertion = (refData: Map<allTypes, number>): JSONData['TypedArray'] => ({
        type: 'array',
        name: this.name,
        data: refData.get(this.type)
    })
}

export class TypedArraySpecific {
    /**
     * Creates a specific typed array from JSON data.
     * @param jsonData JSON data.
     * @param index Index to be parsed.
     * @param referenceStack Reference stack.
     */
    static readonly fromJSON = (jsonData: JSONData['all'][], referenceStack: List<allTypes, number> = empty(), index = 0) => {
        const data = jsonData[index]
        if (data?.type != 'arraySpecific') throw new TypeError(`Type mismatched: expecting 'arraySpecific', got '${data.type}'`)

        const n = new this()
        referenceStack[index] = n
        n.name = data.name
        n.minLength = data.minLength
        n.allowOverlength = data.allowOverlength
        n.type = data.data.map(v => referenceStack[v] ??= refId[jsonData[v].type].fromJSON(jsonData, referenceStack, v))

        return n
    }

    /**
     * Creates a specific typed array.
     * @param type Value types.
     * @param minLength Minimum array length.
     */
    constructor(type: allTypes[] = [], minLength: number = type.length) {
        this.type = type
        this.minLength = minLength
    }

    /** Type data. */
    type: allTypes[]
    /** Minimum length. */
    minLength: number
    /** Allows array length goes beyond array type length. */
    allowOverlength = false

    /** Type name. */
    name = ''

    /**
     * Tests if an array matches the type.
     * @param o Array to be tested.
     */
    readonly test = (o: any[] = []) => (
        Array.isArray(o)
        && ( this.allowOverlength ? true : o.length <= this.type.length )
        && this.type.every((type, i) => ( this.minLength < i && !(i in o) ) || type.test(o) )
    )

    /**
     * Converts to JSON format.
     */
    readonly toJSON = () => toJSON(this)

    /**
     * Gets reference list.
     * @param stack Reference stack.
     */
    readonly getReferenceList = (stack: allTypes[] = []): allTypes[] => {
        if (stack.includes(this)) return stack
        stack.push(this)
        this.type.map(type => type.getReferenceList(stack))
        return stack
    }

    /**
     * Converts to JSON.
     * @param refData Reference datas.
     */
    readonly JSONConvertion = (refData: Map<allTypes, number>): JSONData['TypedArraySpecific'] => ({
        type: 'arraySpecific',
        name: this.name,
        minLength: this.minLength,
        allowOverlength: this.allowOverlength,
        data: this.type.map(v => refData.get(v))
    })
}

const refId = {
    value: TypedValue,
    object: TypedObject,
    array: TypedArray,
    arraySpecific: TypedArraySpecific
}

const toJSON = (type: allTypes) => {
    const refs = type.getReferenceList(),
        refsMap = new Map(refs.map( (v, i) => [v, i]) )
    return refs.map(v => v.JSONConvertion(refsMap)) as JSONData['all'][]
}

type JSONData = {
    TypedValue: {
        type: 'value'
        name: string
        data: {
            type: valueTypes['valueType'][]
            specifics?: {
                string?: string[]
                number?: number[]
                boolean?: ('true' | 'false')[]
            }
            objects?: number[]
        }
    }
    TypedObject: {
        type: 'object'
        name: string
        data: {
            allowUnusedProperties: boolean
            indexType: number
            objData: [
                key: string,
                propData: [
                    data: number,
                    required: boolean
                ]
            ][]
        }
    }
    TypedArray: {
        type: 'array'
        name: string
        data: number
    }
    TypedArraySpecific: {
        type: 'arraySpecific'
        name: string,
        minLength: number,
        allowOverlength: boolean,
        data: number[]
    }
    all: JSONData[Exclude<keyof JSONData, 'all' | 'default'>]
}
export { JSONData as typedValuesJSON }
