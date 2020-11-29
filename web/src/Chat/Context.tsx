import React, { createContext, useContext, useEffect, useCallback, useState } from 'react'
import { useAppContext } from '~App/Context'
import { ChatMessage } from 'shared'

const ChatContext = createContext ({
    history: undefined as ChatMessage[],
    postMessage: (() => {}) as (message: string) => void,
})

export const useChatContext = () => useContext (ChatContext)

export default function ProvideChatContext ({ children }: { children: React.ReactNode }) {
    const [ history, setHistory ] = useState<Array<ChatMessage>> (undefined)
    const { chat } = useAppContext ()

    const pushMessage = useCallback ((message: ChatMessage) => {
        if (chat) setHistory ((history) => history.concat ([ message ]))
    }, [ chat ])

    const postMessage = useCallback ((message: string) => {
        if (chat) pushMessage (chat.send (message))
    }, [ chat ])

    useEffect (() => {
        if (!chat) return
        if (!history) setHistory ([])

        ;(async () => {
            while (true) {
                try {
                    const message = await chat.message ()

                    if (message.done) {
                        console.info ('Chat did end')
                        break
                    }

                    pushMessage (message.data)

                } catch (e) {
                    console.error ('Chat error:', e)
                    chat.end ()
                    break
                }
            }
        }) ()
    }, [ chat ])

    const context = {
        history,
        postMessage,
    }

    return <ChatContext.Provider value={ context }>{ children }</ChatContext.Provider>
}
