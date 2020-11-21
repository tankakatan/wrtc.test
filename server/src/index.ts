import { IncomingMessage } from 'http'
import WebSocket, { Server } from 'ws'

type ClientState = {
    ws: WebSocket,
    id: string,
    name?: string,
    status: 'online' | 'offline' | 'error',
    error?: Error,
}

const port = 5976
const clients = {} as { [id: string]: ClientState }

new Server ({ port })
    .on ('open', () => console.info ('Register server is open on port', port))
    .on ('error', e => console.error ('Register server error:', e))
    .on ('connection', (ws: WebSocket, _: IncomingMessage) => {
        let client: string

        ws
            .on ('message', (msg: string) => {
                const message = JSON.parse (msg)

                switch (message.type) {
                    case 'register':
                        if (!('id' in message)) {
                            ws.send ({ data: undefined, error: 'Client id is not specified' })

                        } else {
                            client = message.id
                            clients[client] = { ws, id: client, name, status: 'online' }

                            broadcastClientList ()
                        }

                        break

                    case 'exchange':
                        handleExchangeMessage (ws, message)
                        break

                    default:
                        ws.send ({ data: undefined, error: 'Unsupported message type: ' + message.type })
                }
            })

            .on ('error', (error: Error) => {
                clients[client].status = 'error'
                clients[client].error = error
                broadcastClientList ()
            })

            .on ('close', () => {
                clients[client].status = 'offline'
                broadcastClientList ()
            })
    })

type Offer = { type: string, sdp: string }

function handleExchangeMessage (ws: WebSocket, { from, to, offer }: { from: string, to: string, offer: Offer }) {
    switch (true) {
        case from === undefined:
            ws.send ({ data: undefined, error: 'Message should specify a sender' }); break

        case !(from in clients):
            ws.send ({ data: undefined, error: 'Unable to identify the sender' }); break

        case to === undefined:
            ws.send ({ data: undefined, error: 'Message should specify a recepient' }); break

        case !(to in clients):
            ws.send ({ data: undefined, error: 'Unable to identify the recepient' }); break

        case clients[to].status === 'offline':
            ws.send ({ data: undefined, error: 'Recepient is offline' }); break

        case clients[to].ws === undefined:
        case clients[to].ws.readyState === clients[to].ws.CLOSED:
        case clients[to].ws.readyState === clients[to].ws.CLOSING:
            ws.send ({ data: undefined, error: 'Recepien socket is closed' }); break

        default:
            clients[to].ws.send ({ data: { from, offer } }); break
    }
}

function broadcastClientList () {
    const message = JSON.stringify ({
        data: { clients: Object.values (clients).map (({ ws, ...c }) => c) }
    })

    for (const id in clients) clients[id].ws.send (message)
}
