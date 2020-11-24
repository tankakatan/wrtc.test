import React, { createContext, useContext, useState } from 'react'

type User = {
    id: string,
    name?: string,
    status: 'online' | 'offline' | 'error',
    error?: Error,
}

const AppContext = createContext ({
    user: undefined as User,
    setUser: (() => {}) as (user: User | ((user: User) => User)) => void,
    recipient: undefined as User,
    setRecipient: (() => {}) as (user: User | ((user: User) => User)) => void,
})

export const useAppContext = () => useContext (AppContext)

export const ProvideAppContext = ({ children = undefined as React.ReactNode }) => {

    const [ user, setUser ] = useState<User> (undefined)
    const [ recipient, setRecipient ] = useState<User> (undefined)

    // const query = document.location.search
    //                                .slice (1)
    //                                .split ('&')
    //                                .map (str => str.split ('='))
    //                                .reduce (
    //                                    (q, p: [string, string]) => ({ ...q, [p[0]]: p[1] }),
    //                                    {} as { offer: string, answer: string })

    // window.history.replaceState (window.history.state, document.title, window.location.origin)

    // const offer = 'offer' in query ? atob (decodeURIComponent (query.offer)) : undefined
    // const getSdp = useCallback (async (e: React.MouseEvent) => {

    //     e.preventDefault ()

    //     if (copied) return

    //     setCopied (true)

    // }, [connection, copied])

    // useEffect (() => {
    //     void (async () => {
    //         try {
    //             const connection = new RTCPeerConnection ({ iceServers: [
    //                 { urls: 'stun:turn.neodequate.com' }
    //             ] })
    //             // const signaler = new SignalingChannel ()
    //             const stream = await navigator.mediaDevices.getUserMedia ({ video: true, audio: false })

    //             for (const track of stream.getTracks ()) {
    //                 connection.addTrack (track)
    //             }

    //             connection.ontrack = (e: RTCTrackEvent) => {

    //                 console.log ({ e })
    //                 let [stream] = e.streams
    //                 if (!stream) {
    //                     stream = new MediaStream ()
    //                     stream.addTrack (e.track)
    //                 }

    //                 setStreams (streams => ({ ...streams, [stream.id]: stream }))
    //             }

    //             connection.oniceconnectionstatechange = () => {
    //                 if (connection.iceConnectionState === 'failed') {
    //                     connection.restartIce ()
    //                 }
    //             }

    //             connection.onnegotiationneeded = async () => {
    //                 try {
    //                     setOffering (true)
    //                     await connection.setLocalDescription ()

    //                     const socket = new WebSocket ('ws://localhost:5976')
    //                     socket.onopen = () => {
    //                         socket.send (JSON.stringify (fp))
    //                     }
    //                     // signaler.send ({ description: connection.localDescription })
    //                 } catch (e) {
    //                     console.error ('Description sending error:', e)
    //                 } finally {
    //                     setOffering (false)
    //                 }
    //             }

    //             connection.onicecandidate = async ({ candidate, ...props }) => {
    //                 console.info ('A candidate:', candidate, props)
    //                 if (candidate) {
    //                     try {
    //                         await connection.addIceCandidate (candidate)
    //                     } catch (e) {
    //                         console.error ('Candidate error:', e)
    //                     }
    //                 }
    //                 // signaler.send ({ candidate })
    //             }

    //             // signaler.onmessage = async ({ data: { candidate, description }}) => {

    //             //     if (candidate) {
    //             //         try {
    //             //             await connection.addIceCandidate (candidate)
    //             //         } catch (e) {
    //             //             console.error ('Candidate adding error:', e)
    //             //         } finally {
    //             //             return
    //             //         }
    //             //     }

    //             //     if (!description) return

    //             //     if (description.type === 'offer' && connection.signalingState === 'stable') {
    //             //         return // offer collision
    //             //     }

    //             //     try {
    //             //         await connection.setRemoteDescription (description)

    //             //         if (description.type === 'offer') {
    //             //             await connection.setLocalDescription () // answer
    //             //             signaler.send ({ description: connection.localDescription })
    //             //         }

    //             //     } catch (e) {
    //             //         console.error ('Remote description adding error:', e)
    //             //     }
    //             // }

    //             if (offer) {

    //                 return

    //                 await connection.setRemoteDescription (new RTCSessionDescription ({ type: 'offer', sdp: offer }))
    //                 await connection.setLocalDescription (await connection.createAnswer ())
    //                 connection.ondatachannel = (e: RTCDataChannelEvent) => {
    //                     e.channel.onopen = () => console.log ('channel is open')
    //                     e.channel.onerror = (e: RTCErrorEvent) => console.error ('data channel error:', e)
    //                     e.channel.onmessage = (e: MessageEvent) => console.info ('message received', e.data)
    //                 }

    //             } else {
    //                 // const channel = connection.createDataChannel ('chat')
    //                 // channel.onopen = () => console.log ('chopen')
    //                 // channel.onerror = (e: RTCErrorEvent) => console.error ('cherror:', e)
    //                 // channel.onmessage = (e: MessageEvent) => console.info ('chmessage:', e.data)

    //                 // await connection.setLocalDescription (await connection.createOffer ())
    //             }

    //             // const promise = Promised ()
    //             // connection.onicecandidate = promise.resolve
    //             // await promise

    //             setConnection (connection)
    //             setStreams (streams => ({ ...streams, [stream.id]: stream }))
    //             setReady (true)

    //         } catch (e) {
    //             console.error ('Connecton error:', e)

    //             if (connection) {
    //                 connection.close ()
    //                 setConnection (null)
    //             }
    //         }
    //     }) ()
    // }, [])

    // const handleAnswer = useCallback (async (e: React.ChangeEvent<HTMLInputElement>) => {

    //     setAnswerError (null)

    //     if (!e.target.value) return

    //     try {
    //         await connection.setRemoteDescription (new RTCSessionDescription ({
    //             type: 'answer',
    //             sdp: atob (decodeURIComponent (e.target.value))
    //         }))

    //     } catch (e) {
    //         setAnswerError (e)
    //     }

    // }, [ connection ])

    const context = {
        user,
        setUser,
        recipient,
        setRecipient,
    }

    return (<AppContext.Provider value={ context }>{ children }</AppContext.Provider>)
}
