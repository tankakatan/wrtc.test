import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { User, Message, ChatController } from 'Common'
import { requestChat, acceptChat } from '~/tunnel'
import api from '~/api'

const AppContext = createContext ({
    user: undefined as User,
    setUser: (() => {}) as (user: User | ((user: User) => User)) => void,
    chat: undefined as ChatController,
    startChat: (() => {}) as (recipient: User) => void,
})

export const useAppContext = () => useContext (AppContext)

export const ProvideAppContext = ({ children = undefined as React.ReactNode }) => {

    const [ user, setUser ] = useState<User> (undefined)
    const [ chat, setChat ] = useState<ChatController> (undefined)

    const startChat = useCallback (async (recipient) => {
        try {
            const chat = await requestChat (user, recipient)
            setChat (chat)

        } catch (e) {
            console.error ('Error starting a chat:', e)
        }

    }, [ user ])

    const awaitForChat = useCallback (async () => {
        if (!user) return

        const nextOffer = await api.sdp<undefined, RTCSessionDescription> (undefined)

        while (true) {
            try {
                const { error, done, ...message } = await nextOffer ()

                if (error) throw error
                if (done) break
                if (message.data && message.data.type !== 'offer') continue

                try {
                    const chat = await acceptChat (user, message as Message)
                    setChat (chat)

                } catch (e) {
                    console.error ('Error accepting a chat', e)
                }

            } catch (e) {
                console.error ('Chat offer error:', e)
                break
            }
        }
    }, [ user ])

    useEffect (() => { awaitForChat () }, [ awaitForChat ])

    const context = {
        user,
        setUser,
        chat,
        startChat,
    }

    return (<AppContext.Provider value={ context }>{ children }</AppContext.Provider>)
}
