// Customer summary cards, charts, and CSV export actions
const CustomerSummaryPage = {
    name: 'CustomerSummaryPage',
    template: `
        <div class="container py-4">
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <h2 class="mb-0"><i class="bi bi-bar-chart me-2"></i>Booking Summary</h2>
                <button class="btn btn-outline-primary" @click="triggerExport" :disabled="isExporting">
                    <span v-if="isExporting" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    {{ isExporting ? 'Preparing CSV...' : 'Export CSV' }}
                </button>
            </div>
            
            <!-- Stats Cards -->
            <div class="row mb-4">
                <div class="col-md-3 mb-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body text-center">
                            <h3>{{ summary.total_bookings }}</h3>
                            <p class="mb-0">Total Bookings</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-success text-white">
                        <div class="card-body text-center">
                            <h3>₹{{ formatNumber(summary.total_spent) }}</h3>
                            <p class="mb-0">Total Spent</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-warning text-white">
                        <div class="card-body text-center">
                            <h3>{{ formatNumber(summary.total_hours_parked) }}</h3>
                            <p class="mb-0">Hours Parked</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3 mb-3">
                    <div class="card bg-info text-white">
                        <div class="card-body text-center">
                            <h3>₹{{ formatNumber(summary.avg_cost_per_hour) }}</h3>
                            <p class="mb-0">Avg Cost/Hour</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Charts -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Bookings Over Time</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="bookingsChart" height="150"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Parking Hours Over Time</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="hoursChart" height="150"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Export History -->
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h5 class="mb-0">Export History</h5>
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
                    <div v-if="!reports.length && !reportsLoading" class="text-muted">No exports available yet. Start by generating a CSV.</div>
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
                total_bookings: 0,
                total_spent: 0,
                total_hours_parked: 0,
                total_hours_charged: 0,
                avg_cost_per_hour: 0,
                bookings_by_date: {},
                hours_by_date: {}
            },
            bookingsChart: null,
            hoursChart: null,
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
                const response = await fetch(API_BASE_URL + '/customer/summary', {
                    headers: this.authHeaders()
                });
                
                if (response.ok) {
                    this.summary = await response.json();
                    this.$nextTick(() => this.renderChart());
                }
            } catch (err) {
                console.error('Error:', err);
            }
        },
        async fetchReports() {
            this.reportsLoading = true;
            try {
                const response = await fetch(API_BASE_URL + '/customer/reports/list', {
                    headers: this.authHeaders()
                });
                if (response.ok) {
                    const data = await response.json();
                    this.reports = data.reports || [];
                }
            } catch (err) {
                console.error('Failed to load reports', err);
            } finally {
                this.reportsLoading = false;
            }
        },
        async triggerExport() {
            this.exportError = '';
            this.exportStatus = 'Preparing your CSV export...';
            this.isExporting = true;
            try {
                const response = await fetch(API_BASE_URL + '/customer/export', {
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
                    const fileName = data.result.filename || 'export.csv';
                    const recordCount = typeof data.result.records === 'number' ? data.result.records : 'unknown';
                    this.exportStatus = `Export ready: ${fileName} (${recordCount} records)`;
                    this.isExporting = false;
                    this.exportTaskId = null;
                    this.fetchReports();
                    return;
                }

                if (!data.task_id) {
                    throw new Error('Export task could not be scheduled.');
                }

                this.exportTaskId = data.task_id;
                this.startExportPolling();
            } catch (err) {
                console.error('Export error', err);
                this.exportError = 'Unable to start export. Please try again later.';
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
                const response = await fetch(`${API_BASE_URL}/customer/export/status/${this.exportTaskId}`, {
                    headers: this.authHeaders()
                });
                if (!response.ok) {
                    throw new Error('Status check failed');
                }
                const data = await response.json();
                if (data.status === 'completed') {
                    const result = data.result || {};
                    const fileName = result.filename || 'export.csv';
                    const recordCount = typeof result.records === 'number' ? result.records : 'unknown';
                    this.exportStatus = `Export ready: ${fileName} (${recordCount} records)`;
                    this.isExporting = false;
                    this.exportTaskId = null;
                    this.stopExportPolling();
                    this.fetchReports();
                } else {
                    this.exportStatus = 'Still working... hang tight!';
                }
            } catch (err) {
                console.error('Polling error', err);
                this.exportError = 'Failed to check export status.';
                this.isExporting = false;
                this.exportTaskId = null;
                this.stopExportPolling();
            }
        },
        async downloadReport(filename) {
            try {
                const response = await fetch(`${API_BASE_URL}/customer/reports/download/${filename}`, {
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
                console.error('Download error', err);
                this.exportError = 'Unable to download file. Please retry.';
            }
        },
        renderChart() {
            // Bookings Chart
            const bookingsCtx = document.getElementById('bookingsChart');
            if (bookingsCtx) {
                const dates = Object.keys(this.summary.bookings_by_date)
                    .sort((a, b) => new Date(a) - new Date(b));
                const counts = dates.map(d => this.summary.bookings_by_date[d]);
                
                if (this.bookingsChart) {
                    this.bookingsChart.destroy();
                }
                
                this.bookingsChart = new Chart(bookingsCtx, {
                    type: 'bar',
                    data: {
                        labels: dates,
                        datasets: [{
                            label: 'Bookings',
                            data: counts,
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
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                });
            }
            
            // Hours Chart
            const hoursCtx = document.getElementById('hoursChart');
            if (hoursCtx) {
                const hoursDates = Object.keys(this.summary.hours_by_date || {})
                    .sort((a, b) => new Date(a) - new Date(b));
                const hoursData = hoursDates.map(d => this.summary.hours_by_date[d]);
                
                if (this.hoursChart) {
                    this.hoursChart.destroy();
                }
                
                this.hoursChart = new Chart(hoursCtx, {
                    type: 'bar',
                    data: {
                        labels: hoursDates,
                        datasets: [{
                            label: 'Hours Parked',
                            data: hoursData,
                            backgroundColor: 'rgba(255, 193, 7, 0.6)',
                            borderColor: 'rgba(255, 193, 7, 1)',
                            borderWidth: 1
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
                });
            }
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
        if (this.bookingsChart) {
            this.bookingsChart.destroy();
        }
        if (this.hoursChart) {
            this.hoursChart.destroy();
        }
        this.stopExportPolling();
    }
};
