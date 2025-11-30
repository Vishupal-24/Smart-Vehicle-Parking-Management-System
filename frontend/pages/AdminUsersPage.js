// Admin tool for approving, blocking, or deleting user accounts
const AdminUsersPage = {
    name: 'AdminUsersPage',
    template: `
        <div class="container-fluid py-4">
            <h2 class="mb-4"><i class="bi bi-people me-2"></i>User Management</h2>
            
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Email</th>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Vehicle</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="user in users" :key="user.id">
                                    <td>{{ user.id }}</td>
                                    <td>{{ user.username }}</td>
                                    <td>{{ user.profile?.full_name || '-' }}</td>
                                    <td>{{ user.profile?.phone_no || '-' }}</td>
                                    <td>{{ user.profile?.vehicle_number || '-' }}</td>
                                    <td>
                                        <span class="badge bg-success" v-if="user.approved && !user.blocked">Active</span>
                                        <span class="badge bg-warning" v-else-if="!user.approved">Pending</span>
                                        <span class="badge bg-danger" v-else>Blocked</span>
                                    </td>
                                    <td>
                                        <button 
                                            class="btn btn-sm me-1"
                                            :class="user.approved ? 'btn-outline-warning' : 'btn-outline-success'"
                                            @click="toggleApproval(user)">
                                            {{ user.approved ? 'Revoke' : 'Approve' }}
                                        </button>
                                        <button 
                                            class="btn btn-sm"
                                            :class="user.blocked ? 'btn-outline-success' : 'btn-outline-danger'"
                                            @click="toggleBlock(user)">
                                            {{ user.blocked ? 'Unblock' : 'Block' }}
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div v-if="!users.length" class="text-center py-4 text-muted">
                        No users found
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            users: []
        };
    },
    created() {
        this.fetchUsers();
    },
    methods: {
        async fetchUsers() {
            try {
                const response = await fetch(API_BASE_URL + '/admin/users', {
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.users = data.users;
                }
            } catch (err) {
                console.error('Error:', err);
            }
        },
        async toggleApproval(user) {
            const newValue = !user.approved;
            await this.updateUser(user.id, 'approved', newValue);
        },
        async toggleBlock(user) {
            const newValue = !user.blocked;
            await this.updateUser(user.id, 'blocked', newValue);
        },
        async updateUser(userId, field, value) {
            try {
                const response = await fetch(API_BASE_URL + `/admin/users/${userId}/${field}/${value}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    }
                });
                
                if (response.ok) {
                    this.fetchUsers();
                }
            } catch (err) {
                console.error('Error:', err);
            }
        }
    }
};
