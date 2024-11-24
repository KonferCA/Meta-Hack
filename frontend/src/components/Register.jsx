import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import toast from 'react-hot-toast'

export default function Register() {
    const navigate = useNavigate()
    const { signup } = useAuth()
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: '',
        role: 'student'
    })
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        
        try {
            const success = await signup(
                formData.email, 
                formData.password, 
                formData.username, 
                formData.role
            )
            
            if (success) {
                toast.success('Account created successfully!')
                navigate({ 
                    to: `/dashboard/${formData.role}`,
                    replace: true 
                })
            } else {
                toast.error('Failed to create account')
            }
        } catch (error) {
            console.error('Registration error:', error)
            toast.error('Something went wrong. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Create your account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Or{' '}
                        <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                            sign in to your account
                        </Link>
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="username" className="sr-only">Username</label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border 
                                    border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none 
                                    focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Username"
                                value={formData.username}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    username: e.target.value
                                }))}
                            />
                        </div>
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border 
                                    border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none 
                                    focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    email: e.target.value
                                }))}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border 
                                    border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none 
                                    focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Password"
                                value={formData.password}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    password: e.target.value
                                }))}
                            />
                        </div>
                        <div>
                            <label htmlFor="role" className="sr-only">Role</label>
                            <select
                                id="role"
                                name="role"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border 
                                    border-gray-300 text-gray-900 focus:outline-none focus:ring-blue-500 
                                    focus:border-blue-500 focus:z-10 sm:text-sm"
                                value={formData.role}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    role: e.target.value
                                }))}
                            >
                                <option value="student">Student</option>
                                <option value="professor">Professor</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent 
                                text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                                disabled:bg-blue-400"
                        >
                            {isLoading ? 'Creating account...' : 'Sign up'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
