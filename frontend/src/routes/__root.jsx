import { createRootRoute, Outlet } from '@tanstack/react-router'
import { AuthProvider } from '../contexts/AuthContext'

export const Route = createRootRoute({
    component: () => (
        <AuthProvider>
            <div>
                <Outlet />
            </div>
        </AuthProvider>
    ),
})
