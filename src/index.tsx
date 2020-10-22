import React, { useState, useEffect, useRef } from 'react'
import ReactDom from 'react-dom'

let width = 320
let height = 0

let streaming = false
let video = null
let canvas = null
let photo = null
let button = null

const App = () => {
    const video = useRef (null)

    useEffect (() => {
        void (async () => {

            try {

                const stream = await navigator.mediaDevices.getUserMedia ({ video: true, audio: false })
                video.current.srcObject = stream
                video.current.play ()

            } catch (e) {

                console.error ('User media error: ', e)
            }

        }) ()
    }, [])

    return (
        <div className='box'>
            <div className='camera'>
                <video ref={ video } id='video'>Video stream not available</video>
                <a title='Take a shot' href='#'>Take a shot</a>
            </div>
            <canvas id='canvas'/>
            <div id='output'>
                <img id='image' alt='Screen shot will appear in thin box.'/>
            </div>
        </div>
    )
}

ReactDom.render (<App/>, document.getElementById ('root'))