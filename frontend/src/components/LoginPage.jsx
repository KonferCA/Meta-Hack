import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../contexts/AuthContext'
import { motion } from 'framer-motion'
import { FiLogIn, FiArrowRight } from 'react-icons/fi'
import toast from 'react-hot-toast'

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
}

export default function LoginPage() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        
        try {
            const success = await login(formData.email, formData.password)
            
            if (success) {
                toast.success('Successfully signed in!')
                navigate({ to: '/dashboard', replace: true })
            } else {
                toast.error('Invalid email or password')
            }
        } catch (error) {
            console.error('Login error:', error)
            toast.error('Something went wrong. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" />
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.2]" />
            
            {/* floating shapes */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-72 h-72 bg-gradient-to-r from-blue-400/5 to-purple-400/5 rounded-full"
                        animate={{
                            y: [0, -50, 0],
                            scale: [1, 1.05, 1],
                        }}
                        transition={{
                            duration: 15 + i * 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{
                            left: `${20 + i * 30}%`,
                            top: `${20 + i * 20}%`,
                        }}
                    />
                ))}
            </div>

            <div className="relative flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="max-w-md w-full space-y-8"
                >
                    <motion.div variants={itemVariants}>
                        <div className="flex justify-center mb-4">
                            <div className="p-4 bg-white rounded-full shadow-xl">
                                <FiLogIn className="w-8 h-8 text-blue-600" />
                            </div>
                        </div>
                        <h2 className="text-center text-4xl font-bold text-gray-900 drop-shadow-sm">
                            Welcome Back
                        </h2>
                        <p className="mt-3 text-center text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                                Sign up
                            </Link>
                        </p>
                    </motion.div>

                    <motion.form 
                        variants={itemVariants}
                        onSubmit={handleSubmit}
                        className="mt-8 space-y-6 bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl"
                    >
                        <div className="space-y-5">
                            <div>
                                <input
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="appearance-none rounded-xl relative block w-full px-4 py-3 border 
                                        border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none 
                                        focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                        transition-all duration-200 ease-in-out"
                                    placeholder="Email address"
                                />
                            </div>

                            <div>
                                <input
                                    type="password"
                                    name="password"
                                    autoComplete="current-password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    className="appearance-none rounded-xl relative block w-full px-4 py-3 border 
                                        border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none 
                                        focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                        transition-all duration-200 ease-in-out"
                                    placeholder="Password"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative w-full flex justify-center items-center py-3 px-4 
                                    text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-purple-600
                                    hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 
                                    focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ease-in-out
                                    disabled:from-blue-400 disabled:to-purple-400 shadow-lg"
                            >
                                {isLoading ? (
                                    'Signing in...'
                                ) : (
                                    <>
                                        Sign in
                                        <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="flex items-center justify-center">
                            <Link 
                                to="/forgot-password"
                                className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                            >
                                Forgot your password?
                            </Link>
                        </div>
                    </motion.form>
                </motion.div>
            </div>
        </div>
    )
} 