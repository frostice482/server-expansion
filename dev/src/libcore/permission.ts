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
     * Gets permission level from tags.
     * @param tags Tags.
     */
    static readonly getLevel = (tags: string[]) => tags.reduce((lev, tag) => ( tag in list && list[tag] > lev ) ? list[tag] : lev, 0)

    protected constructor() { throw new ReferenceError('Class is not constructable') }
}

const list: List<number> = empty()
