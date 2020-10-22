import React from 'react'
import ReactDom from 'react-dom'

const App = () => {
    return (
        <div className='camera'>
            <video id='video'>Video stream not available</video>
            <a title='Take a shot' href='#'>Take a shot</a>
        </div>
    )
}

ReactDom.render (<App/>, document.getElementById ('root'))