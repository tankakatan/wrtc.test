import { IncomingMessage } from 'http'
import WebSocket, { Server } from 'ws'
import { SignalingMessageEnvelop, User, UserId } from 'shared'

const port = process.env.PORT || 5976

const clients = {} as { [id in UserId]: User }
const sockets = {} as { [id in UserId]: WebSocket }

const disconnected = (ws: WebSocket) => !ws || (ws.readyState === ws.CLOSED) || (ws.readyState === ws.CLOSING)
const send = (ws: WebSocket, data: SignalingMessageEnvelop<any>) => {
    if (!disconnected (ws)) {
        ws.send (JSON.stringify (data))
    }
}

const errorResponse = (error: string, request: SignalingMessageEnvelop<any>): SignalingMessageEnvelop<undefined> => ({
    type: request.type,
    from: 'server',
    to: request.from,
    message: {
        data: undefined,
        done: false,
        error: `Communication error: ${ error }. Original request: ${ JSON.stringify (request) }`,
    }
})

function broadcastClientList () {
    for (const id in sockets) {
        send (sockets[id], { type: 'register', from: 'server', to: id, message: {
            data: clients,
            done: false
        }})
    }
}

new Server ({ port })
    .on ('open', () => console.info ('Server is open on port', port))
    .on ('error', e => console.error ('Server error:', e))
    .on ('connection', (ws: WebSocket, _: IncomingMessage) => {
        let client = undefined as string

        ws
            .on ('message', (msg: string) => {
                const data = JSON.parse (msg) as SignalingMessageEnvelop<any>
                const { type, from, to, message } = data

                if (!type) {
                    return send (ws, errorResponse ('Undefined message type', data))
                }

                if (!from) {
                    return send (ws, errorResponse ('Sender is undefined', data))
                }

                if (type === 'register') {
                    client = from
                    clients[from] = message.data as User
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
