"""Flask backend for parking: routes, auth, cache, and Celery hooks."""

import os
import math
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required,
    get_jwt_identity, get_jwt
)
from flask_caching import Cache
from flask_mail import Mail, Message
from werkzeug.security import generate_password_hash, check_password_hash
from flasgger import Swagger

from models import db, User, CustomerProfile, ParkingLot, ParkingSpot, Booking

# App config

app = Flask(__name__, static_folder='../frontend', template_folder='templates')

# Ensure instance folder exists for SQLite DB and exports
os.makedirs(app.instance_path, exist_ok=True)
instance_db_path = os.path.join(app.instance_path, 'parking.db')

# Basic Config
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URI', f'sqlite:///{instance_db_path}')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT Config
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Mail Config
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME', '')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD', '')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER', 'noreply@parkingapp.com')

# Cache Config (Redis) - REQUIRED for caching
app.config['CACHE_TYPE'] = 'RedisCache'
app.config['CACHE_REDIS_HOST'] = os.environ.get('REDIS_HOST', 'localhost')
app.config['CACHE_REDIS_PORT'] = int(os.environ.get('REDIS_PORT', 6379))
app.config['CACHE_REDIS_DB'] = 0
app.config['CACHE_DEFAULT_TIMEOUT'] = 300
app.config['CACHE_KEY_PREFIX'] = 'parking_cache_'

# Celery Config (Redis) - REQUIRED for background jobs
app.config['CELERY_BROKER_URL'] = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/1')
app.config['CELERY_RESULT_BACKEND'] = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')
app.config['CELERY_TASK_SERIALIZER'] = 'json'
app.config['CELERY_RESULT_SERIALIZER'] = 'json'
app.config['CELERY_ACCEPT_CONTENT'] = ['json']

# Export/Reports Config
app.config['EXPORTS_FOLDER'] = os.path.join(app.instance_path, 'exports')
os.makedirs(app.config['EXPORTS_FOLDER'], exist_ok=True)

# Extension setup

db.init_app(app)
jwt = JWTManager(app)
cache = Cache(app)
mail = Mail(app)
CORS(app, resources={r"/*": {"origins": "*"}})
swagger = Swagger(app)

# Celery setup with Flask context
from celery_config import make_celery
celery = make_celery(app)

# Import tasks to register them
import tasks


def _customer_summary_cache_key():
    try:
        user_id = get_jwt_identity()
    except Exception:
        user_id = 'anonymous'
    return f"customer_summary_{user_id}"


def invalidate_customer_summary_cache(user_id):
    cache.delete(f"customer_summary_{str(user_id)}")


def role_required(role):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            claims = get_jwt()
            if claims.get('role') != role:
                return jsonify({'error': 'Access denied. Insufficient permissions.'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# DB bootstrap

@app.before_request
def create_tables():
    if not hasattr(app, '_db_initialized'):
        db.create_all()
        # Create default admin if not exists
        admin = User.query.filter_by(username='admin@parking.com').first()
        if not admin:
            admin = User(
                username='admin@parking.com',
                password=generate_password_hash('admin123'),
                role='admin',
                approved=True
            )
            db.session.add(admin)
            db.session.commit()
        app._db_initialized = True

# Static file routes

@app.route('/')
def serve_frontend():
  
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
   
    static_extensions = ('.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.eot')
    
    if path.endswith(static_extensions):
        
        return send_from_directory('../frontend', path)
    
    
    return send_from_directory('../frontend', 'index.html')

# Auth routes

@app.route('/register', methods=['POST'])
def register():
    
    data = request.get_json()
    username = data.get('username', '').strip().lower()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 400

    user = User(
        username=username,
        password=generate_password_hash(password),
        role='customer',
        approved=True  
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({'message': 'Registration successful. Please login.'}), 201


@app.route('/login', methods=['POST'])
def login():
   
    data = request.get_json()
    username = data.get('username', '').strip().lower()
    password = data.get('password', '').strip()

    user = User.query.filter_by(username=username).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({'error': 'Invalid credentials'}), 401

    if user.role == 'admin':
        return jsonify({'error': 'Please use admin login'}), 401

    if not user.approved:
        return jsonify({'error': 'Account pending approval'}), 403

    if user.blocked:
        return jsonify({'error': 'Account has been blocked'}), 403

    # Check if profile is complete
    profile = CustomerProfile.query.filter_by(user_id=user.id).first()
    redirect_to = '/customer/profile' if not profile else '/customer/dashboard'

    additional_claims = {
        'role': user.role,
        'redirect': redirect_to
    }

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims=additional_claims
    )

    return jsonify({
        'access_token': access_token,
        'role': user.role,
        'redirect': redirect_to,
        'user_id': user.id
    }), 200


@app.route('/admin/login', methods=['POST'])
def admin_login():
    
    data = request.get_json()
    username = data.get('username', '').strip().lower()
    password = data.get('password', '').strip()

    user = User.query.filter_by(username=username, role='admin').first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({'error': 'Invalid admin credentials'}), 401

    additional_claims = {
        'role': user.role,
        'redirect': '/admin/dashboard'
    }

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims=additional_claims
    )

    return jsonify({
        'access_token': access_token,
        'role': user.role,
        'redirect': '/admin/dashboard',
        'user_id': user.id
    }), 200

# Customer routes

@app.route('/customer/profile', methods=['GET', 'POST'])
@jwt_required()
@role_required('customer')
def customer_profile():
 
    user_id = int(get_jwt_identity())

    if request.method == 'GET':
        profile = CustomerProfile.query.filter_by(user_id=user_id).first()
        if profile:
            return jsonify({'profile': profile.as_dict()}), 200
        return jsonify({'profile': None}), 200

    # POST - Update/Create profile
    data = request.get_json()
    profile = CustomerProfile.query.filter_by(user_id=user_id).first()

    if not profile:
        profile = CustomerProfile(user_id=user_id)

    profile.full_name = data.get('full_name', profile.full_name if profile.full_name else '')
    profile.phone_no = data.get('phone_no', profile.phone_no if profile.phone_no else '')
    profile.address = data.get('address', profile.address if profile.address else '')
    profile.pincode = data.get('pincode', profile.pincode if profile.pincode else '')
    profile.vehicle_number = data.get('vehicle_number', profile.vehicle_number if profile.vehicle_number else '')
    profile.vehicle_type = data.get('vehicle_type', profile.vehicle_type if profile.vehicle_type else '4-wheeler')

    db.session.add(profile)
    db.session.commit()

    return jsonify({'message': 'Profile updated', 'profile': profile.as_dict()}), 200


@app.route('/customer/dashboard', methods=['GET'])
@jwt_required()
@role_required('customer')
def customer_dashboard():
   
    user_id = int(get_jwt_identity())

   
    pincode = request.args.get('pincode')
    name = request.args.get('name')

    
    lots_query = ParkingLot.query.filter_by(is_active=True)
    if pincode:
        lots_query = lots_query.filter(ParkingLot.pincode.like(f'%{pincode}%'))
    if name:
        lots_query = lots_query.filter(ParkingLot.name.ilike(f'%{name}%'))

    lots = lots_query.all()
    lots_data = [lot.as_dict() for lot in lots]

   
    for lot_data in lots_data:
        lot = ParkingLot.query.get(lot_data['id'])
        spots = [spot.as_dict() for spot in lot.spots.all()]
        lot_data['spots'] = spots

   
    bookings = Booking.query.filter_by(customer_id=user_id).order_by(Booking.created_at.desc()).all()
    bookings_data = [b.as_dict() for b in bookings]

    lot_dict = {lot['id']: lot for lot in lots_data}

    return jsonify({
        'lots': lots_data,
        'bookings': bookings_data,
        'lot_dict': lot_dict
    }), 200


@app.route('/customer/book/<int:lot_id>', methods=['POST'])
@jwt_required()
@role_required('customer')
def book_parking(lot_id):
 
    user_id = int(get_jwt_identity())
    data = request.get_json()

    lot = ParkingLot.query.get_or_404(lot_id)

    available_spot = lot.spots.filter_by(status='A').first()
    if not available_spot:
        return jsonify({'error': 'No available spots in this parking lot'}), 400

    profile = CustomerProfile.query.filter_by(user_id=user_id).first()

    start_time = datetime.utcnow()

    booking = Booking(
        customer_id=user_id,
        lot_id=lot_id,
        spot_id=available_spot.id,
        vehicle_number=data.get('vehicle_number', profile.vehicle_number if profile else ''),
        vehicle_type=data.get('vehicle_type', profile.vehicle_type if profile else '4-wheeler'),
        status='active',  
        booking_date=start_time.date(),
        start_time=start_time,
        end_time=None, 
        hours_booked=None  
    )

   
    available_spot.status = 'O'

    db.session.add(booking)
    db.session.commit()

    invalidate_customer_summary_cache(user_id)

    return jsonify({
        'message': 'Parking started successfully. Timer has begun!',
        'booking': booking.as_dict(),
        'spot': available_spot.as_dict(),
        'price_per_hour': lot.price_per_hour
    }), 201


@app.route('/customer/booking/<int:booking_id>/complete', methods=['PUT'])
@jwt_required()
@role_required('customer')
def complete_booking(booking_id):
   
    user_id = int(get_jwt_identity())
    data = request.get_json()

    booking = Booking.query.filter_by(id=booking_id, customer_id=user_id).first_or_404()

    if booking.status == 'completed':
        return jsonify({'error': 'Booking already completed'}), 400

    # Calculate actual time spent
    booking.actual_end_time = datetime.utcnow()
    time_diff = booking.actual_end_time - booking.start_time
    actual_hours = time_diff.total_seconds() / 3600  # Convert to hours
    booking.actual_hours = round(actual_hours, 2)
    
    # Calculate billing hours (round up to nearest hour)
    booking.hours_charged = math.ceil(actual_hours)
    
    # Get lot price and calculate final amount
    lot = ParkingLot.query.get(booking.lot_id)
    booking.total_amount = booking.hours_charged * lot.price_per_hour
    booking.amount_paid = booking.total_amount
    
    booking.status = 'completed'
    booking.remarks = data.get('remarks', '')
    booking.rating = data.get('rating')

    # Free up the spot
    if booking.spot:
        booking.spot.status = 'A'

    db.session.commit()

    invalidate_customer_summary_cache(user_id)

    return jsonify({
        'message': 'Booking completed successfully',
        'booking': booking.as_dict(),
        'price_per_hour': lot.price_per_hour,
        'actual_hours': booking.actual_hours,
        'hours_charged': booking.hours_charged,
        'total_amount': booking.total_amount
    }), 200


@app.route('/customer/booking/<int:booking_id>/cancel', methods=['PUT'])
@jwt_required()
@role_required('customer')
def cancel_booking(booking_id):
   
    user_id = int(get_jwt_identity())
    booking = Booking.query.filter_by(id=booking_id, customer_id=user_id).first_or_404()

    if booking.status in ['completed', 'cancelled']:
        return jsonify({'error': 'Cannot cancel this booking'}), 400

    booking.status = 'cancelled'

    
    if booking.spot:
        booking.spot.status = 'A'

    db.session.commit()

    invalidate_customer_summary_cache(user_id)

    return jsonify({'message': 'Booking cancelled'}), 200


@app.route('/customer/search', methods=['POST'])
@jwt_required()
@role_required('customer')
def customer_search():
    
    data = request.get_json()
    search_text = data.get('search_text', '')
    search_type = data.get('search_type', 'name') 

    query = ParkingLot.query.filter_by(is_active=True)

    if search_type == 'name':
        query = query.filter(ParkingLot.name.ilike(f'%{search_text}%'))
    elif search_type == 'pincode':
        query = query.filter(ParkingLot.pincode.like(f'%{search_text}%'))
    elif search_type == 'address':
        query = query.filter(ParkingLot.address.ilike(f'%{search_text}%'))

    lots = query.all()

    return jsonify({
        'lots': [lot.as_dict() for lot in lots]
    }), 200


@app.route('/customer/summary', methods=['GET'])
@jwt_required()
@role_required('customer')
@cache.cached(timeout=300, key_prefix=_customer_summary_cache_key)
def customer_summary():
    user_id = int(get_jwt_identity())

    bookings = Booking.query.filter_by(customer_id=user_id, status='completed').all()

    bookings_by_date = {}
    hours_by_date = {}
    total_spent = 0
    total_hours = 0
    total_charged_hours = 0

    for booking in bookings:
        if booking.booking_date:
            date_key = booking.booking_date.isoformat()
            bookings_by_date[date_key] = bookings_by_date.get(date_key, 0) + 1
        total_spent += booking.total_amount or booking.amount_paid or 0

        if booking.actual_hours:
            if booking.booking_date:
                hours_by_date[booking.booking_date.isoformat()] = hours_by_date.get(
                    booking.booking_date.isoformat(), 0
                ) + booking.actual_hours
            total_hours += booking.actual_hours

        if booking.hours_charged:
            total_charged_hours += booking.hours_charged

    avg_cost_per_hour = round(total_spent / total_charged_hours, 2) if total_charged_hours else 0

    return jsonify({
        'bookings_by_date': bookings_by_date,
        'hours_by_date': hours_by_date,
        'total_bookings': len(bookings),
        'total_spent': round(total_spent, 2),
        'total_hours_parked': round(total_hours, 2),
        'total_hours_charged': total_charged_hours,
        'avg_cost_per_hour': avg_cost_per_hour
    }), 200


@app.route('/customer/export', methods=['POST'])
@jwt_required()
@role_required('customer')
def customer_export_history():
    """Trigger async export of customer's parking history"""
    from tasks import export_user_parking_csv, generate_user_parking_csv

    user_id = int(get_jwt_identity())
    try:
        task = export_user_parking_csv.delay(user_id)
        return jsonify({
            'message': 'Export started. You will receive an email when it completes.',
            'task_id': task.id
        }), 202
    except Exception as exc:
        app.logger.error(f'Failed to enqueue export task: {exc}')
        result = generate_user_parking_csv(user_id)
        return jsonify({
            'message': 'Export generated locally because Celery worker is unavailable.',
            'result': result,
            'status': 'completed'
        }), 200


@app.route('/customer/export/status/<task_id>', methods=['GET'])
@jwt_required()
@role_required('customer')
def customer_export_status(task_id):
    
    from celery.result import AsyncResult

    task = AsyncResult(task_id, app=celery)
    if task.ready():
        result = task.result if isinstance(task.result, dict) else {'result': str(task.result)}
        return jsonify({'status': 'completed', 'result': result}), 200
    return jsonify({'status': 'pending'}), 200


@app.route('/customer/reports/list', methods=['GET'])
@jwt_required()
@role_required('customer')
def customer_reports_list():
    """List exported CSV files for the current customer"""
    user_id = int(get_jwt_identity())
    reports_dir = app.config['EXPORTS_FOLDER']

    if not os.path.exists(reports_dir):
        return jsonify({'reports': []}), 200

    files = [f for f in os.listdir(reports_dir) if f.startswith(f'parking_history_{user_id}_') and f.endswith('.csv')]
    reports = []
    for fname in sorted(files, reverse=True):
        fpath = os.path.join(reports_dir, fname)
        reports.append({
            'filename': fname,
            'created_at': datetime.fromtimestamp(os.path.getctime(fpath)).isoformat(),
            'size': os.path.getsize(fpath)
        })

    return jsonify({'reports': reports}), 200


@app.route('/customer/reports/download/<filename>', methods=['GET'])
@jwt_required()
@role_required('customer')
def customer_download_report(filename):
    user_id = int(get_jwt_identity())

    if not filename.startswith(f'parking_history_{user_id}_'):
        return jsonify({'error': 'Unauthorized access to file'}), 403

    return send_from_directory(app.config['EXPORTS_FOLDER'], filename, as_attachment=True)


@app.route('/admin/export', methods=['POST'])
@jwt_required()
@role_required('admin')
def admin_export_bookings():
    from tasks import export_admin_bookings_csv, generate_admin_bookings_csv

    try:
        task = export_admin_bookings_csv.delay()
        return jsonify({
            'message': 'Admin export started successfully.',
            'task_id': task.id
        }), 202
    except Exception as exc:
        app.logger.error(f'Failed to enqueue admin export task: {exc}')
        result = generate_admin_bookings_csv()
        return jsonify({
            'message': 'Export generated locally because Celery worker is unavailable.',
            'result': result,
            'status': 'completed'
        }), 200


@app.route('/admin/export/status/<task_id>', methods=['GET'])
@jwt_required()
@role_required('admin')
def admin_export_status(task_id):
    from celery.result import AsyncResult

    task = AsyncResult(task_id, app=celery)
    if task.ready():
        result = task.result if isinstance(task.result, dict) else {'result': str(task.result)}
        return jsonify({'status': 'completed', 'result': result}), 200
    return jsonify({'status': 'pending'}), 200


@app.route('/admin/reports/list', methods=['GET'])
@jwt_required()
@role_required('admin')
def admin_reports_list():
    reports_dir = app.config['EXPORTS_FOLDER']

    if not os.path.exists(reports_dir):
        return jsonify({'reports': []}), 200

    files = [f for f in os.listdir(reports_dir) if f.startswith('admin_bookings_') and f.endswith('.csv')]
    reports = []
    for fname in sorted(files, reverse=True):
        fpath = os.path.join(reports_dir, fname)
        reports.append({
            'filename': fname,
            'created_at': datetime.fromtimestamp(os.path.getctime(fpath)).isoformat(),
            'size': os.path.getsize(fpath)
        })

    return jsonify({'reports': reports}), 200


@app.route('/admin/reports/download/<filename>', methods=['GET'])
@jwt_required()
@role_required('admin')
def admin_download_report(filename):
    if not filename.startswith('admin_bookings_'):
        return jsonify({'error': 'Unauthorized access to file'}), 403

    return send_from_directory(app.config['EXPORTS_FOLDER'], filename, as_attachment=True)


@app.route('/admin/dashboard', methods=['GET'])
@jwt_required()
@role_required('admin')
def admin_dashboard():
    lots = ParkingLot.query.all()
    customers = User.query.filter_by(role='customer').all()

    lots_data = [lot.as_dict() for lot in lots]

    customers_data = []
    for u in customers:
        user_data = u.as_dict()
        profile = CustomerProfile.query.filter_by(user_id=u.id).first()
        user_data['profile'] = profile.as_dict() if profile else None
        customers_data.append(user_data)

    profiles = CustomerProfile.query.all()
    profile_dict = {p.user_id: p.as_dict() for p in profiles}

    bookings = Booking.query.order_by(Booking.created_at.desc()).limit(50).all()
    bookings_data = [b.as_dict() for b in bookings]

    total_lots = len(lots)
    total_customers = len(customers)
    total_bookings = Booking.query.count()
    active_bookings = Booking.query.filter_by(status='active').count()

    return jsonify({
        'lots': lots_data,
        'customers': customers_data,
        'profile_dict': profile_dict,
        'bookings': bookings_data,
        'stats': {
            'total_lots': total_lots,
            'total_customers': total_customers,
            'total_bookings': total_bookings,
            'active_bookings': active_bookings
        }
    }), 200


@app.route('/admin/lots', methods=['GET', 'POST'])
@jwt_required()
@role_required('admin')
def admin_lots():
    
    if request.method == 'GET':
        lots = ParkingLot.query.all()
        return jsonify({'lots': [lot.as_dict() for lot in lots]}), 200

    
    data = request.get_json()

    lot = ParkingLot(
        name=data.get('name'),
        address=data.get('address'),
        pincode=data.get('pincode'),
        price_per_hour=float(data.get('price_per_hour', 0)),
        max_spots=int(data.get('max_spots', 10)),
        description=data.get('description', '')
    )

    db.session.add(lot)
    db.session.commit()

    lot.sync_spots()
    db.session.commit()

    return jsonify({'message': 'Parking lot created', 'lot': lot.as_dict()}), 201


@app.route('/admin/users', methods=['GET'])
@jwt_required()
@role_required('admin')
def admin_users():
   
    users = User.query.filter_by(role='customer').all()
    users_data = []
    for u in users:
        user_data = u.as_dict()
        profile = CustomerProfile.query.filter_by(user_id=u.id).first()
        user_data['profile'] = profile.as_dict() if profile else None
        users_data.append(user_data)
    return jsonify({'users': users_data}), 200


@app.route('/admin/users/<int:user_id>/<string:field>/<string:value>', methods=['PUT'])
@jwt_required()
@role_required('admin')
def admin_manage_user(user_id, field, value):
   
    user = User.query.get_or_404(user_id)

    if field == 'approved':
        user.approved = value.lower() == 'true'
    elif field == 'blocked':
        user.blocked = value.lower() == 'true'
    else:
        return jsonify({'error': 'Invalid field'}), 400

    db.session.commit()

    return jsonify({'message': f'User {field} updated', 'user': user.as_dict()}), 200


@app.route('/admin/search', methods=['POST'])
@jwt_required()
@role_required('admin')
def admin_search():
   
    data = request.get_json()
    search_type = data.get('search_type', 'customer')
    search_text = data.get('search_text', '')

    results = []

    if search_type == 'customer':
        users = User.query.filter(
            User.role == 'customer',
            User.username.ilike(f'%{search_text}%')
        ).all()
        results = [u.as_dict() for u in users]

    elif search_type == 'lot':
        lots = ParkingLot.query.filter(
            ParkingLot.name.ilike(f'%{search_text}%')
        ).all()
        results = [l.as_dict() for l in lots]

    elif search_type == 'booking':
        bookings = Booking.query.filter(
            Booking.vehicle_number.ilike(f'%{search_text}%')
        ).all()
        results = [b.as_dict() for b in bookings]

    return jsonify({'results': results, 'search_type': search_type}), 200


@app.route('/admin/summary', methods=['GET'])
@jwt_required()
@role_required('admin')
@cache.cached(timeout=300)
def admin_summary():
  
    bookings = Booking.query.filter_by(status='completed').all()
    date_counts = {}
    revenue_by_date = {}
    hours_by_date = {}
    total_hours = 0
    total_charged_hours = 0

    for b in bookings:
        date_source = b.booking_date
        if not date_source and b.start_time:
            date_source = b.start_time.date()
        if not date_source:
            continue

        date_str = date_source.isoformat()
        date_counts[date_str] = date_counts.get(date_str, 0) + 1
        revenue_by_date[date_str] = revenue_by_date.get(date_str, 0) + (b.total_amount or b.amount_paid or 0)
        
      
        if b.actual_hours:
            hours_by_date[date_str] = hours_by_date.get(date_str, 0) + b.actual_hours
            total_hours += b.actual_hours
        if b.hours_charged:
            total_charged_hours += b.hours_charged

    avg_duration = round(total_hours / len(bookings), 2) if bookings else 0

    lots = ParkingLot.query.all()
    lot_utilization = []
    for lot in lots:
        lot_utilization.append({
            'name': lot.name,
            'occupied': lot.get_occupied_spots(),
            'available': lot.get_available_spots(),
            'total': lot.max_spots
        })

    rating_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    rated_bookings = Booking.query.filter(Booking.rating.isnot(None)).all()
    for b in rated_bookings:
        if b.rating in rating_counts:
            rating_counts[b.rating] += 1

    return jsonify({
        'bookings_by_date': date_counts,
        'revenue_by_date': revenue_by_date,
        'hours_by_date': hours_by_date,
        'lot_utilization': lot_utilization,
        'rating_distribution': rating_counts,
        'total_revenue': sum(revenue_by_date.values()),
        'total_completed_bookings': len(bookings),
        'total_hours_parked': round(total_hours, 2),
        'total_hours_charged': total_charged_hours,
        'avg_parking_duration': avg_duration
    }), 200



@app.route('/admin/trigger/daily-reminders', methods=['POST'])
@jwt_required()
@role_required('admin')
def trigger_daily_reminders():
    from tasks import send_daily_reminders
    task = send_daily_reminders.delay()
    return jsonify({'message': 'Daily reminders task triggered', 'task_id': task.id}), 202


@app.route('/admin/trigger/monthly-report', methods=['POST'])
@jwt_required()
@role_required('admin')
def trigger_monthly_report():
    from tasks import send_monthly_activity_report
    task = send_monthly_activity_report.delay()
    return jsonify({'message': 'Monthly report task triggered', 'task_id': task.id}), 202


# Health endpoints

@app.route('/api/cache/status', methods=['GET'])
def cache_status():
    try:
        cache.set('test_key', 'test_value', timeout=10)
        value = cache.get('test_key')
        cache.delete('test_key')
        return jsonify({
            'status': 'connected',
            'cache_type': app.config['CACHE_TYPE'],
            'test_passed': value == 'test_value'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/celery/status', methods=['GET'])
def celery_status():
    try:
        i = celery.control.inspect()
        active = i.active()
        if active:
            return jsonify({
                'status': 'connected',
                'workers': list(active.keys())
            }), 200
        return jsonify({
            'status': 'no_workers',
            'message': 'No active Celery workers found'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500



if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001)

