// Customer search view to filter the active parking lots
const CustomerSearchPage = {
    name: 'CustomerSearchPage',
    template: `
        <div class="container py-4">
            <h2 class="mb-4"><i class="bi bi-search me-2"></i>Search Parking Lots</h2>
            
            <div class="card mb-4">
                <div class="card-body">
                    <form @submit.prevent="search" class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label">Search Type</label>
                            <select class="form-select" v-model="searchType">
                                <option value="name">By Name</option>
                                <option value="pincode">By Pincode</option>
                                <option value="address">By Address</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Search Text</label>
                            <input type="text" class="form-control" v-model="searchText" placeholder="Enter search text">
                        </div>
                        <div class="col-md-2 d-flex align-items-end">
                            <button type="submit" class="btn btn-primary w-100" :disabled="loading">
                                <i class="bi bi-search me-1"></i>Search
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            
            <!-- Results -->
            <div v-if="searched">
                <h4>Search Results ({{ results.length }})</h4>
                
                <div class="row" v-if="results.length">
                    <div class="col-md-6 col-lg-4 mb-4" v-for="lot in results" :key="lot.id">
                        <div class="card h-100">
                            <div class="card-header">
                                <strong>{{ lot.name }}</strong>
                            </div>
                            <div class="card-body">
                                <p><i class="bi bi-geo-alt me-1"></i>{{ lot.address }}</p>
                                <p><i class="bi bi-mailbox me-1"></i>{{ lot.pincode }}</p>
                                <p><i class="bi bi-currency-rupee"></i>{{ lot.price_per_hour }}/hour</p>
                                <p>
                                    <span class="badge bg-success">{{ lot.available_spots }} Available</span>
                                </p>
                                <router-link 
                                    :to="'/customer/book/' + lot.id" 
                                    class="btn btn-primary btn-sm w-100">
                                    Book Now
                                </router-link>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div v-else class="text-center py-5 text-muted">
                    <i class="bi bi-search display-1"></i>
                    <p class="mt-3">No parking lots found</p>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            searchType: 'name',
            searchText: '',
            results: [],
            searched: false,
            loading: false
        };
    },
    methods: {
        async search() {
            this.loading = true;
            
            try {
                const response = await fetch(API_BASE_URL + '/customer/search', {
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
                    this.results = data.lots;
                    this.searched = true;
                }
            } catch (err) {
                console.error('Error:', err);
            } finally {
                this.loading = false;
            }
        }
    }
};
