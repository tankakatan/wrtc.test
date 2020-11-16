import { Server } from 'ws'

const port = 5976
const server = new Server ({ port })

server
    .on ('open', () => console.log ('Server is open on port', port))
    .on ('connection', ws => {
        ws
            .on ('message', msg => {
                console.log ('Message:', msg, 'from', ws)
            })
            .on ('error', err => {
                console.error ('Connection error:', err)
            })
    })
    .on ('error', err => {
        console.error ('Server error:', err)
    })
