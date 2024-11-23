import { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    const checkAuth = async () => {
        const token = localStorage.getItem('token')
        if (!token) {
            setLoading(false)
            return
        }

        try {
            const response = await fetch(`${API_URL}/users/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            })

            if (response.ok) {
                const userData = await response.json()
                setUser(userData)
            } else {
                localStorage.removeItem('token')
                setUser(null)
            }
        } catch (error) {
            console.error('Auth check error:', error)
            localStorage.removeItem('token')
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_URL}/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                credentials: 'include',
                body: new URLSearchParams({
                    username: email,
                    password: password
                })
            })

            if (!response.ok) {
                return false
            }

            const data = await response.json()
            setUser(data.user)
            localStorage.setItem('token', data.access_token)
            return true
        } catch (error) {
            console.error('Login error:', error)
            return false
        }
    }

    const signup = async (email, password, username, role) => {
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password, username, role })
            })

            if (!response.ok) {
                const errorData = await response.json()
                toast.error(errorData.detail || 'Signup failed')
                return false
            }

            const data = await response.json()
            setUser(data.user)
            localStorage.setItem('token', data.access_token)
            return true
        } catch (error) {
            console.error('Signup error:', error)
            return false
        }
    }

    const logout = () => {
        localStorage.removeItem('token')
        setUser(null)
    }

    useEffect(() => {
        checkAuth()
    }, [])

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout, checkAuth }}>
            {!loading && children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
} 