import { Player as TMCPlayer } from 'mojang-minecraft'

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

    type List<V, I extends PropertyKey = string> = { [P in I]: V }
    type RequiredSome<V, K extends keyof V> = V & { [P in K]: V[P] }
    type ExcludeSome<V, K extends keyof V> = { [P in Exclude<keyof V, K>]: V[P] }
    type Optional<V> = { [P in keyof V]?: V[P] }
}
