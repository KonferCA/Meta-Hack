import { Outlet, createRootRoute } from '@tanstack/react-router'
import { AuthProvider, useAuth } from '../contexts/AuthContext'
import { Toaster } from 'react-hot-toast'

export const Route = createRootRoute({
    component: RootComponent,
    context: {
        auth: undefined, // will be populated in component
    },
})

function RootComponent() {
    const auth = useAuth()
    return (
        <AuthProvider>
            <Toaster position="top-right" />
            <div className="min-h-screen bg-gray-100">
                <Outlet context={{ auth }} />
            </div>
        </AuthProvider>
    )
}
