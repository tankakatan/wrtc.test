import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAppContext } from '~App/Context'

const CallContext = createContext ({
    inStream: undefined as MediaStream,
    outStream: undefined as MediaStream,
    startCall: () => {},
    startVideoCall: () => {},
    shareScreen: () => {},
})

export const useCallContext = () => useContext (CallContext)

export default function ProvideCallContext ({ children }: { children: React.ReactNode }) {
    const [ inStream, setInStream ] = useState<MediaStream> (undefined)
    const [ outStream, setOutStream ] = useState<MediaStream> (undefined)
    const { chat } = useAppContext ()

    const startCall = useCallback (async () => {
        if (chat) setInStream (await chat.startCall ())
    }, [ chat ])

    const startVideoCall = useCallback (async () => {
        if (!chat) return

        const call = await chat.startVideoCall ()

        if (!inStream) setInStream (call)

    }, [ chat, inStream ])

    const shareScreen = useCallback (async () => {
        if (!chat) return

        const screen = await chat.shareScreen ()

        if (!inStream) setInStream (screen)

    }, [ chat, inStream ])

    useEffect (() => {
        if (!chat) return

        void (async () => {
            try {
                setOutStream (await chat.media ())
            } catch (e) {
                console.error ('Incoming stream error:', e)
            }
        }) ()
    }, [ chat ])

    const context = {
        inStream,
        outStream,
        startCall,
        startVideoCall,
        shareScreen,
    }

    return <CallContext.Provider value={ context }>{ children }</CallContext.Provider>
}
