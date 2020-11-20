import React from 'react'
import { Button, Video } from 'Common'
import { useAppContext } from '~/App/Context'

import './index.css'

export default function Chat () {

    const { copied, offer, streams, ready, answerError, getSdp, handleAnswer } = useAppContext ()
    const buttonText = copied ? 'copied!' : offer ? 'get RSVP' : 'get invite link'

    return (
        <div className='box'>
            <div className='chat'>
                { Object.values (streams).map ((stream: MediaStream) => <Video key={ stream.id } stream={ stream }/>) }
            </div>
            <Button className={ copied || !ready ? 'disabled' : '' } onClick={ getSdp }>{ buttonText }</Button>
            <div>
            {
                copied && !offer ? (
                    <input
                        className={ 'answer-input' + (answerError ? ' error' : '') }
                        type='text'
                        placeholder='Paste answer here'
                        onChange={ handleAnswer }
                    />
                ) : null
            }
            { answerError ? <span className='anwer-error-text'>{ answerError.message }</span> : null }
            </div>
        </div>
    )
}