import { createLazyFileRoute } from '@tanstack/react-router'
import Register from '../components/Register'

export const Route = createLazyFileRoute('/register')({
    component: Register
}) 