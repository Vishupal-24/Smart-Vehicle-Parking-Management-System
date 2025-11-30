// Customer signup view for new accounts
const RegisterPage = {
    name: 'RegisterPage',
    template: `
        <div class="container mt-5">
            <div class="row justify-content-center">
                <div class="col-md-6 col-lg-4">
                    <div class="card shadow">
                        <div class="card-header bg-success text-white text-center">
                            <h4 class="mb-0"><i class="bi bi-person-plus me-2"></i>Register</h4>
                        </div>
                        <div class="card-body p-4">
                            <div v-if="error" class="alert alert-danger alert-dismissible fade show">
                                {{ error }}
                                <button type="button" class="btn-close" @click="error = ''"></button>
                            </div>
                            
                            <div v-if="success" class="alert alert-success">
                                {{ success }}
                            </div>
                            
                            <form @submit.prevent="register" v-if="!success">
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
                                            minlength="6"
                                            required>
                                    </div>
                                    <div class="form-text">Minimum 6 characters</div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="confirmPassword" class="form-label">Confirm Password</label>
                                    <div class="input-group">
                                        <span class="input-group-text"><i class="bi bi-lock-fill"></i></span>
                                        <input 
                                            type="password" 
                                            class="form-control" 
                                            id="confirmPassword" 
                                            v-model="confirmPassword" 
                                            placeholder="Confirm password"
                                            required>
                                    </div>
                                </div>
                                
                                <button type="submit" class="btn btn-success w-100" :disabled="loading">
                                    <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                                    Register
                                </button>
                            </form>
                            
                            <hr>
                            
                            <p class="text-center mb-0">
                                Already have an account? 
                                <router-link to="/login">Login here</router-link>
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
            confirmPassword: '',
            error: '',
            success: '',
            loading: false
        };
    },
    methods: {
        async register() {
            this.error = '';
            
            if (this.password !== this.confirmPassword) {
                this.error = 'Passwords do not match';
                return;
            }
            
            this.loading = true;
            
            try {
                const response = await fetch(API_BASE_URL + '/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: this.username,
                        password: this.password
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    this.success = data.message || 'Registration successful! Please login.';
                    setTimeout(() => {
                        this.$router.push('/login');
                    }, 2000);
                } else {
                    this.error = data.error || 'Registration failed';
                }
            } catch (err) {
                this.error = 'Network error. Please try again.';
            } finally {
                this.loading = false;
            }
        }
    }
};
