import React from 'react'
import { Video } from '~/Common'
import { useAppContext } from '~/App/Context'
import ProvideCallContext, { useCallContext } from './Context'

import './index.css'

function Call (): React.ReactElement {
    const { chat } = useAppContext ()
    const { inStream, outStream, startVoiceCall, startVideoCall, shareScreen } = useCallContext ()

    return chat ? (
        <div>
            { inStream ? <Video stream={ inStream }/> : null }
            { outStream ? <Video muted stream={ outStream }/> : null }
            {
                inStream || outStream ? null : (
                    <ul>
                        <li><a href='#' onClick={ startVoiceCall }>Voice call</a></li>
                        <li><a href='#' onClick={ startVideoCall }>Video call</a></li>
                        <li><a href='#' onClick={ shareScreen }>Share screen</a></li>
                    </ul>
                )
            }
        </div>
    ) : null
}

export default function () {
    return <ProvideCallContext><Call/></ProvideCallContext>
}
