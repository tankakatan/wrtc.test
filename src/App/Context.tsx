import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import WebTorrent from 'webtorrent'
import { Promised } from 'Common'
import content = require

const AppContext = createContext ({
    offer: undefined as string,
    answerError: undefined as Error,
    copied: false,
    ready: false,
    getSdp: (() => {}) as (_: React.MouseEvent) => void,
    streams: {} as { [key: string]: MediaStream },
    handleAnswer: (() => {}) as (_: React.ChangeEvent<HTMLInputElement>) => void,
})

export const useAppContext = () => useContext (AppContext)

export const ProvideAppContext = ({ children = undefined as React.ReactNode }) => {

    const [connection, setConnection] = useState<RTCPeerConnection> (null)
    const [copied, setCopied] = useState (false)
    const [answerError, setAnswerError] = useState<Error> (undefined)
    const [ready, setReady] = useState (false)
    const [streams, setStreams] = useState<{ [key: string]: MediaStream }> ({})

    const query = document.location.search
                                   .slice (1)
                                   .split ('&')
                                   .map (str => str.split ('='))
                                   .reduce (
                                       (q, p: [string, string]) => ({ ...q, [p[0]]: p[1] }),
                                       {} as { offer: string, answer: string })

    // window.history.replaceState (window.history.state, document.title, window.location.origin)

    const offer = 'offer' in query ? atob (decodeURIComponent (query.offer)) : undefined
    const getSdp = useCallback (async (e: React.MouseEvent) => {

        e.preventDefault ()

        if (copied) return

        // https://gist.github.com/loon3/6730c3187d5b84a6cbbb

        const filename = 'session_description.json'
        const blob = new Blob ([ JSON.stringify (content) ], { type: 'application/json' })
        const client = new WebTorrent ()
        const torrentPromise = Promised<WebTorrent.Torrent> ()

        client.seed (blob as File, { name: filename }, torrent => torrentPromise.resolve (torrent))
        client.on ('error', error => console.error ('Torrent client error:', error))

        const torrent: WebTorrent.Torrent = await torrentPromise
        console.log ('A torrent:', torrent.infoHash)
        // client.add (torrent.infoHash, (torrent) => {
        //     console.log ('added torrent')
        //     torrent.on ('wire', (wire) => {
        //         console.log ('Wire #2', wire)
        //     })
        // })

        torrent.on ('error', error => console.error ('Torrent error:', error))
        torrent.on ('wire', wire => {
            console.log ('Wire:', wire)
        })
        torrent.on

        await navigator.clipboard.writeText (
            `${ document.location.origin }/?offer=${ encodeURIComponent (btoa (torrent.magnetURI)) }`
        )
            // (offer ? '' : `${ document.location.origin }/?offer=`) +
            // encodeURIComponent (btoa (connection.localDescription.sdp)))

        setCopied (true)

    }, [connection, copied])

    useEffect (() => {
        void (async () => {
            try {
                const connection = new RTCPeerConnection ({})
                const stream = await navigator.mediaDevices.getUserMedia ({ video: true, audio: false })

                for (const track of stream.getTracks ()) {
                    connection.addTrack (track)
                }

                connection.ontrack = (e: RTCTrackEvent) => {

                    console.log ({ e })
                    let [stream] = e.streams
                    if (!stream) {
                        stream = new MediaStream ()
                        stream.addTrack (e.track)
                    }

                    setStreams (streams => ({ ...streams, [stream.id]: stream }))
                }

                connection.oniceconnectionstatechange = () => {
                    console.info ('Connection state:', connection.iceConnectionState)
                }

                if (offer) {

                    console.log ('Offer:', offer)

                    const client = new WebTorrent ()
                    const torrentPromise = Promised<WebTorrent.Torrent> ()

                    console.log ('Torrent client:', client)

                    client.add (offer, torrent => (console.log ('T:', torrent), torrentPromise.resolve (torrent)))
                    client.on ('error', error => console.error ('Torrent client error:', error))
                    client.on ('torrent', torrent => console.info ('Torrent:', torrent))

                    const torrent = await torrentPromise

                    console.log ('Torrent:', torrent)

                    torrent.on ('wire', wire => {
                        console.log ('Wire:', wire)
                    })

                    return

                    await connection.setRemoteDescription (new RTCSessionDescription ({ type: 'offer', sdp: offer }))
                    await connection.setLocalDescription (await connection.createAnswer ())
                    connection.ondatachannel = (e: RTCDataChannelEvent) => {
                        e.channel.onopen = () => console.log ('channel is open')
                        e.channel.onerror = (e: RTCErrorEvent) => console.error ('data channel error:', e)
                        e.channel.onmessage = (e: MessageEvent) => console.info ('message received', e.data)
                    }

                } else {
                    const channel = connection.createDataChannel ('chat')
                    channel.onopen = () => console.log ('chopen')
                    channel.onerror = (e: RTCErrorEvent) => console.error ('cherror:', e)
                    channel.onmessage = (e: MessageEvent) => console.info ('chmessage:', e.data)

                    await connection.setLocalDescription (await connection.createOffer ())
                }

                const promise = Promised ()
                connection.onicecandidate = promise.resolve
                await promise

                setConnection (connection)
                setStreams (streams => ({ ...streams, [stream.id]: stream }))
                setReady (true)

            } catch (e) {
                console.error ('Connecton error:', e)

                if (connection) {
                    connection.close ()
                    setConnection (null)
                }
            }
        }) ()
    }, [])

    const handleAnswer = useCallback (async (e: React.ChangeEvent<HTMLInputElement>) => {

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

    const context = {
        offer,
        answerError,
        handleAnswer,
        ready,
        copied,
        getSdp,
        streams,
    }

    return (<AppContext.Provider value={ context }>{ children }</AppContext.Provider>)
}
