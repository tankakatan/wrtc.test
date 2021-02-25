import { Promised, PromisedType, SignalingMessage, SignalingMessageEnvelop, User, UserId } from 'shared'

type WsConnectionOptions = { retries?: number, timeout?: number }
type Packet<T> = { from: UserId, to: UserId, data?: T }

class WsTimeoutError extends Error {}

const host = 'neodequate.com'
const port = '5976'

const isWsError = (e: CloseEvent) => e.code !== 1000
const parseWsError = (e: CloseEvent) => {
    switch (e.code) {
        case 1000: return 'Normal closure, meaning that the purpose for which the connection was established has been fulfilled.'
        case 1001: return 'An endpoint is \'going away\', such as a server going down or a browser having navigated away from a page.'
        case 1002: return 'An endpoint is terminating the connection due to a protocol error'
        case 1003: return 'An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).'
        case 1004: return 'Reserved. The specific meaning might be defined in the future.'
        case 1005: return 'No status code was actually present.'
        case 1006: return 'The connection was closed abnormally, e.g., without sending or receiving a Close control frame'
        case 1007: return 'An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [http://tools.ietf.org/html/rfc3629] data within a text message).'
        case 1008: return 'An endpoint is terminating the connection because it has received a message that \'violates its policy\'. This reason is given either if there is no other sutible reason, or if there is a need to hide specific details about the policy.'
        case 1009: return 'An endpoint is terminating the connection because it has received a message that is too big for it to process.'
        case 1010: return 'An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn\'t return them in the response message of the WebSocket handshake. Specifically, the extensions that are needed are: ' + e.reason
        case 1011: return 'A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.'
        case 1015: return 'The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can\'t be verified).'
        default: return 'Unknown reason'
    }
}

let ws = undefined as WebSocket & { sendMessage: (msg: any) => void, closeSocket: () => void }

const disconnected = (ws: WebSocket) => !ws || (ws.readyState === ws.CLOSED) || (ws.readyState === ws.CLOSING)
const getSocket = () => {
    if (ws && !disconnected (ws)) {
        return ws
    }

    const sendMessage = (msg: any) => {
        if (!disconnected (ws)) {
            ws.send (msg && typeof msg === 'object' ? JSON.stringify (msg) : msg)
        }
    }

    const closeSocket = (code?: number, reason?: string) => {
        if (!disconnected (ws)) {
            ws.removeEventListener ('open', ws.onopen)
            ws.removeEventListener ('close', ws.onclose)
            ws.removeEventListener ('error', ws.onerror)
            ws.removeEventListener ('message', ws.onmessage)
            ws.close (code, reason)
        }

        ws = undefined
    }

    return new Promise ((resolve, reject) => {
        ws = Object.assign (new WebSocket (`ws://${ host }:${ port }`), { sendMessage, closeSocket })

        ws.onopen = () => resolve (ws)
        ws.onerror = reject
    }) as Promise<typeof ws>
}

const countdown = <T>(timeout: number): Promise<SignalingMessageEnvelop<T>> => new Promise ((_, reject) => {
    const timeoutId = setTimeout (() => {
        clearTimeout (timeoutId)
        reject (new WsTimeoutError ('Web Socket Connection Timeout'))
    }, timeout)
})

const api = new Proxy ({}, {
    get (_, type: string) {
        return async function <Request, Response>({ from, to, data }: Packet<Request>, {
            retries = 3,
            timeout = 3600000,
        } = {} as WsConnectionOptions) {
            let ws = await getSocket ()
            let message = undefined as PromisedType<SignalingMessageEnvelop<Response>>

            const refresh = () => message = Promised ()

            ws.addEventListener ('close', (e: CloseEvent) => {
                if (!message) return
                message.reject (new Error (parseWsError (e)))
            })

            ws.addEventListener ('message', (msg: MessageEvent) => {
                const data = JSON.parse (msg.data) as SignalingMessageEnvelop<Response>

                if (data.type === type) {
                    message.resolve (data)
                    refresh ()
                }
            })

            const next = async (): Promise<SignalingMessageEnvelop<Response>> => {
                let attempts = Math.max (retries, 0)

                while (true) {
                    if (disconnected (ws)) throw new Error ('Socket is closed')

                    try {
                        return await Promise.race ([ message, countdown<Response> (timeout) ])

                    } catch (error) {
                        if (!(error instanceof WsTimeoutError) || !(attempts--)) {
                            return // Promise.reject (error)
                        }

                        ws.closeSocket ()
                        ws = await getSocket ()
                    }
                }
            }

            if (data) {
                ws.sendMessage ({ type, from, to, message: { data, done: false } })
            }

            refresh ()

            return Object.assign (next, { send: ws.sendMessage.bind (ws), cancel: ws.closeSocket.bind (ws) })
        }
    }
}) as {
    [key: string]: <Request, Response>(data: Packet<Request>, options?: WsConnectionOptions) => (
        (() => Promise<SignalingMessageEnvelop<Response>>) & {
            cancel: (code?: number, reason?: string) => void,
            send: (msg: any) => void,
        }
    )
}

export default api
