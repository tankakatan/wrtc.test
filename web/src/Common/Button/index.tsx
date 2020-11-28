import React from 'react'
import classnames from 'classnames'

import './index.css'

export default function Button ({ className = '', onClick = (_: React.MouseEvent) => {}, children = undefined as React.ReactNode }) {
    return <a href='#' onClick={ onClick } className={ classnames ('button', className) }>{ children }</a>
}
