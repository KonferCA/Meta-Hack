import { createLazyFileRoute } from '@tanstack/react-router'
import Landing from '../components/Landing'

export const Route = createLazyFileRoute('/')({
    component: Landing
}) 