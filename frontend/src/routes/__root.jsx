import { Outlet, createRootRoute } from '@tanstack/react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { Toaster } from 'react-hot-toast'

export const Route = createRootRoute({
    component: RootComponent
})

function RootComponent() {
    return (
        <AuthProvider>
            <div className="min-h-screen bg-gray-100">
                <Outlet />
                <Toaster position="top-right" />
            </div>
        </AuthProvider>
    )
}
