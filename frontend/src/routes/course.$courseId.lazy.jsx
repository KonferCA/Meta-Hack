import { createLazyFileRoute } from '@tanstack/react-router'
import CourseView from '../components/CourseView'

export const Route = createLazyFileRoute('/course/$courseId')({
    component: CourseView
}) 