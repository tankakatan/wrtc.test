import { IncomingMessage } from 'http'
import WebSocket, { Server } from 'ws'

type SignalingMessage = { from: string, to?: string, payload: any, error?: string }
type SignalingMessageEnvelop = { type: string, message: SignalingMessage }
type UserId = string
type User = { id: UserId, name?: string }

const port = 5976

const clients = {} as { [id in UserId]: User }
const sockets = {} as { [id in UserId]: WebSocket }

const disconnected = (ws: WebSocket) => !ws || (ws.readyState === ws.CLOSED) || (ws.readyState === ws.CLOSING)
const send = (ws: WebSocket, data: any) => {
    if (!disconnected (ws)) ws.send (JSON.stringify (data))
}

const errorResponse = (message: string, request: SignalingMessageEnvelop): SignalingMessageEnvelop => ({
    type: request.type,
    message: {
        from: 'server',
        to: request.message.from,
        payload: undefined,
        error: `Communication error: ${ message }. Original request: ${ JSON.stringify (request) }`,
    }
})

function broadcastClientList () {
    for (const id in sockets) {
        send (sockets[id], { type: 'register', message: { from: 'server', to: id, payload: clients } })
    }
}

new Server ({ port })
    .on ('open', () => console.info ('Server is open on port', port))
    .on ('error', e => console.error ('Server error:', e))
    .on ('connection', (ws: WebSocket, _: IncomingMessage) => {
        let client = undefined as string

        ws
            .on ('message', (msg: string) => {
                const data = JSON.parse (msg) as SignalingMessageEnvelop
                const { type, message: { from, to } } = data

                if (!type) {
                    return send (ws, errorResponse ('Undefined message type', data))
                }

                if (!from) {
                    return send (ws, errorResponse ('Sender is undefined', data))
                }

                if (type === 'register') {
                    client = from
                    clients[from] = data.message.payload
                    sockets[from] = ws

                    return broadcastClientList ()
                }

                switch (true) {
                    case !clients[from]:
                        return send (ws, errorResponse ('Sender is not registered', data))

                    case !to:
                        return send (ws, errorResponse ('Recipient is undefined', data))

                    case !clients[to]:
                        return send (ws, errorResponse ('Recipient is not registered', data))

                    case disconnected (sockets[to]):
                        return send (ws, errorResponse ('Recipient socket is closed', data))

                    default:
                        return send (sockets[to], data)
                }
            })

            .on ('error', (error: Error) => {
                if (clients[client]) {
                    console.log ('Client', client, 'connection error:', error)

                    delete clients[client]
                    delete sockets[client]
                }

                broadcastClientList ()
            })

            .on ('close', () => {
                if (clients[client]) {
                    delete clients[client]
                    delete sockets[client]
                }

                broadcastClientList ()
            })
    })
