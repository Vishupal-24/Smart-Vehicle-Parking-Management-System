// Root Vue instance that wires up routing and shared auth state
new Vue({
    el: '#app',
    router,
    data: {
        isAuthenticated: false,
        userRole: null,
        userId: null,
        token: null
    },
    created() {
        // On refresh pull any previous session; saves me from re-login during dev loops
        this.syncSessionFromStorage();
    },
    methods: {
        syncSessionFromStorage() {
            const savedToken = localStorage.getItem('token');
            this.token = savedToken;
            this.userRole = localStorage.getItem('userRole');
            this.userId = localStorage.getItem('userId');
            this.isAuthenticated = Boolean(savedToken);
        },
        login(role, token, userId) {
            localStorage.setItem('token', token);
            localStorage.setItem('userRole', role);
            localStorage.setItem('userId', userId);
            this.syncSessionFromStorage();
            
            // Redirect based on role
            if (role === 'admin') {
                this.$router.push('/admin/dashboard');
            } else {
                this.$router.push('/customer/dashboard');
            }
        },
        logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('userRole');
            localStorage.removeItem('userId');
            this.syncSessionFromStorage();
            
            this.$router.push('/login');
        }
    },
    template: `
        <div id="app-root">
            <navbar-component 
                v-if="isAuthenticated"
                :is-authenticated="isAuthenticated"
                :user-role="userRole"
                @logout="logout"
            ></navbar-component>
            <router-view 
                @login="login"
                :user-id="userId"
                :token="token"
            ></router-view>
        </div>
    `
});
