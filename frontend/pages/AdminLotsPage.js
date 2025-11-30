// Admin screen for creating lots and tweaking spot layouts
const AdminLotsPage = {
    name: 'AdminLotsPage',
    template: `
        <div class="container-fluid py-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h2><i class="bi bi-building me-2"></i>Parking Lots</h2>
                <button class="btn btn-primary" @click="showAddModal = true">
                    <i class="bi bi-plus-circle me-1"></i>Add New Lot
                </button>
            </div>
            
            <!-- Lots Table -->
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Address</th>
                                    <th>Pincode</th>
                                    <th>Price/Hr</th>
                                    <th>Spots</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="lot in lots" :key="lot.id">
                                    <td>{{ lot.id }}</td>
                                    <td>{{ lot.name }}</td>
                                    <td>{{ lot.address }}</td>
                                    <td>{{ lot.pincode }}</td>
                                    <td>₹{{ lot.price_per_hour }}</td>
                                    <td>
                                        <span class="text-success">{{ lot.available_spots }}</span> / 
                                        {{ lot.max_spots }}
                                    </td>
                                    <td>
                                        <span class="badge" :class="lot.is_active ? 'bg-success' : 'bg-secondary'">
                                            {{ lot.is_active ? 'Active' : 'Inactive' }}
                                        </span>
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-outline-primary me-1" @click="editLot(lot)">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" @click="deleteLot(lot.id)">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <!-- Add/Edit Modal -->
            <div class="modal fade" :class="{ show: showAddModal || showEditModal }" :style="{ display: (showAddModal || showEditModal) ? 'block' : 'none' }" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">{{ showEditModal ? 'Edit' : 'Add' }} Parking Lot</h5>
                            <button type="button" class="btn-close" @click="closeModal"></button>
                        </div>
                        <form @submit.prevent="saveLot">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label class="form-label">Name *</label>
                                    <input type="text" class="form-control" v-model="form.name" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Address *</label>
                                    <textarea class="form-control" v-model="form.address" required></textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Pincode *</label>
                                    <input type="text" class="form-control" v-model="form.pincode" maxlength="6" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Price per Hour (₹) *</label>
                                    <input type="number" class="form-control" v-model="form.price_per_hour" min="1" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Max Spots *</label>
                                    <input type="number" class="form-control" v-model="form.max_spots" min="1" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Description</label>
                                    <textarea class="form-control" v-model="form.description"></textarea>
                                </div>
                                <div class="mb-3 form-check" v-if="showEditModal">
                                    <input type="checkbox" class="form-check-input" id="isActive" v-model="form.is_active">
                                    <label class="form-check-label" for="isActive">Active</label>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
                                <button type="submit" class="btn btn-primary" :disabled="saving">
                                    <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <div class="modal-backdrop fade show" v-if="showAddModal || showEditModal" @click="closeModal"></div>
        </div>
    `,
    data() {
        return {
            lots: [],
            showAddModal: false,
            showEditModal: false,
            editingId: null,
            saving: false,
            form: {
                name: '',
                address: '',
                pincode: '',
                price_per_hour: 50,
                max_spots: 10,
                description: '',
                is_active: true
            }
        };
    },
    created() {
        this.fetchLots();
    },
    methods: {
        async fetchLots() {
            try {
                const response = await fetch(API_BASE_URL + '/admin/lots', {
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.lots = data.lots;
                }
            } catch (err) {
                console.error('Error:', err);
            }
        },
        editLot(lot) {
            this.form = { ...lot };
            this.editingId = lot.id;
            this.showEditModal = true;
        },
        closeModal() {
            this.showAddModal = false;
            this.showEditModal = false;
            this.editingId = null;
            this.form = {
                name: '',
                address: '',
                pincode: '',
                price_per_hour: 50,
                max_spots: 10,
                description: '',
                is_active: true
            };
        },
        async saveLot() {
            this.saving = true;
            
            try {
                const url = this.editingId ? API_BASE_URL + `/admin/lots/${this.editingId}` : API_BASE_URL + '/admin/lots';
                const method = this.editingId ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify(this.form)
                });
                
                if (response.ok) {
                    this.closeModal();
                    this.fetchLots();
                } else {
                    alert('Failed to save lot');
                }
            } catch (err) {
                console.error('Error:', err);
            } finally {
                this.saving = false;
            }
        },
        async deleteLot(lotId) {
            if (!confirm('Are you sure you want to delete this parking lot?')) return;
            
            try {
                const response = await fetch(API_BASE_URL + `/admin/lots/${lotId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                
                if (response.ok) {
                    this.fetchLots();
                }
            } catch (err) {
                console.error('Error:', err);
            }
        }
    }
};
