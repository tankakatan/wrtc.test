export { default as Button } from './Button'
export { default as Video } from './Video'

export const Promised = <T>() => {
    let resolve, reject
    const promise = new Promise<T> ((res, rej) => { resolve = res; reject = rej })

    return Object.assign (promise as Promise<T> , { resolve, reject } as {
        resolve: (_?: T) => undefined,
        reject: (_?: string | Error) => undefined,
    })
}
