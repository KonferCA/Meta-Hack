import * as React from 'react'
import { createLazyFileRoute } from '@tanstack/react-router'
import App from '../App'

export const Route = createLazyFileRoute('/')({
    component: App,
})
