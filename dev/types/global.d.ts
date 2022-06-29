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
    var __date_clock: () => number
}
