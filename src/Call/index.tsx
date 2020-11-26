import React from 'react'
import { Video } from '~/Common'
import { useAppContext } from '~/App/Context'
import ProvideCallContext, { useCallContext } from './Context'

import './index.css'

function Call (): React.ReactElement {
    const { chat } = useAppContext ()
    const { inStream, outStream, startCall, startVideoCall } = useCallContext ()

    return chat ? (
        <div>
            { inStream ? <Video stream={ inStream }/> : null }
            { outStream ? <Video stream={ outStream }/> : null }
            {
                inStream || outStream ? null : (
                    <div>
                        <a href='#' onClick={ startCall }>Call</a>
                        <a href='#' onClick={ startVideoCall }>Video Call</a>
                    </div>
                )
            }
        </div>
    ) : null
}

export default function () {
    return <ProvideCallContext><Call/></ProvideCallContext>
}
