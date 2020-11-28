import api from '~/api'
import {
    User,
    UserId,
    Promised,
    PromisedType,
    ChatController,
    DataController,
    MediaController,
    SignalingMessage,
    ChatMessage,
} from 'shared'

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
        const getIceCandidate = await api.ice<SignalingMessage<RTCIceCandidate>, RTCIceCandidate> ({
            from, to, payload: event.candidate
        })

        const packet = await getIceCandidate ()

        if (packet.error) {
            console.error ('Ice candidate exchange error:', packet.error)
        }

        if (packet.done) {
            console.info ('Ice candidate exchange unexpectedly completed')
            return
        }

        const candidate = packet?.data?.message?.payload

        if (candidate === null) {
            if (candidateListEnd) return
            else candidateListEnd = true
        } else {
            candidateListEnd = false
        }

        await connection.addIceCandidate (candidate)
    }

    return connection
}

async function initDataController (channel: RTCDataChannel, sender: UserId, recipient: UserId): Promise<DataController> {
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
            console.log ('adding a track', track.kind, audio, video)
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

        const media = await navigator.mediaDevices.getUserMedia ({ audio: true, video: video ? true : false })

        for (const track of media.getTracks ()) {
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

        const getAnswer = await api.sdp<SignalingMessage<RTCSessionDescription>, RTCSessionDescription> ({
            from: sender.id,
            to: recipient.id,
            payload: connection.localDescription
        })

        const packet = await getAnswer ()

        if (packet.error) {
            console.error ('Handshake error:', packet.error)
            throw packet.error
        }

        if (packet.done) {
            console.info ('Handshake unexpectedly completed', packet)
            return
        }

        await connection.setRemoteDescription (packet.data.message.payload)
    }

    const channel = await connection.createDataChannel (`${ sender.id }-${ recipient.id }`)
    const dataController = await initDataController (channel, sender.id, recipient.id)

    return { ...dataController, ...initMediaController (connection) }
}

async function awaitForChat (user: User): Promise<ChatController> {
    let connection = undefined as RTCPeerConnection
    let chatController = Promised () as PromisedType<ChatController>

    ;(async () => {
        const nextOffer = await api.sdp<undefined, RTCSessionDescription> (undefined)

        while (true) {
            try {
                const packet = await nextOffer ()

                if (packet.error) throw packet.error
                if (packet.done) {
                    console.log ('Offer issuer is exhausted')
                    break
                }

                const { message } = packet.data

                if (!message.payload || message.payload.type !== 'offer' || !message.payload.sdp) {
                    continue
                }

                if (!connection || connection.connectionState !== 'connected') {
                    connection = await Tunnel (user.id, message.from)
                    connection.ondatachannel = async (e: RTCDataChannelEvent) => {
                        const dataController = await initDataController (e.channel, user.id, message.from)
                        chatController.resolve ({ ...dataController, ...initMediaController (connection) })
                    }
                }

                await connection.setRemoteDescription (message.payload)
                await connection.setLocalDescription (await connection.createAnswer ())
                await api.sdp<SignalingMessage<RTCSessionDescription>, RTCSessionDescription> ({
                    from: user.id,
                    to: message.from,
                    payload: connection.localDescription
                })

            } catch (e) {
                chatController.reject (e)
                break
            }
        }
    }) ()

    return chatController
}

export { requestChat, awaitForChat }
