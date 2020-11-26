import { User, Message, Promised, PromisedType, ChatMessage, DataController, MediaController, ChatController } from 'Common'
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

async function initDataController (channel: RTCDataChannel, sender: User, recipient: User): Promise<DataController> {
    let message = undefined as PromisedType<{ data: ChatMessage, done: boolean }>

    const refresh = () => message = Promised ()
    const send = (message: string) => {
        const chatMessage = { timestamp: Date.now (), message, sender, recipient } as ChatMessage
        channel.send (JSON.stringify (chatMessage))

        return chatMessage
    }

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

    return { message: () => message, send, end }
}

function initMediaController (connection: RTCPeerConnection): MediaController {
    let audio = undefined as RTCRtpSender
    let video = undefined as RTCRtpSender
    let stream = undefined as MediaStream
    let screen = undefined as RTCRtpSender
    let incomingStream = undefined as MediaStream
    let incomingStreamPromise = Promised () as PromisedType<MediaStream>

    const startVideoCall = async () => {
        const media = await navigator.mediaDevices.getUserMedia ({ audio: true, video: true })

        for (const track of media.getTracks ()) {
            if (track.kind === 'audio' && !audio) audio = connection.addTrack (track)
            if (track.kind === 'video' && !video) video = connection.addTrack (track)
        }

        if (!stream) {
            return stream = media
        }

        if (!stream.getAudioTracks ().length) {
            stream.addTrack (audio.track)
        }

        for (const track of stream.getVideoTracks ()) {
            stream.removeTrack (track)
        }

        stream.addTrack (video.track)

        return stream
    }

    const startCall = async () => {
        const media = await navigator.mediaDevices.getUserMedia ({ audio: audio ? true : false, video: false })

        for (const track of stream.getTracks ()) {
            if (track.kind === 'audio' && !audio) audio = connection.addTrack (track)
        }

        if (!stream) {
            return stream = media
        }

        for (const track of stream.getAudioTracks ()) {
            stream.removeTrack (track)
        }

        stream.addTrack (audio.track)

        return stream
    }

    const shareScreen = async () => {
        // @ts-ignore
        const stream = await navigator.mediaDevices.getDisplayMedia ()

        for (const track of stream.getTracks ()) {
            if (track.kind === 'video' && !screen) screen = connection.addTrack (track)
        }

        for (const track of stream.getVideoTracks ()) {
            stream.removeTrack (track)
        }

        stream.addTrack (screen.track)

        return stream
    }

    const muteAudio = () => audio.track.enabled = false
    const muteVideo = () => video.track.enabled = false
    const unmuteAudio = () => audio.track.enabled = true
    const unmuteVideo = () => video.track.enabled = true

    const endSharingScreen = () => {
        if (screen) {
            connection.removeTrack (screen)

            for (const track of stream.getVideoTracks ()) {
                stream.removeTrack (track)
            }

            if (video) {
                stream.addTrack (video.track)
            }

            screen.track.stop ()
            screen = undefined
        }
    }

    const endCall = () => {
        if (audio) {
            connection.removeTrack (audio)
            audio.track.stop ()
            audio = undefined
        }
        if (video) {
            connection.removeTrack (video)
            video.track.stop ()
            video = undefined
        }
    }

    connection.ontrack = (e: RTCTrackEvent) => {
        if (!incomingStream) {
            incomingStream = new MediaStream ()
            incomingStreamPromise.resolve (incomingStream)
        }

        incomingStream.addTrack (e.track)
    }

    return {
        media: () => incomingStreamPromise,
        startCall,
        startVideoCall,
        shareScreen,
        muteAudio,
        muteVideo,
        unmuteAudio,
        unmuteVideo,
        endSharingScreen,
        endCall,
    }
}

async function requestChat (sender: User, recipient: User): Promise<ChatController> {
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
    const dataController = await initDataController (channel, sender, recipient)

    return { ...dataController, ...initMediaController (connection) }
}

async function acceptChat (user: User, message: Message): Promise<ChatController> {
    const connection = await Tunnel (user.id, message.from)

    if (!message.data || message.data.type !== 'offer' || !message.data.sdp) {
        console.error ('Invalid handshake message', message)
    }

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

        const dataController = await initDataController (channel, user, { id: message.from, status: 'online' }) // TODO: elaborate on the recipient object

        return { ...dataController, ...initMediaController (connection) }

    } catch (e) {
        throw e
    }
}

export { requestChat, acceptChat }
