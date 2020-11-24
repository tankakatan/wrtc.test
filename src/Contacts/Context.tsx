import React, { createContext, useContext, useState, useEffect } from 'react'
import Fp from '@fingerprintjs/fingerprintjs'
import api from '~/api'
import { useAppContext } from '~App/Context'

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
    const [ shouldStop, setShouldStop ] = useState<boolean> (false)
    const { user, setUser } = useAppContext ()

    useEffect (() => {
        void (async () => {
            if (!user || !user.id) {
                const { visitorId: id } = await (await Fp.load ()).get ()
                setUser (user => ({ ...user, id }))

            } else {
                const updateContacts = await api.register<{ id: string }, Contact> ({ id: user.id }, { timeout: 3600000 })
                setShouldStop (false)

                while (true) {
                    if (shouldStop) break

                    try {
                        const { data, done, error } = await updateContacts ()

                        if (error) throw error
                        if (done) break

                        setContacts (data)

                    } catch (e) {
                        console.error (e)
                        updateContacts.cancel ()
                        break
                    }
                }
            }
        }) ()

        return () => setShouldStop (true)
    }, [ user && user.id || null ])

    return <ContactsContext.Provider value={{ contacts }}>{ children }</ContactsContext.Provider>
}
