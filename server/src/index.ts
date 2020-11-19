import { Server } from 'ws'

const port = 5976
const server = new Server ({ port })
const clients = {}

server
    .on ('open', () => console.log ('Server is open on port', port))
    .on ('connection', (ws, req) => {

        console.log ('Connection:', req.headers['sec-websocket-key'])

        ws
            .on ('message', msg => {
                console.log ('Message:', msg)
            })
            .on ('error', err => {
                console.error ('Connection error:', err)
            })
    })
    .on ('error', err => {
        console.error ('Server error:', err)
    })
