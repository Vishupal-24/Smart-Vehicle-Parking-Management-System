# 🚗 Vehicle Parking Management System V2

A multi-user web application for managing parking lots, spots, and vehicles — built with a **Flask** backend, **Vue.js** frontend, **Redis** caching, and **Celery** background jobs.

---

## 📽️ Demo Video

▶️ **[Watch the Project Demo](https://drive.google.com/file/d/1otF0RZeWeOVNzqMmRzsQI2i2Wp-o6hS7/view)**

## 📄 Project Documentation

📑 **[View Full Project Document](https://drive.google.com/file/d/1Oc33PLsyZK62_4RO2oWiSkeoq2R82Knt/view?usp=sharing)**

---

## ✨ Features

### 👤 Admin
- Create / Edit / Delete parking lots
- Manage parking spots (auto-created based on lot capacity)
- View all registered users and their status
- View parking spot status and parked vehicle details
- Summary charts for parking lots and spots
- Trigger scheduled Celery tasks manually

### 🙋 User
- Register / Login with **JWT authentication**
- Choose an available parking lot (spot auto-allocated)
- Book a parking spot with **real-time time tracking**
- **Live duration counter** and **current cost display** during parking
- Release/vacate spot with **automatic time-based billing**
- View booking summary with charts showing hours parked
- Review historical spending, duration, and rating data in dashboards

---

## 🛠️ Tech Stack

| Component       | Technology               |
|----------------|--------------------------|
| Backend         | Flask 3.1.0              |
| Frontend        | Vue.js 2 (CDN)           |
| Database        | SQLite                   |
| Caching         | Redis *(required)*       |
| Background Jobs | Celery *(required)*      |
| Styling         | Bootstrap 5              |
| Charts          | Chart.js                 |
| Authentication  | Flask-JWT-Extended       |

---

## ⏱️ Time-Based Pricing (Key Feature)

The system tracks **exact parking duration** and calculates charges based on **actual time spent**:

| Feature | Detail |
|---|---|
| ✅ Real-time tracking | Live duration updates every minute on dashboard |
| ✅ Fair billing | Pay only for actual time used (rounded up to next hour) |
| ✅ Live cost display | See estimated cost while actively parked |
| ✅ Analytics | View total hours parked and average cost per hour |

### How It Works

```
1. Book Parking   → System records exact start time
2. During Parking → Dashboard shows live duration ("3h 45m") and cost ("₹180")
3. Complete       → Actual hours calculated, rounded up, total billed
4. Analytics      → Hours parked + cost efficiency visible in dashboard
```

**Example:**
```
Started:   10:00 AM
Completed:  1:45 PM
─────────────────────
Actual Time: 3.75 hours
Hours Charged: 4 hours (rounded up)
Total Amount: 4 × ₹45 = ₹180
```

---

## 📁 Project Structure

```
PROJECT/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── models.py           # SQLAlchemy models
│   ├── tasks.py            # Celery background tasks
│   ├── celery_config.py    # Celery configuration
│   ├── requirements.txt    # Python dependencies
│   └── instance/           # SQLite database (parking.db)
├── frontend/
│   ├── index.html          # SPA entry point
│   ├── app.js              # Vue root instance
│   ├── components/
│   │   └── Navbar.js
│   ├── pages/              # All page components
│   └── utils/
│       ├── api.js          # API configuration
│       └── router.js       # Vue Router
├── start.sh                # Start all services
├── stop.sh                 # Stop all services
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Redis Server

```bash
# macOS
brew install redis
```

### Quick Start *(Recommended)*

```bash
cd PROJECT
chmod +x start.sh stop.sh
./start.sh
```

This script will automatically:
1. Start Redis server
2. Create Python virtual environment
3. Install all dependencies
4. Start Celery worker (background tasks)
5. Start Celery beat (scheduled tasks)
6. Start Flask server

### Manual Setup

```bash
# Start Redis
redis-server

# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start Celery worker
celery -A app.celery worker --loglevel=info

# Start Celery beat (scheduler)
celery -A app.celery beat --loglevel=info

# Start Flask
python3 app.py
```

### Access the App

| URL | Description |
|-----|-------------|
| http://localhost:5001 | Web Application |
| http://localhost:5001/apidocs | Swagger API Docs |

### Default Credentials

| Role  | Username           | Password  |
|-------|--------------------|-----------|
| Admin | admin@parking.com  | admin123  |

---

## 📡 API Reference

### Authentication

| Method | Endpoint       | Description       |
|--------|----------------|-------------------|
| POST   | `/register`    | User registration |
| POST   | `/login`       | User login        |
| POST   | `/admin/login` | Admin login       |

### Customer

| Method   | Endpoint                          | Description                      |
|----------|-----------------------------------|----------------------------------|
| GET/PUT  | `/customer/profile`               | Get / Update profile             |
| GET      | `/customer/dashboard`             | Dashboard with parking lots      |
| POST     | `/customer/book/<lot_id>`         | Book a parking spot              |
| PUT      | `/customer/booking/<id>/complete` | Complete booking with rating     |
| PUT      | `/customer/booking/<id>/cancel`   | Cancel booking                   |
| POST     | `/customer/search`                | Search parking lots              |
| GET      | `/customer/summary`               | Booking summary *(cached 5 min)* |

### Admin

| Method         | Endpoint                              | Description                        |
|----------------|---------------------------------------|------------------------------------|
| GET            | `/admin/dashboard`                    | Dashboard statistics               |
| GET/POST       | `/admin/lots`                         | List / Create parking lots         |
| GET/PUT/DELETE | `/admin/lots/<id>`                    | Manage a specific lot              |
| GET            | `/admin/users`                        | List all users                     |
| PUT            | `/admin/users/<id>/<field>/<value>`   | Update user status                 |
| POST           | `/admin/search`                       | Search all entities                |
| GET            | `/admin/summary`                      | Analytics summary *(cached 5 min)* |
| POST           | `/admin/trigger/daily-reminders`      | Trigger reminders manually         |
| POST           | `/admin/trigger/monthly-report`       | Trigger monthly report manually    |

---

## ⚙️ Background Jobs (Celery)

### Scheduled Tasks

| Task             | Schedule            | Description                                    |
|------------------|---------------------|------------------------------------------------|
| Daily Reminders  | 6:00 PM daily       | Reminds users who haven't booked recently      |
| Monthly Report   | 1st of each month   | Sends HTML activity report to all users        |

### Manual Trigger (Admin Only)

```bash
# Trigger daily reminders
curl -X POST http://localhost:5001/admin/trigger/daily-reminders \
  -H "Authorization: Bearer <token>"

# Trigger monthly report
curl -X POST http://localhost:5001/admin/trigger/monthly-report \
  -H "Authorization: Bearer <token>"
```

---

## 🔴 Redis Caching

Cached endpoints:
- `/customer/summary` — 5 minutes
- `/admin/summary` — 5 minutes

```bash
# Check cache status
curl http://localhost:5001/api/cache/status

# Check Celery status
curl http://localhost:5001/api/celery/status
```

---

## 📧 Email & Notifications

Configure these environment variables for email notifications:

```bash
export MAIL_SERVER=smtp.gmail.com
export MAIL_PORT=587
export MAIL_USERNAME=your-email@gmail.com
export MAIL_PASSWORD=your-app-password

# Optional: Google Chat webhook
export GOOGLE_CHAT_WEBHOOK_URL=your-webhook-url
```

---

## 🗄️ Database Schema

| Table            | Key Fields                                                                                  |
|------------------|---------------------------------------------------------------------------------------------|
| `Users`          | id, username, password, role, approved, blocked, created_at                                 |
| `CustomerProfile`| id, user_id, full_name, phone_no, address, pincode, vehicle_number, vehicle_type            |
| `ParkingLot`     | id, name, address, pincode, price_per_hour, max_spots, description, is_active               |
| `ParkingSpot`    | id, lot_id, spot_number, status (A/O/R/M), spot_type                                        |
| `Booking`        | id, customer_id, lot_id, spot_id, start_time, end_time, **actual_hours**, **hours_charged**, total_amount, rating |

---

## 🛑 Stopping Services

```bash
./stop.sh
```

Or manually:

```bash
pkill -f "celery -A app.celery"
pkill -f "python3 app.py"
redis-cli shutdown
```

---

## 🧑‍💻 Dev Notes

- After pulling fresh migrations, run `flask db upgrade` inside `backend/venv` or the login screen will 500.
- Redis likes to linger after crashes — `redis-cli ping` is a quick smoke test before blaming Vue.
- No hot-reload here; keep browser devtools console open to catch Flask prints while tweaking charts.

---

## 📚 Additional Documentation

| File | Description |
|------|-------------|
| `TIME_TRACKING_FEATURE.md` | Implementation details for time-based billing |
| `TIME_TRACKING_FLOW.md` | Visual flow diagrams |
| `QUICK_START.md` | Complete setup guide |

---

## 📜 License

MIT License
