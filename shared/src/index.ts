export type PromisedType<T> = Promise<T> & {
    resolve: (value?: T) => void,
    reject: (reason?: string | Error) => void,
}

export const Promised = <T>(): PromisedType<T> => {
    let resolve, reject
    const promise = new Promise<T> ((res, rej) => { resolve = res; reject = rej })

    return Object.assign (promise as Promise<T> , { resolve, reject })
}

export type UserId = string
export type User = {
    id: UserId,
    name?: string,
    status?: 'online' | 'offline' | 'error',
    error?: Error,
}

export type ContactList = { [id in UserId]: User }
export type ChatMessage = {
    timestamp: Number,
    message: string,
    sender: UserId,
    recipient: UserId,
    media?: null, // temp
}

export type DataController = {
    message: () => Promise<{ data: ChatMessage, done: boolean }>,
    send: (message: string) => ChatMessage,
    end: () => void,
}

export type MediaController = {
    media: () => Promise<MediaStream>,
    startCall: () => Promise<MediaStream>,
    startVideoCall: () => Promise<MediaStream>,
    shareScreen: () => Promise<MediaStream>,
    muteAudio: () => void,
    muteVideo: () => void,
    unmuteAudio: () => void,
    unmuteVideo: () => void,
    endSharingScreen: () => void,
    endCall: () => void,
}

export type ChatController = DataController & MediaController
export type SignalingMessage<T> = { data: T, error?: string, done: boolean }
export type SignalingMessageEnvelop<T> = { type: string, from: string, to: string, message: SignalingMessage<T> }