// Admin login form with the default creds noted for reference
const AdminLoginPage = {
    name: 'AdminLoginPage',
    template: `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6 col-lg-4">
                    <div class="card shadow">
                        <div class="card-header bg-dark text-white text-center">
                            <h4 class="mb-0"><i class="bi bi-shield-lock me-2"></i>Admin Login</h4>
                        </div>
                        <div class="card-body p-4">
                            <div v-if="error" class="alert alert-danger alert-dismissible fade show">
                                {{ error }}
                                <button type="button" class="btn-close" @click="error = ''"></button>
                            </div>
                            
                            <form @submit.prevent="login">
                                <div class="mb-3">
                                    <label for="username" class="form-label">Admin Email</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                                        <input 
                                            type="email" 
                                            class="form-control" 
                                            id="username" 
                                            v-model="username" 
                                            placeholder="admin@parking.com"
                                            required>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="password" class="form-label">Password</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-lock"></i></span>
                                        <input 
                                            type="password" 
                                            class="form-control" 
                                            id="password" 
                                            v-model="password" 
                                            placeholder="Enter admin password"
                                            required>
                                    </div>
                                </div>
                                
                                <button type="submit" class="btn btn-dark w-100" :disabled="loading">
                                    <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                                    Admin Login
                                </button>
                            </form>
                            
                            <hr>
                            
                            <p class="text-center text-muted small mb-0">
                                <i class="bi bi-info-circle me-1"></i>
                                Default: admin@parking.com / admin123
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            username: '',
            password: '',
            error: '',
            loading: false
        };
    },
    methods: {
        async login() {
            this.loading = true;
            this.error = '';
            
            try {
                const response = await fetch(API_BASE_URL + '/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: this.username,
                        password: this.password
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    this.$root.login(data.role, data.access_token, data.user_id);
                    this.$router.push('/admin/dashboard');
                } else {
                    this.error = data.error || 'Login failed';
                }
            } catch (err) {
                this.error = 'Network error. Please try again.';
            } finally {
                this.loading = false;
            }
        }
    }
};
