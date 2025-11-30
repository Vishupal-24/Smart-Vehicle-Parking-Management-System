// Customer dashboard showing nearby lots, pricing, and bookings
const CustomerDashboardPage = {
    name: 'CustomerDashboardPage',
    template: `
        <div class="container-fluid py-4">
            <div class="row">
                <div class="col-12">
                    <h2 class="mb-4"><i class="bi bi-speedometer2 me-2"></i>Dashboard</h2>
                </div>
            </div>
            
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
            
            <div v-else>
                <!-- Active Bookings -->
                <div class="row mb-3" v-if="activeBookings.length">
                    <div class="col-12">
                        <h4><i class="bi bi-hourglass-split me-2"></i>Active Parking Session</h4>
                    </div>
                </div>
                
                <div class="row" v-if="activeBookings.length">
                    <div class="col-md-6 col-lg-4 mb-4" v-for="booking in activeBookings" :key="booking.id">
                        <div class="card h-100 border-primary">
                            <div class="card-header d-flex justify-content-between align-items-center bg-primary text-white">
                                <strong><i class="bi bi-stopwatch me-1"></i>Active</strong>
                                <span class="badge bg-light text-primary">
                                    {{ calculateDuration(booking.start_time) }}
                                </span>
                            </div>
                            <div class="card-body">
                                <p class="mb-2">
                                    <i class="bi bi-building me-1"></i><strong>Lot:</strong> {{ getLotName(booking.lot_id) }}
                                </p>
                                <p class="mb-2">
                                    <i class="bi bi-square me-1"></i><strong>Spot:</strong> {{ getSpotNumber(booking.spot_id) }}
                                </p>
                                <p class="mb-2">
                                    <i class="bi bi-car-front me-1"></i><strong>Vehicle:</strong> {{ booking.vehicle_number }}
                                </p>
                                <p class="mb-2">
                                    <i class="bi bi-clock-history me-1"></i><strong>Started:</strong> {{ formatDateTime(booking.start_time) }}
                                </p>
                                <p class="mb-3">
                                    <i class="bi bi-currency-rupee"></i><strong>Current:</strong> 
                                    <span class="text-success fs-5 fw-bold">₹{{ calculateCurrentCost(booking) }}</span>
                                    <small class="text-muted"> @ ₹{{ getLotPrice(booking.lot_id) }}/hour</small>
                                </p>
                                
                                <button class="btn btn-success w-100" @click="completeBooking(booking.id)">
                                    <i class="bi bi-check-circle me-1"></i>Complete & Pay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Available Parking Lots -->
                <div class="row mb-3">
                    <div class="col-12">
                        <h4><i class="bi bi-building me-2"></i>Available Parking Lots</h4>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6 col-lg-4 mb-4" v-for="lot in lots" :key="lot.id">
                        <div class="card h-100">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <strong>{{ lot.name }}</strong>
                                <span class="badge" :class="lot.available_spots > 0 ? 'bg-success' : 'bg-danger'">
                                    {{ lot.available_spots }} spots
                                </span>
                            </div>
                            <div class="card-body">
                                <p class="mb-2">
                                    <i class="bi bi-geo-alt me-1"></i>{{ lot.address }}
                                </p>
                                <p class="mb-2">
                                    <i class="bi bi-mailbox me-1"></i>{{ lot.pincode }}
                                </p>
                                <p class="mb-2">
                                    <i class="bi bi-currency-rupee"></i>{{ lot.price_per_hour }}/hour
                                </p>
                                <p class="mb-3">
                                    <span class="text-success">Available: {{ lot.available_spots }}</span> / 
                                    <span class="text-danger">Occupied: {{ lot.occupied_spots }}</span>
                                </p>
                                
                                <!-- Spot visualization -->
                                <div class="mb-3">
                                    <span 
                                        v-for="spot in lot.spots" 
                                        :key="spot.id"
                                        class="spot"
                                        :class="spot.status === 'A' ? 'spot-available' : 'spot-occupied'"
                                        :title="spot.spot_number">
                                        {{ spot.spot_number.replace('S', '') }}
                                    </span>
                                </div>
                                
                                <router-link 
                                    :to="'/customer/book/' + lot.id" 
                                    class="btn btn-primary w-100"
                                    :class="{ disabled: lot.available_spots === 0 }">
                                    <i class="bi bi-calendar-plus me-1"></i>Book Now
                                </router-link>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Empty State -->
                <div v-if="!lots.length" class="text-center py-5">
                    <i class="bi bi-building display-1 text-muted"></i>
                    <p class="mt-3 text-muted">No parking lots available</p>
                </div>
                
                <!-- Past Bookings -->
                <div class="row mt-4" v-if="pastBookings.length">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0"><i class="bi bi-clock me-2"></i>Booking History</h5>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Lot</th>
                                                <th>Vehicle</th>
                                                <th>Start Time</th>
                                                <th>End Time</th>
                                                <th>Duration</th>
                                                <th>Amount</th>
                                                <th>Status</th>
                                                <th>Rating</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="booking in pastBookings" :key="booking.id">
                                                <td>#{{ booking.id }}</td>
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
                                                <td>
                                                    <span v-if="booking.rating">
                                                        <i class="bi bi-star-fill text-warning" v-for="n in booking.rating" :key="n"></i>
                                                    </span>
                                                    <span v-else class="text-muted">-</span>
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
        </div>
    `,
    data() {
        return {
            lots: [],
            bookings: [],
            lotDict: {},
            loading: true
        };
    },
    computed: {
        activeBookings() {
            return this.bookings.filter(b => ['requested', 'confirmed', 'active'].includes(b.status));
        },
        pastBookings() {
            const past = this.bookings.filter(b => ['completed', 'cancelled'].includes(b.status));
            // Sort by created_at or start_time descending (most recent first)
            return past.sort((a, b) => {
                const dateA = new Date(a.start_time || a.created_at);
                const dateB = new Date(b.start_time || b.created_at);
                return dateB - dateA;
            });
        }
    },
    created() {
        this.fetchData();
        // Update time and cost every minute for active bookings
        setInterval(() => {
            if (this.activeBookings.length) {
                this.$forceUpdate();
            }
        }, 60000);
    },
    methods: {
        async fetchData() {
            try {
                const response = await fetch(API_BASE_URL + '/customer/dashboard', {
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.lots = data.lots;
                    this.bookings = data.bookings;
                    this.lotDict = data.lot_dict;
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                this.loading = false;
            }
        },
        getLotName(lotId) {
            return this.lotDict[lotId]?.name || 'Unknown';
        },
        getSpotNumber(spotId) {
            const spot = this.lots.flatMap(l => l.spots || []).find(s => s.id === spotId);
            return spot ? spot.spot_number : 'N/A';
        },
        getLotPrice(lotId) {
            return this.lotDict[lotId]?.price_per_hour || 0;
        },
        formatDate(dateStr) {
            if (!dateStr) return '-';
            return new Date(dateStr).toLocaleDateString();
        },
        formatTime(timeStr) {
            if (!timeStr) return '-';
            return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        },
        formatDateTime(dateStr) {
            if (!dateStr) return '-';
            // Ensure UTC parsing
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
            // If actual_hours is stored in DB, use it
            if (booking.actual_hours) {
                const hours = Math.floor(booking.actual_hours);
                const minutes = Math.round((booking.actual_hours - hours) * 60);
                return `${hours}h ${minutes}m`;
            }
            
            // Otherwise calculate from start and actual_end_time
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
        calculateDuration(startTime) {
            if (!startTime) return '-';
            // Ensure UTC parsing - add 'Z' if not present
            const timeStr = startTime.includes('Z') || startTime.includes('+') ? startTime : startTime + 'Z';
            const start = new Date(timeStr);
            const now = new Date();
            const diff = now - start;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return `${hours}h ${minutes}m`;
        },
        calculateCurrentCost(booking) {
            if (!booking.start_time) return 0;
            // Ensure UTC parsing - add 'Z' if not present
            const timeStr = booking.start_time.includes('Z') || booking.start_time.includes('+') ? booking.start_time : booking.start_time + 'Z';
            const start = new Date(timeStr);
            const now = new Date();
            const diff = now - start;
            const hours = Math.ceil(diff / (1000 * 60 * 60)); // Round up for billing
            const pricePerHour = this.getLotPrice(booking.lot_id);
            return hours * pricePerHour;
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
        },
        async completeBooking(bookingId) {
            const rating = prompt('Rate your experience (1-5):');
            const remarks = prompt('Any feedback?');
            
            try {
                const response = await fetch(API_BASE_URL + `/customer/booking/${bookingId}/complete`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify({ rating: parseInt(rating) || null, remarks })
                });
                
                const data = await response.json();
                if (response.ok) {
                    alert(`Booking completed!\n\nDuration: ${data.actual_hours} hours\nAmount: ₹${data.total_amount}`);
                    this.fetchData();
                } else {
                    alert(data.error || 'Error completing booking');
                }
            } catch (err) {
                console.error('Error:', err);
            }
        },
    }
};
