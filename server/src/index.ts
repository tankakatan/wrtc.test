import WebSocket, { Server } from 'ws'

const port = 5976
const server = new Server ({ port, path: '/contacts' })
const clients = {} as {
    [key: string]: { ws: WebSocket, id: string, name: string, status: 'online' | 'offline' | 'error' }
}

const broadcast = () => {
    for (const id in clients) {
        clients[id].ws.send (
            JSON.stringify ({
                done: false,
                data: Object
                    .values (clients)
                    .filter (c => c.id !== id)
                    .map (({ ws, ...c }) => c)
                    .sort ((c1, c2) => c1.id < c2.id ? -1 : 0) }))
    }
}

server
    .on ('open', () => console.log ('Server is open on port', port))
    .on ('connection', (ws, req) => {

        let client: string

        ws
            .on ('message', (msg: string) => {
                const { id, name } = JSON.parse (msg)

                client = id

                clients[id] = { ws, id, name, status: 'online' }

                broadcast ()
            })

            .on ('error', err => {
                clients[client].status = 'error'
                broadcast ()
            })

            .on ('close', () => {
                clients[client].status = 'offline'
                broadcast ()
            })
    })

    .on ('error', err => {
        console.error ('Server error:', err)
    })
