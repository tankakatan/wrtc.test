import React from 'react'
import Chat from '~/Chat'
import Call from '~/Call'
import Contacts from '~/Contacts'
import { ProvideAppContext } from './Context'

import './index.css'

export default function App () {
    return (
        <ProvideAppContext>
            <Call/>
            <Chat/>
            <Contacts/>
        </ProvideAppContext>
    )
}
