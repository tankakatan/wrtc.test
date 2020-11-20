import React from 'react'
import ProvideContactsContext, { useContactsContext } from './Context'
import './index.css'

function ContactList () {
    const { contacts } = useContactsContext ()
    return (
        <ul>
            { contacts.map (c => <li key={ c.id }>{ `${c.name || c.id} (${ c.status })` }</li>)}
        </ul>
    )
}

export default function Contacts (): React.ReactElement {
    return <ProvideContactsContext><ContactList/></ProvideContactsContext>
}
