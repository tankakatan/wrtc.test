import { User, Message } from 'Common'
import api from '~/api'

const host = 'turn.neodequate.com'
const port = ''

async function Tunnel (from: string, to: string) {
    const connection = new RTCPeerConnection ({
        iceServers: [{ urls: `stun:${ host }${ port ? `:${ port }` : `` }` }]
    })

    console.log ('RTC connection created', connection)

    connection.oniceconnectionstatechange = () => {
        console.log ('oniceconnectionstatechange')

        if (connection.iceConnectionState === 'failed') {
            // @ts-ignore
            connection.restartIce ()
        }
    }

    const stream = await navigator.mediaDevices.getUserMedia ({ video: false, audio: true })

    for (const track of stream.getTracks ()) {
        connection.addTrack (track)
    }

    let candidateListEnd = false

    connection.onicecandidate = async (event: RTCPeerConnectionIceEvent) => {
        console.info ('Sending ice candidate')

        const getIceCandidate = await api.ice<{ from: string, to: string, data: RTCIceCandidate }, RTCIceCandidate> ({
            from, to, data: event.candidate
        })

        const { data: iceCandidate, error, done } = await getIceCandidate ()

        if (iceCandidate === null) {
            if (candidateListEnd) return
            else candidateListEnd = true
        } else {
            candidateListEnd = false
        }

        console.info ('An ice candidate received:', { iceCandidate, error, done })

        if (error) {
            console.error ('Ice candidate exchange error:', error)
        }

        if (done) {
            console.info ('Ice candidate exchange unexpectedly completed')
        }

        await connection.addIceCandidate (iceCandidate)
    }

    connection.onnegotiationneeded = () => {
        console.log ('negotiation are needed')
    }

    return connection
}

async function requestChat (sender: User, recipient: User) {
    console.info ('Requesting a chat', sender, recipient)

    const connection = await Tunnel (sender.id, recipient.id)

    connection.onnegotiationneeded = async () => {
        console.log ('negotiation are needed')

        await connection.setLocalDescription (await connection.createOffer ())

        console.info ('Sending offer')

        const getAnswer = await api.sdp<{ from: string, to: string, data: RTCSessionDescription }, RTCSessionDescription> ({
            from: sender.id,
            to: recipient.id,
            data: connection.localDescription
        })

        const { data: answer, error, done }  = await getAnswer ()

        console.info ('An answer received:', { answer, error, done })

        if (error) {
            console.error ('Handshake error:', error)
            throw error
        }

        if (done) {
            console.info ('Handshake unexpectedly completed', answer)
        }

        await connection.setRemoteDescription (answer)
    }
}

async function acceptChat (user: User, message: Message) {
    const connection = await Tunnel (user.id, message.from)

    if (!message.data || message.data.type !== 'offer' || !message.data.sdp) {
        console.error ('Invalid handshake message', message)
    }

    console.info ('Received a correct offer:', message)

    await connection.setRemoteDescription (message.data)
    await connection.setLocalDescription (await connection.createAnswer ())

    await api.sdp<{ from: string, to: string, data: RTCSessionDescription }, RTCSessionDescription> ({
        from: user.id,
        to: message.from,
        data: connection.localDescription
    })

    console.info ('Answer sent successfully')
}

export { requestChat, acceptChat }
