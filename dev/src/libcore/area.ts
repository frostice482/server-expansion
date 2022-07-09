import { BlockAreaSize, BlockLocation, Location } from "mojang-minecraft"
import { empty } from "../libcore/misc.js"

export default class Area {
    static readonly toLocationArray = ({x, y, z}: Location | BlockLocation | BlockAreaSize) => [x, y, z] as locationArray
    static readonly toBlockPos = (loc: locationArray) => loc.map(v => Math.floor(v)) as locationArray
    static readonly toLocation = (loc: locationArray) => new Location(loc[0], loc[1], loc[2])
    static readonly toBlockLocation = (loc: locationArray) => new BlockLocation(loc[0], loc[1], loc[2])

    constructor(from: locationArray, to: locationArray) {
        [this.#from, this.#to] = fixLocation(from, to)
    }

    #from: locationArray
    #to: locationArray
    get from() { return this.#from }
    get to() { return this.#to }

    readonly getSize = (): locationArray => {
        const [xa, ya, za] = this.#from,
            [xb, yb, zb] = this.#to
        return [
            xb - xa + 1,
            yb - ya + 1,
            zb - za + 1,
        ]
    }

    readonly getVolume = () => this.getSize().reduce((a, b) => a * b, 1)

    readonly getCenter = () => {
        const [xa, ya, za] = this.#from,
            [xb, yb, zb] = this.#to
        return [
            xa + ( xb - xa ) / 2,
            ya + ( yb - ya ) / 2,
            za + ( zb - za ) / 2
        ] as locationArray
    }
    
    readonly extend = (size: number) => {
        this.#from = this.#from.map(v => v - size) as locationArray
        this.#to = this.#to.map(v => v + size) as locationArray
    }

    readonly shrink = (size: number) => {
        [this.#from, this.#to] = fixLocation(
            this.#from.map(v => v + size) as locationArray,
            this.#to.map(v => v - size) as locationArray
        )
    }

    readonly extendAxis = (axis: keyof typeof axisEnum, size: number) => {
        axis = axisEnum[axis]
        this.#from[axis] -= size
        this.#to[axis] += size
    }

    readonly shrinkAxis = (axis: keyof typeof axisEnum, size: number) => {
        axis = axisEnum[axis]
        const [a, b] = [this.#from[axis] += size, this.#to[axis] -= size]
        if (a > b) [this.#from[axis], this.#to[axis]] = [b, a]
    }

    readonly isInside = (loc: locationArray) => {
        const [xa, ya, za] = this.#from,
            [xb, yb, zb] = this.#to,
            [x, y, z] = loc
        return (
               ( xa <= x && x <= xb )
            && ( ya <= y && y <= yb )
            && ( za <= z && z <= zb )
        )
    }

    readonly getClosestAxisDistance = (loc: locationArray) => {
        const [xa, ya, za] = this.#from,
            [xb, yb, zb] = this.#to,
            [x, y, z] = loc
        return [
            x <= xa ? xa - x : x >= xb ? xb - x : 0,
            y <= ya ? ya - y : y >= yb ? yb - y : 0,
            z <= za ? za - z : z >= zb ? zb - z : 0
        ] as locationArray
    }

    readonly getClosestDistance = (loc: locationArray) => Math.hypot(...this.getClosestAxisDistance(loc))

    readonly getClosestLocation = (loc: locationArray) => {
        const [xa, ya, za] = this.#from,
            [xb, yb, zb] = this.#to,
            [x, y, z] = loc
        return [
            x <= xa ? xa : x >= xb ? xb : x,
            y <= ya ? ya : y >= yb ? yb : y,
            z <= za ? za : z >= zb ? zb : z,
        ] as locationArray
    }

    readonly fragment = (() => {
        const t = this
        return function* (size: locationArray | number) {
            size = typeof size == 'number' ? [size, size, size] : size
            const [xa, ya, za] = t.#from,
                [xb, yb, zb] = t.#to,
                [xs, ys, zs] = size
            for (let x = xa; x <= xb; x += xs) {
                const xm = Math.min(x + xs - 1, xb)
                for (let y = ya; y <= yb; y += ys) {
                    const ym = Math.min(y + ys - 1, yb)
                    for (let z = za; z <= zb; z += zs) {
                        const zm = Math.min(z + zs - 1, zb)
                        yield {
                            from: [x, y, z] as locationArray,
                            to: [xm, ym, zm] as locationArray
                        }
                    }
                }
            }
        }
    })()
}

const fixLocation = (a: locationArray, b: locationArray): [locationArray, locationArray] => {
    const [xa, ya, za] = a,
        [xb, yb, zb] = b
    return [
        [
            xa > xb ? xb : xa,
            ya > yb ? yb : ya,
            za > zb ? zb : za,
        ], [
            xa < xb ? xb : xa,
            ya < yb ? yb : ya,
            za < zb ? zb : za,
        ]
    ]
}

const axisEnum = empty({
    'x': 0,
    'y': 1,
    'z': 2,
    0: 0,
    1: 1,
    2: 2,
} as const)

export type locationArray = [x: number, y: number, z: number]
