import { IncomingMessage } from 'http'
import WebSocket, { Server } from 'ws'

type Message = { from: string, to: string, type: string, data: any, error?: string };

type ClientState = {
    ws: WebSocket,
    id: string,
    name?: string,
}

const port = 5976
const clients = {} as { [id: string]: ClientState }
const disconnected = (ws: WebSocket) => !ws || (ws.readyState === ws.CLOSED) || (ws.readyState === ws.CLOSING)
const send = (ws: WebSocket, data: any) => {
    if (!disconnected (ws)) ws.send (JSON.stringify (data))
}

const errorResponse = (message: string, request: Message): Message => ({
    from: 'server',
    to: request.from,
    type: request.type,
    data: undefined,
    error: `Communication error: ${ message }. Original request: ${ JSON.stringify (request) }`,
})

function broadcastClientList () {
    for (const id in clients) {
        send (clients[id].ws, {
            from: 'server',
            to: id,
            type: 'register',
            data: { register: Object.values (clients).map (({ ws, ...c }) => c) },
        })
    }
}

new Server ({ port })
    .on ('open', () => console.info ('Server is open on port', port))
    .on ('error', e => console.error ('Server error:', e))
    .on ('connection', (ws: WebSocket, _: IncomingMessage) => {
        let client = undefined as string

        ws
            .on ('message', (msg: string) => {
                const message = JSON.parse (msg) as Message
                const { from, to, type } = message

                if (!type) {
                    return send (ws, errorResponse ('Undefined message type', message))
                }

                if (!from) {
                    return send (ws, errorResponse ('Sender is undefined', message))
                }

                if (type === 'register') {
                    client = from
                    clients[from] = { ws, id: from, status: 'online', ...message.data }

                    return broadcastClientList ()
                }

                switch (true) {
                    case !clients[from]:
                        return send (ws, errorResponse ('Sender is not registered', message))

                    case !to:
                        return send (ws, errorResponse ('Recipient is undefined', message))

                    case !clients[to]:
                        return send (ws, errorResponse ('Recipient is not registered', message))

                    case disconnected (clients[to].ws):
                        return send (ws, errorResponse ('Recipient socket is closed', message))

                    default:
                        return send (clients[to].ws, message)
                }
            })

            .on ('error', (error: Error) => {
                if (clients[client]) {
                    console.log ('Client', client, 'connection error:', error)
                    delete clients[client]
                }

                broadcastClientList ()
            })

            .on ('close', () => {
                if (clients[client]) {
                    delete clients[client]
                }

                broadcastClientList ()
            })
    })
