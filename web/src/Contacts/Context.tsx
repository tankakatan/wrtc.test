import React, { createContext, useContext, useState, useEffect } from 'react'
import Fp from '@fingerprintjs/fingerprintjs'
import api from '~/api'
import { useAppContext } from '~App/Context'
import { ContactList, User, SignalingMessage } from 'shared'

const ContactsContext = createContext ({
    contacts: {} as ContactList,
})

export function useContactsContext () {
    return useContext (ContactsContext)
}

export default function ProvideContactsContext ({ children = null }: { children: React.ReactNode }) {
    const [ contacts, setContacts ] = useState<ContactList> ({})
    const { user, setUser } = useAppContext ()

    useEffect (() => {
        void (async () => {
            if (!user || !user.id) {
                const { visitorId: id } = await (await Fp.load ()).get ()
                setUser (user => ({ ...user, id }))

            } else {
                const next = await api.register<User, ContactList> (
                    { from: user.id, to: 'server', data: user },
                    { timeout: 3600000 }
                )

                while (true) {
                    try {
                        const { message } = await next ()

                        if (message.error) throw new Error (message.error)
                        if (message.done) break

                        setContacts (message.data)

                    } catch (e) {
                        console.error (e)
                        next.cancel ()
                        break
                    }
                }
            }
        }) ()
    }, [ user && user.id || null ])

    return <ContactsContext.Provider value={{ contacts }}>{ children }</ContactsContext.Provider>
}
