// Admin summary view with exports, charts, and quick stats
const AdminSummaryPage = {
    name: 'AdminSummaryPage',
    template: `
        <div class="container-fluid py-4">
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <h2 class="mb-0"><i class="bi bi-bar-chart me-2"></i>Summary & Analytics</h2>
                <button class="btn btn-outline-primary" @click="triggerExport" :disabled="isExporting">
                    <span v-if="isExporting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    {{ isExporting ? 'Preparing CSV...' : 'Export All Bookings' }}
                </button>
            </div>
            
            <!-- Stats Cards -->
            <div class="row mb-4">
                <div class="col-md-3 mb-3">
                    <div class="card bg-success text-white">
                        <div class="card-body text-center">
                            <h3>₹{{ formatNumber(summary.total_revenue) }}</h3>
                            <p class="mb-0">Total Revenue</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <h3>{{ summary.total_completed_bookings }}</h3>
                            <p class="mb-0">Completed Bookings</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-warning text-white">
                        <div class="card-body text-center">
                            <h3>{{ formatNumber(summary.total_hours_parked) }}</h3>
                            <p class="mb-0">Total Hours Parked</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <h3>{{ formatNumber(summary.avg_parking_duration) }}h</h3>
                            <p class="mb-0">Avg Duration</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <!-- Bookings Chart -->
                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-header">
                            <h5 class="mb-0">Bookings Over Time</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="bookingsChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Revenue Chart -->
                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-header">
                            <h5 class="mb-0">Revenue Over Time</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="revenueChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Parking Hours Chart -->
                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-header">
                            <h5 class="mb-0">Parking Hours Over Time</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="hoursChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Lot Utilization -->
                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-header">
                            <h5 class="mb-0">Lot Utilization</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="utilizationChart"></canvas>
                        </div>
                    </div>
                </div>
                
                <!-- Ratings Distribution -->
                <div class="col-md-6 mb-4">
                    <div class="card h-100">
                        <div class="card-header">
                            <h5 class="mb-0">Rating Distribution</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="ratingsChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Export History -->
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h5 class="mb-0">CSV Export History</h5>
                    <button class="btn btn-sm btn-outline-secondary" @click="fetchReports" :disabled="reportsLoading">
                        <span v-if="reportsLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                        Refresh
                    </button>
                </div>
                <div class="card-body">
                    <div v-if="exportStatus" class="alert" :class="exportStatusClass">
                        {{ exportStatus }}
                    </div>
                    <div v-if="exportError" class="alert alert-danger">{{ exportError }}</div>
                    <div v-if="!reports.length && !reportsLoading" class="text-muted">No admin exports generated yet.</div>
                    <div v-else class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead>
                                <tr>
                                    <th scope="col">File Name</th>
                                    <th scope="col">Created</th>
                                    <th scope="col">Size</th>
                                    <th scope="col" class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="report in reports" :key="report.filename">
                                    <td>{{ report.filename }}</td>
                                    <td>{{ formatDate(report.created_at) }}</td>
                                    <td>{{ formatFileSize(report.size) }}</td>
                                    <td class="text-end">
                                        <button class="btn btn-sm btn-primary" @click="downloadReport(report.filename)">
                                            <i class="bi bi-download me-1"></i>Download
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            summary: {
                total_revenue: 0,
                total_completed_bookings: 0,
                total_hours_parked: 0,
                total_hours_charged: 0,
                avg_parking_duration: 0,
                bookings_by_date: {},
                revenue_by_date: {},
                hours_by_date: {},
                lot_utilization: [],
                rating_distribution: {}
            },
            charts: [],
            isExporting: false,
            exportStatus: '',
            exportError: '',
            exportTaskId: null,
            exportPollTimer: null,
            reports: [],
            reportsLoading: false
        };
    },
    created() {
        this.fetchSummary();
        this.fetchReports();
    },
    methods: {
        authHeaders() {
            return {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            };
        },
        async fetchSummary() {
            try {
                const response = await fetch(API_BASE_URL + '/admin/summary', {
                    headers: this.authHeaders()
                });
                
                if (response.ok) {
                    this.summary = await response.json();
                    this.$nextTick(() => this.renderCharts());
                }
            } catch (err) {
                console.error('Error:', err);
            }
        },
        async fetchReports() {
            this.reportsLoading = true;
            try {
                const response = await fetch(API_BASE_URL + '/admin/reports/list', {
                    headers: this.authHeaders()
                });
                if (response.ok) {
                    const data = await response.json();
                    this.reports = data.reports || [];
                }
            } catch (err) {
                console.error('Failed to load admin reports', err);
            } finally {
                this.reportsLoading = false;
            }
        },
        async triggerExport() {
            this.exportError = '';
            this.exportStatus = 'Preparing export of all bookings...';
            this.isExporting = true;
            try {
                const response = await fetch(API_BASE_URL + '/admin/export', {
                    method: 'POST',
                    headers: {
                        ...this.authHeaders(),
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Export request failed');
                }

                const data = await response.json();

                if (data.status === 'completed' && data.result) {
                    const fileName = data.result.filename || 'admin_export.csv';
                    const recordCount = typeof data.result.records === 'number' ? data.result.records : 'unknown';
                    this.exportStatus = `Export ready: ${fileName} (${recordCount} records)`;
                    this.isExporting = false;
                    this.exportTaskId = null;
                    this.fetchReports();
                    return;
                }

                if (!data.task_id) {
                    throw new Error('Export task could not be scheduled');
                }

                this.exportTaskId = data.task_id;
                this.startExportPolling();
            } catch (err) {
                console.error('Admin export error', err);
                this.exportError = 'Unable to start admin export. Please try again later.';
                this.isExporting = false;
                this.exportStatus = '';
            }
        },
        startExportPolling() {
            this.stopExportPolling();
            this.exportPollTimer = setInterval(() => this.checkExportStatus(), 3000);
        },
        stopExportPolling() {
            if (this.exportPollTimer) {
                clearInterval(this.exportPollTimer);
                this.exportPollTimer = null;
            }
        },
        async checkExportStatus() {
            if (!this.exportTaskId) return;
            try {
                const response = await fetch(`${API_BASE_URL}/admin/export/status/${this.exportTaskId}`, {
                    headers: this.authHeaders()
                });
                if (!response.ok) {
                    throw new Error('Status check failed');
                }
                const data = await response.json();
                if (data.status === 'completed') {
                    const result = data.result || {};
                    const fileName = result.filename || 'admin_export.csv';
                    const recordCount = typeof result.records === 'number' ? result.records : 'unknown';
                    this.exportStatus = `Export ready: ${fileName} (${recordCount} records)`;
                    this.isExporting = false;
                    this.exportTaskId = null;
                    this.stopExportPolling();
                    this.fetchReports();
                } else {
                    this.exportStatus = 'Export is still processing...';
                }
            } catch (err) {
                console.error('Admin export polling error', err);
                this.exportError = 'Failed to check export status.';
                this.isExporting = false;
                this.exportTaskId = null;
                this.stopExportPolling();
            }
        },
        async downloadReport(filename) {
            try {
                const response = await fetch(`${API_BASE_URL}/admin/reports/download/${filename}`, {
                    headers: this.authHeaders()
                });
                if (!response.ok) {
                    throw new Error('Download failed');
                }
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } catch (err) {
                console.error('Admin download error', err);
                this.exportError = 'Unable to download export. Please retry.';
            }
        },
        renderCharts() {
            // Bookings Chart
            const bookingsDates = Object.keys(this.summary.bookings_by_date)
                .sort((a, b) => new Date(a) - new Date(b));
            const bookingsCounts = bookingsDates.map(d => this.summary.bookings_by_date[d]);
            
            this.charts.push(new Chart(document.getElementById('bookingsChart'), {
                type: 'bar',
                data: {
                    labels: bookingsDates,
                    datasets: [{
                        label: 'Bookings',
                        data: bookingsCounts,
                        backgroundColor: 'rgba(13, 110, 253, 0.7)',
                        borderColor: 'rgba(13, 110, 253, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                        }
                    }
                }
            }));
            
            // Revenue Chart
            const revenueDates = Object.keys(this.summary.revenue_by_date)
                .sort((a, b) => new Date(a) - new Date(b));
            const revenueAmounts = revenueDates.map(d => this.summary.revenue_by_date[d]);
            
            this.charts.push(new Chart(document.getElementById('revenueChart'), {
                type: 'bar',
                data: {
                    labels: revenueDates,
                    datasets: [{
                        label: 'Revenue (₹)',
                        data: revenueAmounts,
                        backgroundColor: 'rgba(25, 135, 84, 0.7)'
                    }]
                },
                options: { responsive: true }
            }));
            
            // Parking Hours Chart
            const hoursDates = Object.keys(this.summary.hours_by_date || {})
                .sort((a, b) => new Date(a) - new Date(b));
            const hoursData = hoursDates.map(d => this.summary.hours_by_date[d]);
            
            this.charts.push(new Chart(document.getElementById('hoursChart'), {
                type: 'line',
                data: {
                    labels: hoursDates,
                    datasets: [{
                        label: 'Total Hours',
                        data: hoursData,
                        borderColor: 'rgb(255, 193, 7)',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        tension: 0.1,
                        fill: true
                    }]
                },
                options: { 
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Hours' }
                        }
                    }
                }
            }));
            
            // Utilization Chart
            const lotNames = this.summary.lot_utilization.map(l => l.name);
            const occupied = this.summary.lot_utilization.map(l => l.occupied);
            const available = this.summary.lot_utilization.map(l => l.available);
            
            this.charts.push(new Chart(document.getElementById('utilizationChart'), {
                type: 'bar',
                data: {
                    labels: lotNames,
                    datasets: [
                        { label: 'Occupied', data: occupied, backgroundColor: 'rgba(220, 53, 69, 0.7)' },
                        { label: 'Available', data: available, backgroundColor: 'rgba(25, 135, 84, 0.7)' }
                    ]
                },
                options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } } }
            }));
            
            // Ratings Chart
            const ratings = ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'];
            const ratingCounts = [1, 2, 3, 4, 5].map(r => this.summary.rating_distribution[r] || 0);
            
            this.charts.push(new Chart(document.getElementById('ratingsChart'), {
                type: 'doughnut',
                data: {
                    labels: ratings,
                    datasets: [{
                        data: ratingCounts,
                        backgroundColor: [
                            'rgba(220, 53, 69, 0.7)',
                            'rgba(255, 193, 7, 0.7)',
                            'rgba(13, 202, 240, 0.7)',
                            'rgba(13, 110, 253, 0.7)',
                            'rgba(25, 135, 84, 0.7)'
                        ]
                    }]
                },
                options: { responsive: true }
            }));
        },
        formatNumber(value) {
            if (!value && value !== 0) return '0.00';
            return parseFloat(value).toFixed(2);
        },
        formatFileSize(bytes) {
            if (!bytes && bytes !== 0) return '0 B';
            const sizes = ['B', 'KB', 'MB', 'GB'];
            if (bytes === 0) return '0 B';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
        },
        formatDate(isoString) {
            if (!isoString) return '-';
            return new Date(isoString).toLocaleString();
        }
    },
    computed: {
        exportStatusClass() {
            if (this.isExporting) return 'alert-info';
            return this.exportStatus ? 'alert-success' : 'alert-secondary';
        }
    },
    beforeDestroy() {
        this.charts.forEach(c => c.destroy());
        this.stopExportPolling();
    }
};
