import { empty } from "./misc.js"

export default class TypedValues {
    static get value() { return TypedValue }
    static get object() { return TypedObject }
    static get array() { return TypedArray }
    static get arraySpecific() { return TypedArraySpecific }

    /**
     * Creates a type definition from JSON data.
     * @param jsonData JSON data.
     */
    static readonly fromJSON = (jsonData: JSONData['all'][]) => refId[jsonData[0].type].fromJSON(jsonData)

    protected constructor() { throw new TypeError('Class is not constructable') }
}

export class TypedValue {
    /**
     * Creates a specific typed array from JSON data.
     * @param jsonData JSON data. If `index` is not specified, the typed value in 0th index must be a typed array (`array`).
     * @param index Index to be parsed from JSON data. nth index in JSON Data must be a typed array (`array`).
     * @param referenceList Reference list, consisting of index of typed values.
     */
    static readonly fromJSON = (jsonData: JSONData['all'][], referenceList: Record<number, allTypes> = empty(), index = 0) => {
        const data = jsonData[index]
        if (data?.type != 'value') throw new TypeError(`Type mismatched: expecting 'value', got '${data.type}'`)

        const type = new this()
        referenceList[index] = type
        type.name = data.name

        const d = type.#data
        const { data: { type: valueTypes, objects: valueObjects = [], specifics: valueSpecifics = {} } } = data
        for (const key of valueTypes) d.type[key] = 1
        for (const i of valueObjects) d.objects.add( objRef(jsonData, referenceList, i) )
        for (const key in valueSpecifics) for (const v of valueSpecifics[key]) d.specifics[v] = 1
        
        return type
    }

    /**
     * Creates a typed value.
     * @param type Value types.
     */
    constructor(...type: valueTypes['all'][]) {
        this.addType(...type)
    }

    #data: {
        type: Record<valueTypes['valueType'], 1>
        specifics: {
            string: Record<string, 1>
            number: Record<number, 1>
            boolean: Record<'true' | 'false', 1>
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
     * @param value Value to be tested.
     */
    readonly test = (value: any) => {
        if ('any' in this.#data.type) return true
        const valueType = typeof value
        if ( valueType == 'string' || valueType == 'number' || valueType == 'boolean' ) return valueType in this.#data.type || value in this.#data.specifics[valueType]
        else for (const type of this.#data.objects) if (type.test(value)) return true
        return false
    }

    /**
     * Converts to JSON format.
     */
    readonly toJSON = () => toJSON(this)

    /**
     * Gets reference list.
     * @param refList Existing reference list consisting of typed values.
     * @returns Reference list.
     */
    readonly getReferenceList = (refList: allTypes[] = []): allTypes[] => {
        if (refList.includes(this)) return refList
        refList.push(this)
        for (const type of this.#data.objects) type.getReferenceList(refList)
        return refList
    }

    /**
     * Converts to JSON data.
     * @param refList Reference list, consisting of typed values which value is a typed value's index.
     * @returns JSON data.
     */
    readonly JSONConvertion = (refList: Map<allTypes, number>): JSONData['TypedValue'] => {
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
                objects: Array.from(objects, (type) => refList.get(type))
            }
        }
    }
}

export class TypedObject {
    /**
     * Creates a specific typed array from JSON data.
     * @param jsonData JSON data. If `index` is not specified, the typed value in 0th index must be a typed array (`array`).
     * @param index Index to be parsed from JSON data. nth index in JSON Data must be a typed array (`array`).
     * @param referenceList Reference list, consisting of index of typed values.
     */
    static readonly fromJSON = (jsonData: JSONData['all'][], referenceList: Record<number, allTypes> = empty(), index = 0) => {
        const data = jsonData[index]
        if (data?.type != 'object') throw new TypeError(`Type mismatched: expecting 'object', got '${data.type}'`)

        const type = new this()
        referenceList[index] = type

        type.name = data.name
        type.#data = new Map( data.data.objData.map( ([key, [i, required] ]) => [ key, [ objRef(jsonData, referenceList, i), required ] ] ) )
        type.#allowUnusedProperties = data.data.allowUnusedProperties
        type.#indexType = objRef(jsonData, referenceList, data.data.indexType)

        return type
    }

    /**
     * Creates a typed object.
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
     * @param type Type.
     */
     readonly setIndexType = (type: allTypes) => {
        this.#indexType = type
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
     * Tests if an object matches the type defined.
     * @param obj Object to be tested.
     */
    readonly test = (obj: any) => {
        if (typeof obj != 'object' || Array.isArray(obj)) return false
        const keys = new Map(Object.entries(obj))
        for (const [key, [type, required]] of this.#data) {
            if (!(key in obj)) {
                if (required) return false
                else continue
            }
            if (!type.test(obj[key])) return false
            keys.delete(key)
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
     * @param refList Existing reference list consisting of typed values.
     * @returns Reference list.
     */
    readonly getReferenceList = (refList: allTypes[] = []): allTypes[] => {
        if (refList.includes(this)) return refList
        refList.push(this)
        for (const [type] of this.#data.values()) type.getReferenceList(refList)
        this.#indexType?.getReferenceList(refList)
        return refList
    }
    
    /**
     * Converts to JSON data.
     * @param refList Reference list, consisting of typed values which value is a typed value's index.
     * @returns JSON data.
     */
    readonly JSONConvertion = (refList: Map<allTypes, number>): JSONData['TypedObject'] => ({
        type: 'object',
        name: this.name,
        data: {
            allowUnusedProperties: this.#allowUnusedProperties,
            indexType: refList.get(this.#indexType),
            objData: Array.from(this.#data, ([ key, [type, required] ]) => [ key, [ refList.get(type), required ] ] )
        }
    })
}

export class TypedArray {
    /**
     * Creates a specific typed array from JSON data.
     * @param jsonData JSON data. If `index` is not specified, the typed value in 0th index must be a typed array (`array`).
     * @param index Index to be parsed from JSON data. nth index in JSON Data must be a typed array (`array`).
     * @param referenceList Reference list, consisting of index of typed values.
     */
    static readonly fromJSON = (jsonData: JSONData['all'][], referenceList: Record<number, allTypes> = empty(), index = 0) => {
        const data = jsonData[index]
        if (data?.type != 'array') throw new TypeError(`Type mismatched: expecting 'array', got '${data.type}'`)

        const type = new this()
        referenceList[index] = type

        type.name = data.name
        type.type = objRef(jsonData, referenceList, data.data)

        return type
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
     * Tests if an array matches the type defined.
     * @param arr Array to be tested.
     */
    readonly test = (arr?: any[]) => Array.isArray(arr) && arr.every( this.type.test ?? (() => false) )

    /**
     * Converts to JSON data.
     * @returns JSON data.
     */
    readonly toJSON = () => toJSON(this)

    /**
     * Gets reference list.
     * @param refList Existing reference list consisting of typed values.
     * @returns Reference list.
     */
    readonly getReferenceList = (refList: allTypes[] = []): allTypes[] => {
        if (refList.includes(this)) return refList
        refList.push(this)
        return this.type.getReferenceList(refList)
    }

    /**
     * Converts to JSON data.
     * @param refList Reference list, consisting of typed values which value is a typed value's index.
     * @returns JSON data.
     */
    readonly JSONConvertion = (refList: Map<allTypes, number>): JSONData['TypedArray'] => ({
        type: 'array',
        name: this.name,
        data: refList.get(this.type)
    })
}

export class TypedArraySpecific {
    /**
     * Creates a specific typed array from JSON data.
     * @param jsonData JSON data. If `index` is not specified, the typed value in 0th index must be a sepcific typed array (`arraySpecific`).
     * @param index Index to be parsed from JSON data. nth index in JSON Data must be a sepcific typed array (`arraySpecific`).
     * @param referenceList Reference list, consisting of index of typed values.
     */
    static readonly fromJSON = (jsonData: JSONData['all'][], referenceList: Record<number, allTypes> = empty(), index = 0) => {
        const data = jsonData[index]
        if (data?.type != 'arraySpecific') throw new TypeError(`Type mismatched: expecting 'arraySpecific', got '${data.type}'`)

        const type = new this()
        referenceList[index] = type

        type.name = data.name
        type.minLength = data.minLength
        type.allowOverlength = data.allowOverlength
        type.type = data.data.map(i => objRef(jsonData, referenceList, i))

        return type
    }

    /**
     * Creates a specific array type.
     * @param type Value types.
     * @param minLength Minimum array length.
     */
    constructor(type: allTypes[] = [], minLength: number = type.length) {
        this.type = type
        this.minLength = minLength
    }

    /** Type data. */
    type: allTypes[]
    /** Minimum length of array. */
    minLength: number
    /** Determines whether array size can oversize the array size in the type. */
    allowOverlength = false

    /** Type name. */
    name = ''

    /**
     * Tests if an array matches the type defined.
     * @param arr Array to be tested.
     */
    readonly test = (arr?: any[]) => (
        Array.isArray(arr)
        && ( this.allowOverlength ? true : arr.length <= this.type.length )
        && this.type.every((type, i) => ( this.minLength <= i && !(i in arr) ) || type.test(arr[i]))
    )

    /**
     * Converts to JSON data.
     * @returns JSON data.
     */
    readonly toJSON = () => toJSON(this)

    /**
     * Gets reference list.
     * @param refList Existing reference list consisting of typed values.
     * @returns Reference list.
     */
    readonly getReferenceList = (refList: allTypes[] = []): allTypes[] => {
        if (refList.includes(this)) return refList
        refList.push(this)
        for (const type of this.type) type.getReferenceList(refList)
        return refList
    }

    /**
     * Converts to JSON data.
     * @param refList Reference list, consisting of typed values which value is a typed value's index.
     * @returns JSON data.
     */
    readonly JSONConvertion = (refList: Map<allTypes, number>): JSONData['TypedArraySpecific'] => ({
        type: 'arraySpecific',
        name: this.name,
        minLength: this.minLength,
        allowOverlength: this.allowOverlength,
        data: this.type.map(type => refList.get(type))
    })
}

// Type definition
type valueTypes = {
    valueType: 'string' | 'number' | 'boolean' | 'any'
    specifics: ( string | number | boolean )[]
    objects: ( TypedValue | TypedObject | TypedArray | TypedArraySpecific )
    all: valueTypes[Exclude<keyof valueTypes, 'all'>]
}
type allTypes = TypedValue | TypedObject | TypedArray | TypedArraySpecific
export { allTypes as typedValuesAll }

// JSON stuff
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

const objRef = (jsonData: JSONData['all'][], referenceList: Record<number, allTypes>, index: number) =>
    referenceList[index] ??= refId[jsonData[index].type].fromJSON(jsonData, referenceList, index)

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
