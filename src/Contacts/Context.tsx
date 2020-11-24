import React, { createContext, useContext, useState, useEffect } from 'react'
import Fp from '@fingerprintjs/fingerprintjs'
import api from '~/api'
import { useAppContext } from '~App/Context'
import { User } from 'Common'

type Contact = {
    id: string,
    name?: string,
    status: 'online' | 'offline' | 'error',
}

const ContactsContext = createContext ({
    contacts: [] as Contact[],
})

export function useContactsContext () {
    return useContext (ContactsContext)
}

export default function ProvideContactsContext ({ children = null }: { children: React.ReactNode }) {
    const [ contacts, setContacts ] = useState<Contact[]> ([])
    const [ shouldStop, setShouldStop ] = useState<boolean> (false) // To do: this is a boolshit
    const { user, setUser } = useAppContext ()

    useEffect (() => {
        void (async () => {
            if (!user || !user.id) {
                const { visitorId: id } = await (await Fp.load ()).get ()
                setUser (user => ({ ...user, id }))

            } else {
                const next = await api.register<{ from: string, data: User }, { register: Contact[] }> (
                    { from: user.id, data: user },
                    { timeout: 3600000 }
                )

                setShouldStop (false)

                while (true) {
                    if (shouldStop) break

                    try {
                        const { data, error, done } = await next ()

                        if (error) throw new Error (error)
                        if (done) break

                        setContacts (data.register)

                    } catch (e) {
                        console.error (e)
                        next.cancel ()
                        break
                    }
                }
            }
        }) ()

        return () => setShouldStop (true)
    }, [ user && user.id || null ])

    return <ContactsContext.Provider value={{ contacts }}>{ children }</ContactsContext.Provider>
}
