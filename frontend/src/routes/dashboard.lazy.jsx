import { createLazyFileRoute, redirect } from '@tanstack/react-router'
import Dashboard from '../components/Dashboard'

export const Route = createLazyFileRoute('/dashboard')({
    beforeLoad: ({ context }) => {
        const { user } = context.auth
        if (!user) {
            throw redirect({ to: '/login' })
        }
    },
    component: Dashboard,
}) 