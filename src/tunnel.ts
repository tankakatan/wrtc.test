import { User, Message, Promised, PromisedType, ChatMessage } from 'Common'
import api from '~/api'

const host = 'turn.neodequate.com'
const port = ''

async function Tunnel (from: string, to: string) {
    const connection = new RTCPeerConnection ({
        iceServers: [{ urls: `stun:${ host }${ port ? `:${ port }` : `` }` }]
    })

    connection.oniceconnectionstatechange = () => {
        if (connection.iceConnectionState === 'failed') {
            // @ts-ignore
            connection.restartIce ()
        }
    }

    let candidateListEnd = false

    connection.onicecandidate = async (event: RTCPeerConnectionIceEvent) => {
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

        if (error) {
            console.error ('Ice candidate exchange error:', error)
        }

        if (done) {
            console.info ('Ice candidate exchange unexpectedly completed')
        }

        await connection.addIceCandidate (iceCandidate)
    }

    return connection
}

async function Chat (channel: RTCDataChannel, sender: User, recipient: User) {
    let message = undefined as PromisedType<{ data: ChatMessage, done: boolean }>

    const refresh = () => message = Promised ()
    const send = (message: string) => channel.send (
        JSON.stringify ({ timestamp: Date.now (), message, sender, recipient } as ChatMessage)
    )

    const end = () => channel.close ()

    try {
        await new Promise ((resolve, reject) => {
            channel.onerror = channel.onclose = reject
            channel.onopen = () => {
                resolve ()
                refresh ()
            }
        })

    } catch (e) {
        throw e
    }

    channel.onerror = (e: RTCErrorEvent) => message.reject (e.error)
    channel.onclose = () => message.resolve ({ data: undefined, done: true })
    channel.onmessage = (e: MessageEvent) => {
        message.resolve ({ data: JSON.parse (e.data), done: false })
        refresh ()
    }

    return { message, send, end }
}

async function requestChat (sender: User, recipient: User) {
    const connection = await Tunnel (sender.id, recipient.id)

    connection.onnegotiationneeded = async () => {
        await connection.setLocalDescription (await connection.createOffer ())

        const getAnswer = await api.sdp<{ from: string, to: string, data: RTCSessionDescription }, RTCSessionDescription> ({
            from: sender.id,
            to: recipient.id,
            data: connection.localDescription
        })

        const { data: answer, error, done } = await getAnswer ()

        if (error) {
            console.error ('Handshake error:', error)
            throw error
        }

        if (done) {
            console.info ('Handshake unexpectedly completed', answer)
        }

        await connection.setRemoteDescription (answer)
    }

    const channel = await connection.createDataChannel (`${ sender.id }-${ recipient.id }`)

    return Chat (channel, sender, recipient)
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

    try {
        const channel = await new Promise ((resolve, reject) => {
            connection.ondatachannel = (e: RTCDataChannelEvent) => {
                resolve (e.channel)
            }

            const timeout = setTimeout (() => {
                clearTimeout (timeout)
                reject (new Error ('Data channel timeout'))
            }, 60000)
        }) as RTCDataChannel

        return Chat (channel, user, { id: message.from, status: 'online' }) // TODO: elaborate on the recipient object

    } catch (e) {
        throw e
    }
}

export { requestChat, acceptChat }
