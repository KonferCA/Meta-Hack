import { Outlet, createRootRoute, redirect } from '@tanstack/react-router'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { Toaster } from 'react-hot-toast'

export const Route = createRootRoute({
    component: RootComponent,
    beforeLoad: () => {
        throw redirect({ to: '/login' })
    }
})

function RootComponent() {
    const auth = useAuth()
    return (
        <AuthProvider>
            <Toaster position="top-right" />
            <div className="min-h-screen bg-gray-100">
                <Outlet />
            </div>
        </AuthProvider>
    )
}
