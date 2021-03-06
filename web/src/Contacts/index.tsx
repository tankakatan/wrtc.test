import React from 'react'
import { useAppContext } from '~/App/Context'
import ProvideContactsContext, { useContactsContext } from './Context'
import './index.css'

function Contacts () {
    const { user, startChat } = useAppContext ()
    const { contacts = {} } = useContactsContext ()

    return (
        <ul>
            {
                Object.values (contacts).map (c =>
                    <li key={ c.id } onClick={ () => startChat (c) }>
                        { `${ c.name || c.id } (${ user && c.id === user.id ? 'you' : 'online' })` }
                    </li>
                )
            }
        </ul>
    )
}

export default function (): React.ReactElement {
    return <ProvideContactsContext><Contacts /></ProvideContactsContext>
}
