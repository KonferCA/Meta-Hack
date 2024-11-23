import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
    const navigate = useNavigate()
    const { login, signup } = useAuth()
    const [isLogin, setIsLogin] = useState(true)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: '',
        role: 'student'
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        const loadingToast = toast.loading(
            isLogin ? 'Signing in...' : 'Creating account...'
        )

        try {
            const success = await (isLogin 
                ? login(formData.email, formData.password)
                : signup(formData.email, formData.password, formData.username, formData.role)
            )
            
            toast.dismiss(loadingToast)
            
            if (success) {
                toast.success(
                    isLogin 
                        ? 'Successfully signed in!' 
                        : 'Account created successfully!'
                )
                await navigate({ to: '/dashboard', replace: true })
            } else {
                toast.error(
                    isLogin 
                        ? 'Invalid email or password' 
                        : 'Failed to create account'
                )
            }
        } catch (error) {
            toast.dismiss(loadingToast)
            toast.error('Something went wrong. Please try again.')
            console.error('Error:', error)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">
                        {isLogin ? 'Sign in to your account' : 'Create a new account'}
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {!isLogin && (
                            <div>
                                <input
                                    type="text"
                                    name="username"
                                    autoComplete="username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                                    className="w-full rounded border p-2"
                                    placeholder="Username"
                                    required
                                />
                            </div>
                        )}
                        <div>
                            <input
                                type="email"
                                name="email"
                                autoComplete="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                className="w-full rounded border p-2"
                                placeholder="Email address"
                                required
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                name="password"
                                autoComplete={isLogin ? "current-password" : "new-password"}
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                className="w-full rounded border p-2"
                                placeholder="Password"
                                required
                            />
                        </div>
                    </div>

                    {!isLogin && (
                        <>
                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                                    I am a:
                                </label>
                                <select
                                    id="role"
                                    name="role"
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                                    value={formData.role}
                                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                                >
                                    <option value="student">Student</option>
                                    <option value="professor">Professor</option>
                                </select>
                            </div>
                        </>
                    )}

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {isLogin ? 'Sign in' : 'Sign up'}
                        </button>
                    </div>
                </form>

                <div className="text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-blue-600 hover:text-blue-500"
                    >
                        {isLogin 
                            ? "Don't have an account? Sign up" 
                            : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    )
} 