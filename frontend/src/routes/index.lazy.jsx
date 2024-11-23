import { createLazyFileRoute } from '@tanstack/react-router'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createLazyFileRoute('/')({
    component: Index
})

function Index() {
    const { user } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (user) {
            navigate({ to: '/dashboard' })
        } else {
            navigate({ to: '/login' })
        }
    }, [user, navigate])

    return null // or a loading spinner if you prefer
} 