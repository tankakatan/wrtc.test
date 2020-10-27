export { default as Button } from './Button'

export const Promised = <T>() => {
    let resolve, reject
    const promise = new Promise ((res, rej) => { resolve = res; reject = rej })

    return Object.assign (promise, { resolve, reject } as {
        resolve: (_?: T) => undefined,
        reject: (_?: string | Error) => undefined,
    })
}
