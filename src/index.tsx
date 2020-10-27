import ReactDom from 'react-dom'
import React, {
    useRef,
    useState,
    useEffect,
    useCallback,
} from 'react'

import './reset.css'
import './index.css'

const width = 320
const Promised = () => {
    let resolve, reject
    const promise = new Promise ((res, rej) => { resolve = res; reject = rej })
    return Object.assign (promise, { resolve, reject } as {
        resolve: (_?: any) => undefined
        reject: (_?: any) => undefined
    })
}

const App = () => {

    const userVideo = useRef (null)
    const otherVideo = useRef (null)
    const image = useRef (null)
    const canvas = useRef (null)

    const [streaming, setStreaming] = useState ({ user: false, other: false })
    const [connection, setConnection] = useState (null)
    const [copied, setCopied] = useState (false)
    const [answerError, setAnswerError] = useState<Error> (null)
    const [enableExchange, setEnableExchange] = useState (false)

    const query = document.location.search
                                   .slice (1)
                                   .split ('&')
                                   .map (str => str.split ('='))
                                   .reduce ((q, p: [string, string]) => ({ ...q,
                                       [p[0]]: p[1] }), {} as { offer: string, answer: string })

    // window.history.replaceState (window.history.state, document.title, window.location.origin)

    const offer = 'offer' in query ? atob (decodeURIComponent (query.offer)) : undefined
    const takeAShot = useCallback ((e: React.MouseEvent) => {

        e.preventDefault ()

        const context = canvas.current.getContext ('2d')

        context.drawImage (userVideo.current, 0, 0, canvas.current.width, canvas.current.height)
        image.current.setAttribute ('src', canvas.current.toDataURL ('image/png'))

    }, [ canvas, userVideo ])

    const onCanPlay = useCallback ((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {

        const which = e.currentTarget.id.split ('-')[0] as 'user' | 'other'

        if (streaming[which] === true) return

        const video = e.currentTarget
        const height = video.videoHeight / (video.videoWidth / width)

        video.setAttribute ('width', width + 'px')
        video.setAttribute ('height', height + 'px')

        canvas.current.setAttribute ('width', width)
        canvas.current.setAttribute ('height', height)
        canvas.current
              .getContext ('2d')
              .setTransform (-1, 0, 0, 1, canvas.current.width, 0)

        setStreaming ({ ...streaming, [which]: true })

    }, [ canvas, userVideo ])

    const getALink = useCallback (async (e: React.MouseEvent) => {

        e.preventDefault ()

        if (copied) return

        await navigator.clipboard.writeText (
            (offer ? `` : `${ document.location.origin }/?offer=`) +
            encodeURIComponent (btoa (connection.localDescription.sdp)))

        setCopied (true)

    }, [ connection, copied ])

    useEffect (() => {
        void (async () => {
            try {
                try {
                    const context = canvas.current.getContext ('2d')

                    context.fillStyle = '#0000'
                    context.fillRect (0, 0, canvas.current.width, canvas.current.height)

                    image.current.setAttribute ('src', canvas.current.toDataURL ('image/png'))

                } catch (e) {
                    console.error ('Canvas error:', e)
                }

                try {
                    const connection = new RTCPeerConnection ({})

                    setConnection (connection)

                    const stream = await navigator.mediaDevices.getUserMedia ({ video: true, audio: false })
                    userVideo.current.srcObject = stream
                    userVideo.current.play ()

                    for (const track of stream.getTracks ()) connection.addTrack (track)

                    connection.ontrack = (e: RTCTrackEvent) => {
                        let [stream] = e.streams
                        if (!stream) {
                            stream = new MediaStream ()
                            stream.addTrack (e.track)
                        }

                        otherVideo.current.srcObject = stream
                        otherVideo.current.play ()
                    }

                    connection.oniceconnectionstatechange = (e: Event) => {
                        console.info ('Connection state:', connection.iceConnectionState)
                    }

                    if (offer) {
                        await connection.setRemoteDescription (new RTCSessionDescription ({ type: 'offer', sdp: offer }))
                        await connection.setLocalDescription (await connection.createAnswer ())
                        connection.ondatachannel = (e: RTCDataChannelEvent) => {
                            e.channel.onopen = () => console.log ('channel is open')
                            e.channel.onerror = (e: RTCErrorEvent) => console.error ('data channel error:', e)
                            e.channel.onmessage = (e: MessageEvent) => console.info ('message received', e.data)
                        }

                    } else {
                        const channel = await connection.createDataChannel ('chat')
                        channel.onopen = () => console.log ('chopen')
                        channel.onerror = (e: RTCErrorEvent) => console.error ('cherror:', e)
                        channel.onmessage = (e: MessageEvent) => console.info ('chmessage:', e.data)

                        await connection.setLocalDescription (await connection.createOffer ())
                    }

                    const promise = Promised ()
                    connection.onicecandidate = promise.resolve
                    await promise

                    setEnableExchange (true)

                } catch (e) {
                    console.error ('Connecton error:', e)
                }

            } catch (e) {
                console.error ('User media error:', e)
            }
        }) ()
    }, [])

    const onAnswer = useCallback (async (e: React.ChangeEvent<HTMLInputElement>) => {

        setAnswerError (null)

        if (!e.target.value) return

        try {
            await connection.setRemoteDescription (new RTCSessionDescription ({
                type: 'answer',
                sdp: atob (decodeURIComponent (e.target.value))
            }))

        } catch (e) {
            setAnswerError (e)
        }

    }, [ connection ])

    const buttonText = copied ? 'copied!' : offer ? 'get RSVP' : 'get invite link'

    return (
        <div className='box'>
            <div className='chat'>
                <video ref={ userVideo } id='user-video' onCanPlay={ onCanPlay }/>
                <video ref={ otherVideo } id='other-video' onCanPlay={ onCanPlay } muted/>
            </div>
            <Button onClick={ takeAShot }>Take a shot</Button>
            <div id='output'>
                <canvas ref={ canvas } id='canvas'/>
                <img ref={ image } id='image' alt='Screen shot will appear in thin box.'/>
            </div>
            <Button className={ copied || !enableExchange ? 'disabled' : '' } onClick={ getALink }>{ buttonText }</Button>
            <div>
            {
                copied && !offer ? (
                    <input
                        className={ 'answer-input' + (answerError ? ' error' : '') }
                        type='text'
                        placeholder='Paste answer here'
                        onChange={ onAnswer }
                    />
                ) : null
            }
            { answerError ? <span className='anwer-error-text'>{ answerError.message }</span> : null }
            </div>
        </div>
    )
}

const Button = ({ className = '', onClick = (_: React.MouseEvent) => {}, children = undefined as React.ReactNode }) => (
    <a href='#' onClick={ onClick } className={ 'button' + (className ? (' ' + className) : '') }>
        { children }
    </a>
)

ReactDom.render (<App/>, document.getElementById ('root'))
