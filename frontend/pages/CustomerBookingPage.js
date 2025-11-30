// Booking workflow for customers picking a lot and slot
const CustomerBookingPage = {
    name: 'CustomerBookingPage',
    template: `
        <div class="container py-4">
            <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                    <div class="card shadow">
                        <div class="card-header bg-primary text-white">
                            <h4 class="mb-0"><i class="bi bi-calendar-plus me-2"></i>Book Parking</h4>
                        </div>
                        <div class="card-body p-4">
                            <div v-if="loading" class="text-center py-4">
                                <div class="spinner-border text-primary"></div>
                            </div>
                            
                            <div v-else-if="lot">
                                <!-- Lot Info -->
                                <div class="alert alert-info">
                                    <h5>{{ lot.name }}</h5>
                                    <p class="mb-1"><i class="bi bi-geo-alt me-1"></i>{{ lot.address }}</p>
                                    <p class="mb-0"><i class="bi bi-currency-rupee"></i>{{ lot.price_per_hour }}/hour</p>
                                </div>
                                
                                <div v-if="error" class="alert alert-danger">{{ error }}</div>
                                <div v-if="success" class="alert alert-success">{{ success }}</div>
                                
                                <form @submit.prevent="bookParking" v-if="!success">
                                    <div class="alert alert-info">
                                        <i class="bi bi-info-circle me-2"></i>
                                        Parking will start immediately. You'll be charged based on actual time used (₹{{ lot.price_per_hour }}/hour).
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Vehicle Number *</label>
                                        <input type="text" class="form-control" v-model="booking.vehicle_number" placeholder="e.g., DL01AB1234" required>
                                    </div>
                                    
                                    <div class="mb-3">
                                        <label class="form-label">Vehicle Type</label>
                                        <select class="form-select" v-model="booking.vehicle_type">
                                            <option value="2-wheeler">2-Wheeler</option>
                                            <option value="4-wheeler">4-Wheeler</option>
                                        </select>
                                    </div>
                                    
                                    <button type="submit" class="btn btn-primary w-100" :disabled="submitting">
                                        <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
                                        Confirm Booking
                                    </button>
                                </form>
                                
                                <div v-if="success" class="text-center">
                                    <router-link to="/customer/dashboard" class="btn btn-primary">
                                        Go to Dashboard
                                    </router-link>
                                </div>
                            </div>
                            
                            <div v-else class="text-center text-muted py-4">
                                Parking lot not found
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            lot: null,
            booking: {
                vehicle_number: '',
                vehicle_type: '4-wheeler'
            },
            loading: true,
            submitting: false,
            error: '',
            success: ''
        };
    },
    created() {
        this.fetchLot();
    },
    methods: {
        async fetchLot() {
            const lotId = this.$route.params.id;
            
            try {
                const response = await fetch(API_BASE_URL + '/customer/dashboard', {
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.lot = data.lots.find(l => l.id == lotId);
                    
                    // Pre-fill vehicle info if available
                    const profileResponse = await fetch(API_BASE_URL + '/customer/profile', {
                        headers: {
                            'Authorization': 'Bearer ' + localStorage.getItem('token')
                        }
                    });
                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        if (profileData.profile) {
                            this.booking.vehicle_number = profileData.profile.vehicle_number || '';
                            this.booking.vehicle_type = profileData.profile.vehicle_type || '4-wheeler';
                        }
                    }
                }
            } catch (err) {
                console.error('Error:', err);
            } finally {
                this.loading = false;
            }
        },
        async bookParking() {
            this.submitting = true;
            this.error = '';
            
            try {
                const response = await fetch(API_BASE_URL + `/customer/book/${this.lot.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify(this.booking)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    this.success = `✅ Parking started! Your spot is ${data.spot.spot_number}. Timer has begun at ₹${data.price_per_hour}/hour.`;
                } else {
                    this.error = data.error || 'Booking failed';
                }
            } catch (err) {
                this.error = 'Network error';
            } finally {
                this.submitting = false;
            }
        }
    }
};
