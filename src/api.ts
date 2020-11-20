import { Promised, PromisedType } from 'Common'

const host = 'localhost'
const port = '5976'

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

const isWsError = (e: CloseEvent) => e.code !== 1000

class WsTimeoutError extends Error {}

type WsEndpointParameters<Request> = { id: string, retries?: number, timeout?: number } & Request
type WsEndpointResponse<Response> = { data: Response[], done: boolean }

const api = new Proxy ({}, {
    get (_, endpoint: string) {
        return function <Request, Response>({ id, retries = 3, timeout = 10000, ...args }: { id: string, retries: number, timeout: number } & Request) {
            let ws: WebSocket, message: PromisedType<WsEndpointResponse<Response>>

            const refresh = () => message = Promised ()
            const send = (msg: any) => {
                if (disconnected ()) return

                ws.send (msg && typeof msg === 'object' ? JSON.stringify (msg) : msg)
            }

            const disconnected = () => !ws || (ws.readyState === ws.CLOSED) || (ws.readyState === ws.CLOSING)
            const cancel = (code?: number, reason?: string) => {

                if (!disconnected ()) {
                    ws.removeEventListener ('open', ws.onopen)
                    ws.removeEventListener ('close', ws.onclose)
                    ws.removeEventListener ('error', ws.onerror)
                    ws.removeEventListener ('message', ws.onmessage)
                    ws.close (code, reason)
                }

                ws = undefined
            }

            const connect = () => new Promise ((resolve, reject) => {
                ws = new WebSocket (`ws://${ host }:${ port }/${ endpoint }`)

                ws.onopen = e => {
                    send ({ id })
                    refresh ()
                    resolve (e)
                }

                ws.onclose = (e: CloseEvent) => {
                    if (isWsError (e)) {
                        message.reject (parseWsError(e))
                    } else {
                        message.resolve ({ data: undefined, done: true })
                    }
                }

                ws.onerror = () => console.error ('Web Socket error')
                ws.onmessage = msg => { message.resolve (JSON.parse (msg.data)); refresh () }
            })

            const waitForTimeout = () => new Promise ((_, reject) => {

                const timeoutId = setTimeout (() => {

                    clearTimeout (timeoutId)

                    reject (new WsTimeoutError ('Web Socket Connection Timeout'))

                }, timeout)
            })

            const next = async () => {

                let attempts = retries

                while (true) {

                    if (disconnected ()) return

                    try {

                        return await Promise.race ([ message, waitForTimeout () ])

                    } catch (e) {

                        if (!(e instanceof WsTimeoutError) || !(attempts--)) return Promise.reject (e)

                        cancel ()
                        await connect ()
                    }
                }
            }

            return connect ().then (() => Object.assign (next, { send, cancel }))
        }
    }
}) as {
    [key: string]: <Request, Response>(args: WsEndpointParameters<Request>) => ((() => Promise<WsEndpointResponse<Response>>) & {
        cancel: (code?: number, reason?: string) => void,
        send: (msg: any) => void,
    })
}

export default api