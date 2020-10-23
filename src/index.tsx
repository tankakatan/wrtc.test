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
    const [offerButtonText, setOfferButtonText] = useState ('make an offer')

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

    const makeAnOffer = useCallback (async (e: React.MouseEvent) => {

        e.preventDefault ()

        connection.createDataChannel ('chat')
        const description = await connection.createOffer ()

        await connection.setLocalDescription (description)
        await navigator.clipboard.writeText (connection.localDescription.sdp)

        setOfferButtonText ('copied')

    }, [ connection ])

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
                    setConnection (new RTCPeerConnection ({}))

                } catch (e) {
                    console.error ('Connecton error:', e)
                }

            } catch (e) {
                console.error ('User media error:', e)
            }
        }) ()
    }, [])

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
            <div>
                <Button onClick={ makeAnOffer }>{ offerButtonText }</Button>
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
