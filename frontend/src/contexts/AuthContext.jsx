import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)

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
            const data = await response.json()
            if (response.ok) {
                setUser(data.user)
                localStorage.setItem('token', data.access_token)
                return true
            }
            return false
        } catch (error) {
            console.error('login error:', error)
            return false
        }
    }

    const signup = async (email, password, username) => {
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username }),
            })
            const data = await response.json()
            if (response.ok) {
                setUser(data.user)
                localStorage.setItem('token', data.access_token)
                return true
            }
            return false
        } catch (error) {
            console.error('signup error:', error)
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