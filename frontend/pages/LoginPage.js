// Customer login form and related logic
const LoginPage = {
    name: 'LoginPage',
    template: `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6 col-lg-4">
                    <div class="card shadow">
                        <div class="card-header bg-primary text-white text-center">
                            <h4 class="mb-0"><i class="bi bi-person-circle me-2"></i>Customer Login</h4>
                        </div>
                        <div class="card-body p-4">
                            <div v-if="error" class="alert alert-danger alert-dismissible fade show">
                                {{ error }}
                                <button type="button" class="btn-close" @click="error = ''"></button>
                            </div>
                            
                            <form @submit.prevent="login">
                                <div class="mb-3">
                                    <label for="username" class="form-label">Email</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-envelope"></i></span>
                                        <input 
                                            type="email" 
                                            class="form-control" 
                                            id="username" 
                                            v-model="username" 
                                            placeholder="Enter your email"
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
                                            placeholder="Enter password"
                                            required>
                                    </div>
                                </div>
                                
                                <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                                    <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                                    Login
                                </button>
                            </form>
                            
                            <hr>
                            
                            <p class="text-center mb-0">
                                Don't have an account? 
                                <router-link to="/register">Register here</router-link>
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
                const response = await fetch(API_BASE_URL + '/login', {
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
                    this.$router.push(data.redirect || '/customer/dashboard');
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
