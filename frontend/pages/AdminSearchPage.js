// Admin search/filter view for bookings, lots, and users
const AdminSearchPage = {
    name: 'AdminSearchPage',
    template: `
        <div class="container py-4">
            <h2 class="mb-4"><i class="bi bi-search me-2"></i>Search</h2>
            
            <div class="card mb-4">
                <div class="card-body">
                    <form @submit.prevent="search" class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label">Search Type</label>
                            <select class="form-select" v-model="searchType">
                                <option value="customer">Customer (by email)</option>
                                <option value="lot">Parking Lot (by name)</option>
                                <option value="booking">Booking (by vehicle)</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Search Text</label>
                            <input type="text" class="form-control" v-model="searchText" placeholder="Enter search text">
                        </div>
                        <div class="col-md-2 d-flex align-items-end">
                            <button type="submit" class="btn btn-primary w-100">
                                <i class="bi bi-search me-1"></i>Search
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- Results -->
            <div v-if="searched" class="card">
                <div class="card-header">
                    <h5 class="mb-0">Results ({{ results.length }})</h5>
                </div>
                <div class="card-body">
                    <!-- Customer Results -->
                    <table class="table" v-if="searchType === 'customer' && results.length">
                        <thead>
                            <tr><th>ID</th><th>Email</th><th>Approved</th><th>Blocked</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in results" :key="item.id">
                                <td>{{ item.id }}</td>
                                <td>{{ item.username }}</td>
                                <td><span class="badge" :class="item.approved ? 'bg-success' : 'bg-warning'">{{ item.approved }}</span></td>
                                <td><span class="badge" :class="item.blocked ? 'bg-danger' : 'bg-success'">{{ item.blocked }}</span></td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <!-- Lot Results -->
                    <table class="table" v-if="searchType === 'lot' && results.length">
                        <thead>
                            <tr><th>ID</th><th>Name</th><th>Address</th><th>Price/Hr</th><th>Spots</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in results" :key="item.id">
                                <td>{{ item.id }}</td>
                                <td>{{ item.name }}</td>
                                <td>{{ item.address }}</td>
                                <td>₹{{ item.price_per_hour }}</td>
                                <td>{{ item.available_spots }}/{{ item.max_spots }}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <!-- Booking Results -->
                    <table class="table" v-if="searchType === 'booking' && results.length">
                        <thead>
                            <tr><th>ID</th><th>Vehicle</th><th>Date</th><th>Amount</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in results" :key="item.id">
                                <td>{{ item.id }}</td>
                                <td>{{ item.vehicle_number }}</td>
                                <td>{{ item.booking_date }}</td>
                                <td>₹{{ item.total_amount }}</td>
                                <td><span class="badge bg-secondary">{{ item.status }}</span></td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div v-if="!results.length" class="text-center py-4 text-muted">
                        No results found
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            searchType: 'customer',
            searchText: '',
            results: [],
            searched: false
        };
    },
    methods: {
        async search() {
            try {
                const response = await fetch(API_BASE_URL + '/admin/search', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify({
                        search_type: this.searchType,
                        search_text: this.searchText
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.results = data.results;
                    this.searched = true;
                }
            } catch (err) {
                console.error('Error:', err);
            }
        }
    }
};
