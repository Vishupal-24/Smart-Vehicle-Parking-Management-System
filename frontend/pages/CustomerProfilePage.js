// Customer profile editor for vehicle and contact info
const CustomerProfilePage = {
    name: 'CustomerProfilePage',
    template: `
        <div class="container py-4">
            <div class="row justify-content-center">
                <div class="col-md-8 col-lg-6">
                    <div class="card shadow">
                        <div class="card-header bg-primary text-white">
                            <h4 class="mb-0"><i class="bi bi-person me-2"></i>My Profile</h4>
                        </div>
                        <div class="card-body p-4">
                            <div v-if="error" class="alert alert-danger">{{ error }}</div>
                            <div v-if="success" class="alert alert-success">{{ success }}</div>
                            
                            <form @submit.prevent="saveProfile">
                                <div class="mb-3">
                                    <label for="fullName" class="form-label">Full Name *</label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="fullName" 
                                        v-model="profile.full_name"
                                        required>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="phoneNo" class="form-label">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        class="form-control" 
                                        id="phoneNo" 
                                        v-model="profile.phone_no"
                                        placeholder="10-digit number">
                                </div>
                                
                                <div class="mb-3">
                                    <label for="address" class="form-label">Address</label>
                                    <textarea 
                                        class="form-control" 
                                        id="address" 
                                        v-model="profile.address"
                                        rows="2"></textarea>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="pincode" class="form-label">Pincode</label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="pincode" 
                                        v-model="profile.pincode"
                                        maxlength="6">
                                </div>
                                
                                <hr>
                                <h5 class="mb-3">Vehicle Information</h5>
                                
                                <div class="mb-3">
                                    <label for="vehicleNumber" class="form-label">Vehicle Number</label>
                                    <input 
                                        type="text" 
                                        class="form-control" 
                                        id="vehicleNumber" 
                                        v-model="profile.vehicle_number"
                                        placeholder="e.g., DL01AB1234">
                                </div>
                                
                                <div class="mb-3">
                                    <label for="vehicleType" class="form-label">Vehicle Type</label>
                                    <select class="form-select" id="vehicleType" v-model="profile.vehicle_type">
                                        <option value="2-wheeler">2-Wheeler</option>
                                        <option value="4-wheeler">4-Wheeler</option>
                                    </select>
                                </div>
                                
                                <button type="submit" class="btn btn-primary w-100" :disabled="saving">
                                    <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                                    <i class="bi bi-check-lg me-1" v-else></i>Save Profile
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            profile: {
                full_name: '',
                phone_no: '',
                address: '',
                pincode: '',
                vehicle_number: '',
                vehicle_type: '4-wheeler'
            },
            error: '',
            success: '',
            saving: false
        };
    },
    created() {
        this.fetchProfile();
    },
    methods: {
        async fetchProfile() {
            try {
                const response = await fetch(API_BASE_URL + '/customer/profile', {
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.profile) {
                        this.profile = { ...this.profile, ...data.profile };
                    }
                }
            } catch (err) {
                console.error('Error:', err);
            }
        },
        async saveProfile() {
            this.saving = true;
            this.error = '';
            this.success = '';
            
            try {
                const response = await fetch(API_BASE_URL + '/customer/profile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify(this.profile)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    this.success = 'Profile saved successfully!';
                    // If this is first time profile, redirect to dashboard
                    setTimeout(() => {
                        this.$router.push('/customer/dashboard');
                    }, 1500);
                } else {
                    this.error = data.error || 'Failed to save profile';
                }
            } catch (err) {
                this.error = 'Network error';
            } finally {
                this.saving = false;
            }
        }
    }
};
