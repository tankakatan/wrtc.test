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

const App = () => {

    const video = useRef (null)
    const image = useRef (null)
    const canvas = useRef (null)

    const [streaming, setStreaming] = useState (false)
    const [connection, setConnection] = useState (null)
    const [copied, setCopied] = useState (false)

    const query = document.location.search
                                   .slice (1)
                                   .split ('&')
                                   .map (str => str.split ('='))
                                   .reduce ((q, p: [string, string]) => ({ ...q,
                                       [p[0]]: p[1] }), {} as { offer: string, answer: string })

    // window.history.replaceState (window.history.state, document.title, window.location.origin)

    const offer = 'offer' in query ? atob (decodeURIComponent (query.offer)) : undefined
    const answer = 'answer' in query ? atob (decodeURIComponent (query.answer)) : undefined

    const takeAShot = useCallback ((e: React.MouseEvent) => {

        e.preventDefault ()

        const context = canvas.current.getContext ('2d')

        context.drawImage (video.current, 0, 0, canvas.current.width, canvas.current.height)
        image.current.setAttribute ('src', canvas.current.toDataURL ('image/png'))

    }, [ canvas, video ])

    const onCanPlay = useCallback (() => {

        if (streaming === true) return

        const height = video.current.videoHeight / (video.current.videoWidth / width)

        video.current.setAttribute ('width', width)
        video.current.setAttribute ('height', height)

        canvas.current.setAttribute ('width', width)
        canvas.current.setAttribute ('height', height)
        canvas.current
              .getContext ('2d')
              .setTransform (-1, 0, 0, 1, canvas.current.width, 0)

        setStreaming (true)

    }, [ canvas, video ])

    const getALink = useCallback (async (e: React.MouseEvent) => {

        e.preventDefault ()

        if (copied) return

        if (!offer){
            connection.createDataChannel ('chat')
            const description = await connection.createOffer ()
            await connection.setLocalDescription (description)
        }

        await navigator.clipboard.writeText (`${
            document.location.origin
        }${
            offer ? `/?offer=${ encodeURIComponent (btoa (offer)) }&answer=` : `/?offer=`
        }${
            encodeURIComponent (btoa (connection.localDescription.sdp))
        }`)

        setCopied (true)

    }, [ connection, copied ])

    useEffect (() => {
        void (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia ({ video: true, audio: false })
                video.current.srcObject = stream
                video.current.play ()

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

                    if (!offer) return

                    await connection.setRemoteDescription (
                        new RTCSessionDescription ({
                            type: answer ? 'answer' : 'offer',
                            sdp: answer || offer }))

                    await connection.setLocalDescription (
                        answer ? new RTCSessionDescription ({ type: 'offer', sdp: offer })
                               : await connection.createAnswer ())

                } catch (e) {
                    console.error ('Connecton error:', e)
                }

            } catch (e) {
                console.error ('User media error:', e)
            }
        }) ()
    }, [])

    const buttonText = copied ? 'copied!' : offer ? 'get RSVP link' : 'get invite link'

    return (
        <div className='box'>
            <div className='camera'>
                <video ref={ video } id='video' onCanPlay={ onCanPlay }>
                    Video stream not available
                </video>
                <Button onClick={ takeAShot }>Take a shot</Button>
            </div>
            <div id='output'>
                <canvas ref={ canvas } id='canvas'/>
                <img ref={ image } id='image' alt='Screen shot will appear in thin box.'/>
            </div>
            <div id='offer-controls'>
                <Button className={ copied ? 'disabled' : '' } onClick={ getALink }>{ buttonText }</Button>
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
