export { default as Button } from './Button'
export { default as Video } from './Video'

export type PromisedType<T> = Promise<T> & {
    resolve: (value?: T) => void,
    reject: (reason?: string | Error) => void,
}

export const Promised = <T>(): PromisedType<T> => {
    let resolve, reject
    const promise = new Promise<T> ((res, rej) => { resolve = res; reject = rej })

    return Object.assign (promise as Promise<T> , { resolve, reject })
}

export type User = {
    id: string,
    name?: string,
    status: 'online' | 'offline' | 'error',
    error?: Error,
}

export type ChatMessage = {
    timestamp: Number,
    message: string,
    sender: User,
    recipient: User,
    media?: null, // temp
}

export type Message = { from: string, to: string, type: string, data: any, error?: string };
