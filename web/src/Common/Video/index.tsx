import React, { useState, useRef, useCallback, useEffect } from 'react'

import './index.css'

export default function Video ({ stream = undefined as MediaStream, className = '', muted = false }) {

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

            if (muted) el.current.muted = true

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
                  onCanPlay={ onCanPlay }
                  muted={ muted }/>
}