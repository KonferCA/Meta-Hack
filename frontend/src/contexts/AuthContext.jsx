import { createContext, useContext, useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)
const API_URL = import.meta.env.VITE_API_URL

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    const checkAuth = async () => {
        const token = localStorage.getItem('token')
        if (token) {
            try {
                const response = await fetch(`${API_URL}/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
                if (response.ok) {
                    const userData = await response.json()
                    setUser(userData)
                } else {
                    localStorage.removeItem('token')
                }
            } catch (error) {
                console.error('Auth check error:', error)
                localStorage.removeItem('token')
            }
        }
        setLoading(false)
    }

    useEffect(() => {
        checkAuth()
    }, [])

    const signup = async (email, password, username) => {
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username }),
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
            console.error('signup error:', error)
            toast.error('Network error. Please check your connection.')
            return false
        }
    }

    const login = async (email, password) => {
        try {
            const response = await fetch(`${API_URL}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    username: email,
                    password: password,
                }),
            })
            
            if (!response.ok) {
                const errorData = await response.json()
                toast.error(errorData.detail || 'Login failed')
                return false
            }
            
            const data = await response.json()
            await new Promise(resolve => {
                setUser(data.user)
                resolve()
            })
            localStorage.setItem('token', data.access_token)
            return true
        } catch (error) {
            console.error('login error:', error)
            toast.error('Network error. Please check your connection.')
            return false
        }
    }

    const logout = () => {
        setUser(null)
        localStorage.removeItem('token')
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, signup }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext) 