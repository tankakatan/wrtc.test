import React from 'react'
import { useAppContext } from '~/App/Context'
import ProvideContactsContext, { useContactsContext } from './Context'
import './index.css'

function ContactList () {
    const { user, startChat } = useAppContext ()
    const { contacts } = useContactsContext ()

    return (
        <ul>
            {
                contacts.map (c =>
                    <li key={ c.id } onClick={ () => startChat (c) }>
                        { `${ c.name || c.id } (${ user && c.id === user.id ? 'you' : c.status })` }
                    </li>
                )
            }
        </ul>
    )
}

export default function Contacts (): React.ReactElement {
    return <ProvideContactsContext><ContactList/></ProvideContactsContext>
}
