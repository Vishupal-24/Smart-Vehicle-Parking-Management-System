// Basic navbar with role-aware links and logout control
const NavbarComponent = {
    name: 'NavbarComponent',
    props: ['isAuthenticated', 'userRole'],
    template: `
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
            <div class="container-fluid">
                <router-link class="navbar-brand" to="/">
                    <i class="bi bi-car-front-fill me-2"></i>Vehicle Parking
                </router-link>
                
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span class="navbar-toggler-icon"></span>
                </button>
                
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav me-auto">
                        <!-- Public Links -->
                        <template v-if="!isAuthenticated">
                            <li class="nav-item">
                                <router-link class="nav-link" to="/login">Login</router-link>
                            </li>
                            <li class="nav-item">
                                <router-link class="nav-link" to="/register">Register</router-link>
                            </li>
                            <li class="nav-item">
                                <router-link class="nav-link" to="/admin/login">Admin Login</router-link>
                            </li>
                        </template>
                        
                        <!-- Customer Links -->
                        <template v-if="isAuthenticated && userRole === 'customer'">
                            <li class="nav-item">
                                <router-link class="nav-link" to="/customer/dashboard">
                                    <i class="bi bi-speedometer2 me-1"></i>Dashboard
                                </router-link>
                            </li>
                            <li class="nav-item">
                                <router-link class="nav-link" to="/customer/profile">
                                    <i class="bi bi-person me-1"></i>Profile
                                </router-link>
                            </li>
                            <li class="nav-item">
                                <router-link class="nav-link" to="/customer/search">
                                    <i class="bi bi-search me-1"></i>Search
                                </router-link>
                            </li>
                            <li class="nav-item">
                                <router-link class="nav-link" to="/customer/summary">
                                    <i class="bi bi-bar-chart me-1"></i>Summary
                                </router-link>
                            </li>
                        </template>
                        
                        <!-- Admin Links -->
                        <template v-if="isAuthenticated && userRole === 'admin'">
                            <li class="nav-item">
                                <router-link class="nav-link" to="/admin/dashboard">
                                    <i class="bi bi-speedometer2 me-1"></i>Dashboard
                                </router-link>
                            </li>
                            <li class="nav-item">
                                <router-link class="nav-link" to="/admin/lots">
                                    <i class="bi bi-building me-1"></i>Parking Lots
                                </router-link>
                            </li>
                            <li class="nav-item">
                                <router-link class="nav-link" to="/admin/users">
                                    <i class="bi bi-people me-1"></i>Users
                                </router-link>
                            </li>
                            <li class="nav-item">
                                <router-link class="nav-link" to="/admin/search">
                                    <i class="bi bi-search me-1"></i>Search
                                </router-link>
                            </li>
                            <li class="nav-item">
                                <router-link class="nav-link" to="/admin/summary">
                                    <i class="bi bi-bar-chart me-1"></i>Summary
                                </router-link>
                            </li>
                        </template>
                    </ul>
                    
                    <!-- Right Side -->
                    <ul class="navbar-nav">
                        <li class="nav-item" v-if="isAuthenticated">
                            <span class="nav-link text-light">
                                <i class="bi bi-person-circle me-1"></i>
                                {{ userRole === 'admin' ? 'Admin' : 'Customer' }}
                            </span>
                        </li>
                        <li class="nav-item" v-if="isAuthenticated">
                            <a class="nav-link" href="#" @click.prevent="$emit('logout')">
                                <i class="bi bi-box-arrow-right me-1"></i>Logout
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    `
};

Vue.component('navbar-component', NavbarComponent);
