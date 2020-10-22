import React, { useState, useEffect, useRef } from 'react'
import ReactDom from 'react-dom'

const width = 320

const App = () => {

    const video = useRef (null)
    const image = useRef (null)
    const canvas = useRef (null)

    const [streaming, setStreaming] = useState (false)

    useEffect (() => {
        void (async () => {

            try {

                const stream = await navigator.mediaDevices.getUserMedia ({ video: true, audio: false })
                video.current.srcObject = stream
                video.current.play ()

                try {

                    const context = canvas.current.getContext ('2d')
                    context.fillStyle = '#AAA'
                    context.fillRect (0, 0, canvas.current.width, canvas.current.height)

                    image.current.setAttribute ('src', canvas.current.toDataURL ('image/png'))

                } catch (e) {

                    console.error ('Canvas error:', e)
                }

            } catch (e) {

                console.error ('User media error:', e)
            }

        }) ()
    }, [])

    return (
        <div className='box'>
            <div className='camera'>
                <video
                    ref={ video }
                    id='video'
                    onCanPlay={ () => {

                        if (streaming === true) return

                        const height = video.current.videoHeight / (video.current.videoWidth / width)

                        video.current.setAttribute ('width', width)
                        video.current.setAttribute ('height', height)
                        canvas.current.setAttribute ('width', width)
                        canvas.current.setAttribute ('height', height)

                        setStreaming (true)
                    } }
                >
                    Video stream not available
                </video>
                <a
                    title='Take a shot'
                    href='#'
                    onClick={ () => {

                        const context = canvas.current.getContext ('2d')
                        context.drawImage (video.current, 0, 0, canvas.current.width, canvas.current.height)

                        image.current.setAttribute ('src', canvas.current.toDataURL ('image/png'))
                    } }
                >
                    Take a shot
                </a>
            </div>
            <canvas ref={ canvas } id='canvas'/>
            <div id='output'>
                <img ref={ image } id='image' alt='Screen shot will appear in thin box.'/>
            </div>
        </div>
    )
}

ReactDom.render (<App/>, document.getElementById ('root'))
