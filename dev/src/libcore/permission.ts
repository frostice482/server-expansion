import { empty } from "./misc.js";

export default class permission {
    /**
     * Assigns permission level to a tag.
     * @param tag Tag which permission level will be assigned to.
     * @param level Permission level that will be assigned to the tag.
     */
    static readonly assign = (tag: string, level: number) => ( list[tag] = level, this )

    /**
     * Test if a tag has permission level assigned to it.
     * @param tag Tag.
     */
    static readonly isAssigned = (tag: string) => tag in list

    /**
     * Deassigns permission level from a tag.
     * @param tag Tag which permission level will be removed.
     */
    static readonly deassign = (tag: string) => { const v = tag in list; return delete list[tag], v }

    /**
     * Gets role group list.
     */
    static readonly getList = () => Object.entries(list)

    /**.
     * ets permission level assigned to the tag.
     * @param tag Tag.
     */
    static readonly 'get' = (tag: string) => list[tag]

    /**
     * Gets permission level from tags.
     * @param tags Tags.
     */
    static readonly getLevel = (tags: string[]) => tags.reduce((lev, tag) => ( tag in list && list[tag] > lev ) ? list[tag] : lev, 0)

    protected constructor() { throw new TypeError('Class is not constructable') }
}

let list: List<number> = empty()

// storage stuff
import storage from "./storage.js"

export type saveData = {
    levels: [tag: string, level: number][]
}

storage.instance.default.ev.save.subscribe(function permissionSave (data) {
    data.permission = {
        levels: Object.entries(list)
    }
})
storage.instance.default.ev.load.subscribe(function permissionLoad (data) {
    if (!data.permission) return
    list = empty(Object.fromEntries(data.permission.levels))
})
