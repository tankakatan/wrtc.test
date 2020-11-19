import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Promised } from 'Common'
import Fp from '@fingerprintjs/fingerprintjs'

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
    const [offering, setOffering] = useState<boolean> (false)

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

        setCopied (true)

    }, [connection, copied])

    useEffect (() => {
        void (async () => {
            try {
                const connection = new RTCPeerConnection ({ iceServers: [
                    { urls: 'stun:turn.neodequate.com' }
                ] })
                // const signaler = new SignalingChannel ()
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
                    if (connection.iceConnectionState === 'failed') {
                        connection.restartIce ()
                    }
                }

                connection.onnegotiationneeded = async () => {
                    try {
                        setOffering (true)
                        await connection.setLocalDescription ()
                        const fp = await (await Fp.load ()).get ()

                        const socket = new WebSocket ('ws://localhost:5976')
                        socket.onopen = () => {
                            socket.send (JSON.stringify (fp))
                        }
                        // signaler.send ({ description: connection.localDescription })
                    } catch (e) {
                        console.error ('Description sending error:', e)
                    } finally {
                        setOffering (false)
                    }
                }

                connection.onicecandidate = async ({ candidate, ...props }) => {
                    console.info ('A candidate:', candidate, props)
                    if (candidate) {
                        try {
                            await connection.addIceCandidate (candidate)
                        } catch (e) {
                            console.error ('Candidate error:', e)
                        }
                    }
                    // signaler.send ({ candidate })
                }

                // signaler.onmessage = async ({ data: { candidate, description }}) => {

                //     if (candidate) {
                //         try {
                //             await connection.addIceCandidate (candidate)
                //         } catch (e) {
                //             console.error ('Candidate adding error:', e)
                //         } finally {
                //             return
                //         }
                //     }

                //     if (!description) return

                //     if (description.type === 'offer' && connection.signalingState === 'stable') {
                //         return // offer collision
                //     }

                //     try {
                //         await connection.setRemoteDescription (description)

                //         if (description.type === 'offer') {
                //             await connection.setLocalDescription () // answer
                //             signaler.send ({ description: connection.localDescription })
                //         }

                //     } catch (e) {
                //         console.error ('Remote description adding error:', e)
                //     }
                // }

                if (offer) {

                    return

                    await connection.setRemoteDescription (new RTCSessionDescription ({ type: 'offer', sdp: offer }))
                    await connection.setLocalDescription (await connection.createAnswer ())
                    connection.ondatachannel = (e: RTCDataChannelEvent) => {
                        e.channel.onopen = () => console.log ('channel is open')
                        e.channel.onerror = (e: RTCErrorEvent) => console.error ('data channel error:', e)
                        e.channel.onmessage = (e: MessageEvent) => console.info ('message received', e.data)
                    }

                } else {
                    // const channel = connection.createDataChannel ('chat')
                    // channel.onopen = () => console.log ('chopen')
                    // channel.onerror = (e: RTCErrorEvent) => console.error ('cherror:', e)
                    // channel.onmessage = (e: MessageEvent) => console.info ('chmessage:', e.data)

                    // await connection.setLocalDescription (await connection.createOffer ())
                }

                // const promise = Promised ()
                // connection.onicecandidate = promise.resolve
                // await promise

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
