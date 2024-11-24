import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { FiUserPlus, FiArrowRight } from 'react-icons/fi'
import toast from 'react-hot-toast'

// animation variants
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
                    to: `/dashboard`,
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
        <div className="min-h-[calc(100vh-4rem)] relative overflow-hidden">
            {/* animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" />
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.2]" />
            
            {/* floating shapes - modified to be more subtle */}
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

            <div className="relative flex items-center justify-center min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 lg:px-8">
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="max-w-md w-full space-y-8"
                >
                    <motion.div variants={itemVariants}>
                        <div className="flex justify-center mb-4">
                            <div className="p-4 bg-white rounded-full shadow-xl">
                                <FiUserPlus className="w-8 h-8 text-blue-600" />
                            </div>
                        </div>
                        <h2 className="text-center text-4xl font-bold text-gray-900 drop-shadow-sm">
                            Create Account
                        </h2>
                        <p className="mt-3 text-center text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </motion.div>

                    <motion.form 
                        variants={itemVariants} 
                        className="mt-8 space-y-6 bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl"
                        onSubmit={handleSubmit}
                    >
                        <div className="space-y-5">
                            <div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    className="appearance-none rounded-xl relative block w-full px-4 py-3 border 
                                        border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none 
                                        focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                        transition-all duration-200 ease-in-out"
                                    placeholder="Username"
                                    value={formData.username}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        username: e.target.value
                                    }))}
                                />
                            </div>

                            <div>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none rounded-xl relative block w-full px-4 py-3 border 
                                        border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none 
                                        focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                        transition-all duration-200 ease-in-out"
                                    placeholder="Email address"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        email: e.target.value
                                    }))}
                                />
                            </div>

                            <div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    className="appearance-none rounded-xl relative block w-full px-4 py-3 border 
                                        border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none 
                                        focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                        transition-all duration-200 ease-in-out"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        password: e.target.value
                                    }))}
                                />
                            </div>

                            <div className="relative">
                                <select
                                    id="role"
                                    name="role"
                                    required
                                    className="appearance-none rounded-xl relative block w-full px-4 py-3 border 
                                        border-gray-300 text-gray-700 focus:outline-none focus:ring-2 
                                        focus:ring-blue-500 focus:border-transparent bg-white
                                        transition-all duration-200 ease-in-out"
                                    value={formData.role}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        role: e.target.value
                                    }))}
                                >
                                    <option value="student">Student</option>
                                    <option value="professor">Professor</option>
                                </select>
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
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
                                    'Creating account...'
                                ) : (
                                    <>
                                        Sign up
                                        <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.form>
                </motion.div>
            </div>
        </div>
    )
}
