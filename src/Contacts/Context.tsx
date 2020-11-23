import React, { createContext, useContext, useState, useEffect } from 'react'
import Fp from '@fingerprintjs/fingerprintjs'
import api from '~/api'

type Contact = {
    id: string,
    name?: string,
    status: 'online' | 'offline' | 'error',
}

const ContactsContext = createContext ({
    self: {} as Contact,
    contacts: [] as Contact[],
})

export function useContactsContext () {
    return useContext (ContactsContext)
}

export default function ProvideContactsContext ({ children = null }: { children: React.ReactNode }) {
    const [contacts, setContacts] = useState<Contact[]> ([])
    const [self, setSelf] = useState<Contact> ({
        id: undefined,
        status: 'online'
    })

    useEffect (() => {
        void (async () => {

            if (!self.id) {
                const { visitorId: id } = await (await Fp.load ()).get ()
                setSelf (self => ({ ...self, id }))

            } else {
                const next = await api.register<{ id: string }, Contact> ({ id: self.id }, { timeout: 3600000 })

                while (true) {
                    try {
                        const { data, done, error } = await next ()

                        if (error) throw error
                        if (done) break

                        console.log ({ data, done, error })
                        setContacts (data)

                    } catch (e) {
                        console.error (e)
                        break
                    }
                }
            }
        }) ()
    }, [ self.id ])

    return <ContactsContext.Provider value={{ self, contacts }}>{ children }</ContactsContext.Provider>
}