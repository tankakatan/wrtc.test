import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { User, ChatController } from 'shared'
import { requestChat, awaitForChat } from '~/tunnel'

const AppContext = createContext ({
    user: undefined as User,
    setUser: (() => {}) as (user: User | ((user: User) => User)) => void,
    startChat: (() => {}) as (recipient: User) => void,
    chat: undefined as ChatController,
})

export const useAppContext = () => useContext (AppContext)

export const ProvideAppContext = ({ children = undefined as React.ReactNode }) => {

    const [ user, setUser ] = useState<User> (undefined)
    const [ chat, setChat ] = useState<ChatController> (undefined)

    const startChat = useCallback (async (recipient) => {
        try {
            console.log ({recipient})
            setChat (await requestChat (user.id, recipient.id))
        } catch (e) {
            console.error ('Error starting a chat:', e)
        }

    }, [ user ])

    useEffect (() => {
        if (!user) return

        void (async () => {
            try {
                setChat (await awaitForChat (user.id))
            } catch (e) {
                console.error ('Error receiving a chat:', e)
            }
        }) ()

    }, [ user ])

    const context = {
        user,
        setUser,
        chat,
        startChat,
    }

    return <AppContext.Provider value={ context }>{ children }</AppContext.Provider>
}
