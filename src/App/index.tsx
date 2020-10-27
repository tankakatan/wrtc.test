import React, { useRef, useCallback, useEffect, useState } from 'react'
import { Button } from 'Common'
import { ProvideAppContext, useAppContext } from './Context'

import './index.css'

function Video ({ stream = undefined as MediaStream, className = '' }) {

    const [playing, setPlaying] = useState (false)

    const el = useRef<HTMLVideoElement> (null)
    const onCanPlay = useCallback ((e: React.SyntheticEvent<HTMLVideoElement, Event>) => {

        const width = 320
        const video = e.currentTarget
        const height = video.videoHeight / (video.videoWidth / width)

        video.setAttribute ('width', `${ width }px`)
        video.setAttribute ('height', `${ height }px`)

    }, [ stream, playing ])

    useEffect (() => {
        if (playing || !stream ||!el.current) return

        void (async () => {
            el.current.srcObject = stream

            try {
                await el.current.play ()
            } catch (e) {
                console.info ('Play error:', e)
            }

        }) ()

    }, [ stream, playing ])

    return <video ref={ el }
                  onPlay={ () => setPlaying (true) }
                  onPause={ () => setPlaying (false) }
                  className={ className }
                  onCanPlay={ onCanPlay }/>
}

function Chat () {

    const { copied, offer, streams, ready, answerError, getSdp, handleAnswer } = useAppContext ()
    const buttonText = copied ? 'copied!' : offer ? 'get RSVP' : 'get invite link'

    return (
        <div className='box'>
            <div className='chat'>
                { Object.values (streams).map ((stream: MediaStream) => <Video key={ stream.id } stream={ stream }/>) }
            </div>
            <Button className={ copied || !ready ? 'disabled' : '' } onClick={ getSdp }>{ buttonText }</Button>
            <div>
            {
                copied && !offer ? (
                    <input
                        className={ 'answer-input' + (answerError ? ' error' : '') }
                        type='text'
                        placeholder='Paste answer here'
                        onChange={ handleAnswer }
                    />
                ) : null
            }
            { answerError ? <span className='anwer-error-text'>{ answerError.message }</span> : null }
            </div>
        </div>
    )
}

export default function App () {
    return <ProvideAppContext><Chat/></ProvideAppContext>
}
