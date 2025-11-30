// Admin dashboard with stats, quick actions, and charts
const AdminDashboardPage = {
    name: 'AdminDashboardPage',
    template: `
        <div class="container-fluid py-4">
            <h2 class="mb-4"><i class="bi bi-speedometer2 me-2"></i>Admin Dashboard</h2>
            
            <!-- Stats Cards -->
            <div class="row mb-4">
                <div class="col-md-3 mb-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <i class="bi bi-building display-4"></i>
                            <h3>{{ stats.total_lots }}</h3>
                            <p class="mb-0">Parking Lots</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-success text-white">
                        <div class="card-body text-center">
                            <i class="bi bi-people display-4"></i>
                            <h3>{{ stats.total_customers }}</h3>
                            <p class="mb-0">Customers</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <i class="bi bi-calendar-check display-4"></i>
                            <h3>{{ stats.total_bookings }}</h3>
                            <p class="mb-0">Total Bookings</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-warning text-dark">
                        <div class="card-body text-center">
                            <i class="bi bi-clock display-4"></i>
                            <h3>{{ stats.active_bookings }}</h3>
                            <p class="mb-0">Active Bookings</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Quick Actions -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-body d-flex flex-wrap align-items-center gap-2">
                            <h5 class="mb-0 me-3">Quick Actions</h5>
                            <router-link to="/admin/lots" class="btn btn-outline-primary">
                                <i class="bi bi-plus-circle me-1"></i>Manage Parking Lots
                            </router-link>
                            <router-link to="/admin/users" class="btn btn-outline-success">
                                <i class="bi bi-people me-1"></i>Manage Users
                            </router-link>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Recent Bookings -->
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Recent Bookings</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Customer</th>
                                            <th>Lot</th>
                                            <th>Vehicle</th>
                                            <th>Start Time</th>
                                            <th>End Time</th>
                                            <th>Duration</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="booking in bookings" :key="booking.id">
                                            <td>#{{ booking.id }}</td>
                                            <td>{{ getCustomerName(booking.customer_id) }}</td>
                                            <td>{{ getLotName(booking.lot_id) }}</td>
                                            <td>{{ booking.vehicle_number }}</td>
                                            <td>{{ formatDateTime(booking.start_time) }}</td>
                                            <td>{{ booking.actual_end_time ? formatDateTime(booking.actual_end_time) : '-' }}</td>
                                            <td>{{ formatBookingDuration(booking) }}</td>
                                            <td>₹{{ formatPrice(booking.total_amount) }}</td>
                                            <td>
                                                <span class="badge" :class="getStatusClass(booking.status)">
                                                    {{ booking.status }}
                                                </span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            lots: [],
            customers: [],
            bookings: [],
            profileDict: {},
            stats: {
                total_lots: 0,
                total_customers: 0,
                total_bookings: 0,
                active_bookings: 0
            }
        };
    },
    created() {
        this.fetchData();
    },
    methods: {
        authHeaders() {
            return {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            };
        },
        async fetchData() {
            // Keeping it simple: always hit the API so the dashboard matches what ops sees, loads are tiny anyway
            try {
                const response = await fetch(API_BASE_URL + '/admin/dashboard', {
                    headers: this.authHeaders()
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.lots = data.lots;
                    this.customers = data.customers;
                    this.bookings = data.bookings;
                    this.profileDict = data.profile_dict;
                    this.stats = data.stats;
                }
            } catch (err) {
                console.error('Admin dashboard fetch failed—if Redis or Flask died you will see it here first:', err);
            }
        },
        getCustomerName(customerId) {
            const profile = this.profileDict[customerId];
            if (profile) return profile.full_name;
            const customer = this.customers.find(c => c.id === customerId);
            return customer ? customer.username : 'Unknown';
        },
        getLotName(lotId) {
            const lot = this.lots.find(l => l.id === lotId);
            return lot ? lot.name : 'Unknown';
        },
        formatDate(dateStr) {
            if (!dateStr) return '-';
            return new Date(dateStr).toLocaleDateString();
        },
        formatDateTime(dateStr) {
            if (!dateStr) return '-';
            const timeStr = dateStr.includes('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z';
            const date = new Date(timeStr);
            return date.toLocaleString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        },
        formatBookingDuration(booking) {
            if (booking.actual_hours) {
                const hours = Math.floor(booking.actual_hours);
                const minutes = Math.round((booking.actual_hours - hours) * 60);
                return `${hours}h ${minutes}m`;
            }
            if (!booking.start_time || !booking.actual_end_time) return '-';
            const startStr = booking.start_time.includes('Z') || booking.start_time.includes('+') ? booking.start_time : booking.start_time + 'Z';
            const endStr = booking.actual_end_time.includes('Z') || booking.actual_end_time.includes('+') ? booking.actual_end_time : booking.actual_end_time + 'Z';
            const start = new Date(startStr);
            const end = new Date(endStr);
            const diff = end - start;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return `${hours}h ${minutes}m`;
        },
        formatPrice(amount) {
            if (!amount && amount !== 0) return '0.00';
            return parseFloat(amount).toFixed(2);
        },
        getStatusClass(status) {
            const classes = {
                'requested': 'bg-warning',
                'confirmed': 'bg-info',
                'active': 'bg-primary',
                'completed': 'bg-success',
                'cancelled': 'bg-secondary'
            };
            return classes[status] || 'bg-secondary';
        }
    }
};
