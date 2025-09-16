// router/index.ts
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

import { authService } from './modules/auth/services/auth.service'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        redirect: '/welcome',
    },
    {
        path: '/welcome',
        name: 'welcome',
        component: () => import('@/modules/welcome/pages/welcome-page.vue'),
        meta: {
            title: 'BusinessAI - Welcome',
            description:
                'Welcome to BusinessAI — turn your business questions into powerful analytics with AI.',
            layout: 'blank',
            requiresAuth: false,
        },
    },

    {
        path: '/auth/login',
        name: 'login',
        component: () => import('@/modules/auth/pages/login-page.vue'),
        meta: {
            title: 'BusinessAI - Login',
            description: 'Sign in to your BusinessAI account',
            layout: 'blank',
            requiresAuth: false,
        },
    },

    {
        path: '/auth/register',
        name: 'register',
        component: () => import('@/modules/auth/pages/register-page.vue'),
        meta: {
            title: 'BusinessAI - Register',
            description: 'Create a new BusinessAI account',
            layout: 'blank',
            requiresAuth: false,
        },
    },

    {
        path: '/app/home',
        name: 'home',
        component: () => import('@/modules/home/pages/home-page.vue'),
        meta: {
            title: 'BusinessAI - Home',
            description: 'Application home page for BusinessAI.',
            layout: 'blank',
            requiresAuth: true,
        },
    },
]

// Create router instance
export const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior(to) {
        if (to.hash) {
            return {
                el: to.hash,
                behavior: 'smooth',
            }
        }
        return { top: 0, behavior: 'smooth' }
    },
    routes,
})

/** ---------- Global beforeEach auth + meta middleware ---------- */
const AUTH_ROUTE_NAMES = new Set(['login', 'register', 'welcome'])

router.beforeEach(async to => {
    // 1) Apply document title/description from meta
    const title = (to.meta?.title as string) || 'BusinessAI'
    if (title) document.title = title

    const desc = to.meta?.description as string | undefined
    if (desc) {
        let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]')
        if (!tag) {
            tag = document.createElement('meta')
            tag.setAttribute('name', 'description')
            document.head.appendChild(tag)
        }
        tag.setAttribute('content', desc)
    }

    // 2) Resolve current user
    let user: unknown | null = null
    try {
        user = await authService.getCurrentUser()
    } catch {
        user = null
    }

    const requiresAuth = Boolean(to.meta?.requiresAuth)
    const isAuthPage = AUTH_ROUTE_NAMES.has((to.name as string) || '')

    // 3) Guard: block auth-required routes
    // if (requiresAuth && !user) {
    // 	return {
    // 		name: 'login',
    // 		query: { redirect: to.fullPath }, // so we can bounce back after login
    // 		replace: true,
    // 	}
    // }

    // 4) Guard: prevent visiting auth pages if already logged in
    if (!requiresAuth && isAuthPage && user) {
        return { name: 'home', replace: true }
    }

    // allow navigation
    return true
})
