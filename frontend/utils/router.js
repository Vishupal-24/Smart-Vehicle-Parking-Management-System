// Client-side routes for every public/admin/customer view
const routes = [
    // Public routes
    { path: '/', component: LoginPage },
    { path: '/login', component: LoginPage },
    { path: '/register', component: RegisterPage },
    { path: '/admin/login', component: AdminLoginPage },
    
    // Customer routes
    { path: '/customer/dashboard', component: CustomerDashboardPage, meta: { requiresAuth: true, role: 'customer' } },
    { path: '/customer/profile', component: CustomerProfilePage, meta: { requiresAuth: true, role: 'customer' } },
    { path: '/customer/search', component: CustomerSearchPage, meta: { requiresAuth: true, role: 'customer' } },
    { path: '/customer/summary', component: CustomerSummaryPage, meta: { requiresAuth: true, role: 'customer' } },
    { path: '/customer/book/:id', component: CustomerBookingPage, meta: { requiresAuth: true, role: 'customer' } },
    
    // Admin routes
    { path: '/admin/dashboard', component: AdminDashboardPage, meta: { requiresAuth: true, role: 'admin' } },
    { path: '/admin/lots', component: AdminLotsPage, meta: { requiresAuth: true, role: 'admin' } },
    { path: '/admin/users', component: AdminUsersPage, meta: { requiresAuth: true, role: 'admin' } },
    { path: '/admin/search', component: AdminSearchPage, meta: { requiresAuth: true, role: 'admin' } },
    { path: '/admin/summary', component: AdminSummaryPage, meta: { requiresAuth: true, role: 'admin' } },
    

    { path: '*', redirect: '/login' }
];

const router = new VueRouter({
    routes
});

// Navigation guards
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    
    if (to.meta.requiresAuth) {
        if (!token) {
            next('/login');
        } else if (to.meta.role && to.meta.role !== role) {
            // Redirect to appropriate dashboard based on role
            if (role === 'admin') {
                next('/admin/dashboard');
            } else {
                next('/customer/dashboard');
            }
        } else {
            next();
        }
    } else {
        // If logged in and trying to access login/register, redirect to dashboard
        if (token && (to.path === '/login' || to.path === '/register' || to.path === '/admin/login')) {
            if (role === 'admin') {
                next('/admin/dashboard');
            } else {
                next('/customer/dashboard');
            }
        } else {
            next();
        }
    }
});
