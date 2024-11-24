import { createLazyFileRoute } from '@tanstack/react-router'
import CourseLanding from '../components/CourseLanding'

export const Route = createLazyFileRoute('/courses/$courseId')({
    component: CourseLanding
}) 