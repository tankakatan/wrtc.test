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

type RegisterMessage = { id: string, name?: string };
type ExchangeMessage = { from: string, to: string, offer: Offer };
type Offer = { type: string, sdp: string };

new Server ({ port })
    .on ('open', () => console.info ('Register server is open on port', port))
    .on ('error', e => console.error ('Register server error:', e))
    .on ('connection', (ws: WebSocket, _: IncomingMessage) => {
        let client: string

        const send = (data: any) => ws.send (JSON.stringify (data))

        ws
            .on ('message', (msg: string) => {
                const { type, query = {} } = JSON.parse (msg) as { type: string, query: RegisterMessage | ExchangeMessage }

                switch (type) {
                    case 'register':
                        if (!(query as RegisterMessage).id) {
                            send ({ data: undefined, error: 'Client id is not specified' })

                        } else {
                            client = (query as RegisterMessage).id
                            clients[client] = { ws, status: 'online', ...(query as RegisterMessage) }

                            broadcastClientList ()
                        }

                        break

                    case 'exchange':
                        handleExchangeMessage (ws, query as ExchangeMessage)
                        break

                    default:
                        send ({ data: undefined, error: 'Unsupported message type: ' + type })
                }
            })

            .on ('error', (error: Error) => {
                if (clients[client]) {
                    clients[client].status = 'error'
                    clients[client].error = error
                }
                broadcastClientList ()
            })

            .on ('close', () => {
                if (clients[client]) {
                    clients[client].status = 'offline'
                }
                broadcastClientList ()
            })
    })

function handleExchangeMessage (ws: WebSocket, { from, to, offer } = {} as ExchangeMessage) {

    const send = (data: any) => ws.send (JSON.stringify (data))

    switch (true) {
        case from === undefined:
            send ({ data: undefined, error: 'Message should specify a sender' }); break

        case !(from in clients):
            send ({ data: undefined, error: 'Unable to identify the sender' }); break

        case to === undefined:
            send ({ data: undefined, error: 'Message should specify a recepient' }); break

        case !(to in clients):
            send ({ data: undefined, error: 'Unable to identify the recepient' }); break

        case clients[to].status === 'offline':
            send ({ data: undefined, error: 'Recepient is offline' }); break

        case clients[to].ws === undefined:
        case clients[to].ws.readyState === clients[to].ws.CLOSED:
        case clients[to].ws.readyState === clients[to].ws.CLOSING:
            send ({ data: undefined, error: 'Recepien socket is closed' }); break

        default:
            clients[to].ws.send (JSON.stringify ({ data: { from, offer } })); break
    }
}

function broadcastClientList () {
    const message = JSON.stringify ({
        data: Object.values (clients).map (({ ws, ...c }) => c)
    })

    for (const id in clients) clients[id].ws.send (message)
}
