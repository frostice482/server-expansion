import {} from 'mojang-minecraft'

type rawtext = {
    rawtext: (
        | { score: { name: string, objective: string } }
        | { selector: string }
        | { text: string, with: rawtext }
        | { translate: string }
    )[]
}

declare global {
    var console: {
        /** @deprecated */
        log: (...data: any[]) => void
        /** @deprecated */
        info: (...data: any[]) => void
        warn: (...data: any[]) => void
        error: (...data: any[]) => void
    }

    class InternalError extends Error {}
    let __date_clock: () => number

    type List<V, I extends PropertyKey = string> = { [P in I]: V }
    type RequiredSome<V, K extends keyof V> = V & { [P in K]: V[P] }
    type ExcludeSome<V, K extends keyof V> = { [P in Exclude<keyof V, K>]: V[P] }
    type Optional<V> = { [P in keyof V]?: V[P] }
    type FilterKeysIf<V, T> = { [K in keyof V]: V[K] extends T ? K : never }[keyof V]
    type FilterKeysIfNot<V, T> = { [K in keyof V]: V[K] extends T ? never : K }[keyof V]
    type ListIf<V, T> = { [K in FilterKeysIf<V, T>]: V[K] }
    type ListIfNot<V, T> = { [K in FilterKeysIfNot<V, T>]: V[K] }
}
