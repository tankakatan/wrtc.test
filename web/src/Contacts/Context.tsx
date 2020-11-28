import React, { createContext, useContext, useState, useEffect } from 'react'
import Fp from '@fingerprintjs/fingerprintjs'
import api from '~/api'
import { useAppContext } from '~App/Context'
import { ContactList, User, SignalingMessage } from 'Common'

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
                const next = await api.register<SignalingMessage<User>, ContactList> (
                    { from: user.id, payload: user },
                    { timeout: 3600000 }
                )

                while (true) {
                    try {
                        const { data, error, done } = await next ()

                        if (error) throw new Error (error)
                        if (done) break

                        console.log ({ data })

                        setContacts (data.message.payload)

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
