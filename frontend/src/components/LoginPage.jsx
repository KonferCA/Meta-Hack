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
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        const loadingToast = toast.loading(
            isLogin ? 'Signing in...' : 'Creating account...'
        )

        let success
        try {
            if (isLogin) {
                success = await login(formData.email, formData.password)
            } else {
                success = await signup(formData.email, formData.password, formData.username)
            }

            if (success) {
                toast.dismiss(loadingToast)
                toast.success(
                    isLogin 
                        ? 'Successfully signed in!' 
                        : 'Account created successfully!'
                )
                navigate('/dashboard')
            } else {
                toast.dismiss(loadingToast)
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

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        })
    }

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="w-full max-w-md space-y-8 p-8">
                <div>
                    <h2 className="text-center text-3xl font-bold">
                        {isLogin ? 'Sign in to your account' : 'Create an account'}
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit} autoComplete="on">
                    <div className="space-y-4">
                        {!isLogin && (
                            <div>
                                <input
                                    type="text"
                                    name="username"
                                    autoComplete="username"
                                    value={formData.username}
                                    onChange={handleChange}
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
                                onChange={handleChange}
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
                                onChange={handleChange}
                                className="w-full rounded border p-2"
                                placeholder="Password"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="w-full rounded bg-blue-500 p-2 text-white hover:bg-blue-600"
                        >
                            {isLogin ? 'Sign in' : 'Sign up'}
                        </button>
                    </div>
                </form>

                <div className="text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-blue-500 hover:text-blue-600"
                    >
                        {isLogin
                            ? "Don't have an account? Sign up"
                            : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    )
} 