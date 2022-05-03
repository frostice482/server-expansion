/**
 * Creates a new empty object.
 * @param obj Initial object.
 */
export const empty = <T extends {}> (obj: T = null): T => Object.defineProperties(Object.create(null), Object.getOwnPropertyDescriptors(obj ?? {}))
