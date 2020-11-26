import React, { useCallback, useState } from 'react'
import ProvideChatContext, { useChatContext } from '~/Chat/Context'
import { ChatMessage } from '~Common'

import './index.css'

function Chat () {
    const { history, postMessage, startCall, startVideoCall } = useChatContext ()
    const [ message, setMessage ] = useState<string> ('')

    const onKeyDown = useCallback ((e: React.KeyboardEvent) => {
        if (e.key !== 'Enter' || e.shiftKey === true) return

        e.preventDefault ()
        postMessage (message)
        setMessage ('')
        // @ts-ignore
        e.target.value = ''
    }, [ message ])

    const onChange = useCallback ((e: React.BaseSyntheticEvent) => {
        e.preventDefault ()
        setMessage (e.target.value)
    }, [])

    return Array.isArray (history) ? (
        <div>
            <ul>
                {
                    history.map (({ timestamp, sender, message}: ChatMessage) => (
                        <li key={ `${ timestamp }-${ sender.id }` }>
                            <span>{ message }</span>
                        </li>
                    ))
                }
            </ul>
            <div>
                <textarea onKeyDown={ onKeyDown } onChange={ onChange }></textarea>
            </div>
            <div>
                <a href='#' onClick={ startCall }>Call</a>
                <a href='#' onClick={ startVideoCall }>Video Call</a>
            </div>
        </div>
    ) : null
}

export default function (): React.ReactElement {
    return <ProvideChatContext><Chat/></ProvideChatContext>
}
