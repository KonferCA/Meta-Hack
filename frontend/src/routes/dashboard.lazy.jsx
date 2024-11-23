import { createLazyFileRoute } from '@tanstack/react-router'
import Dashboard from '../components/Dashboard'

export const Route = createLazyFileRoute('/dashboard')({
    component: Dashboard
}) 