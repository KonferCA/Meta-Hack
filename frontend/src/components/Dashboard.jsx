import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export default function Dashboard() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    
    useEffect(() => {
        if (!user) {
            const timer = setTimeout(() => {
                navigate({ to: '/login', replace: true })
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [user, navigate])
    
    if (!user) return null
    
    const handleLogout = async () => {
        logout()
        await navigate({ to: '/login', replace: true })
    }
    
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Welcome, {user.username}!</h1>
                <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                    Logout
                </button>
            </div>
            <p>You are logged in with {user.email}</p>
        </div>
    )
} 