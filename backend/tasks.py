
import os
import csv
from datetime import datetime, timedelta
from celery import shared_task
import requests


def _resolve_admin_email(User):

    admin_override = os.environ.get('ADMIN_ALERT_EMAIL')
    if admin_override:
        return admin_override
    admin_user = User.query.filter_by(role='admin').first()
    return admin_user.username if admin_user else None


@shared_task(bind=True, name='tasks.send_daily_reminders')
def send_daily_reminders(self):
    
    from app import app, mail
    from models import db, User, Booking, ParkingLot
    from flask_mail import Message
    
    with app.app_context():
        seven_days_ago = datetime.now().date() - timedelta(days=7)
        recent_lot_threshold = datetime.now() - timedelta(days=1)

        customers = User.query.filter_by(role='customer', blocked=False, approved=True).all()
        available_lots = ParkingLot.query.filter_by(is_active=True).all()
        recent_lots = ParkingLot.query.filter(ParkingLot.created_at >= recent_lot_threshold).all()

        popular_lot_names = ', '.join([lot.name for lot in available_lots[:3]]) or 'multiple locations near you'
        recent_lot_names = ', '.join([lot.name for lot in recent_lots[:3]])

        notifications_sent = 0

        for customer in customers:
            last_booking = Booking.query.filter_by(customer_id=customer.id) \
                .order_by(Booking.created_at.desc()).first()

            should_remind = bool(recent_lot_names)
            if not should_remind:
                if not last_booking:
                    should_remind = True  
                elif last_booking.booking_date and last_booking.booking_date < seven_days_ago:
                    should_remind = True  

            if should_remind:
                recent_lot_block = ''
                if recent_lot_names:
                    recent_lot_block = f"<p><strong>Newly added lots:</strong> {recent_lot_names}</p>"

                try:
                    msg = Message(
                        'Parking Reminder - Book Your Spot Today!',
                        recipients=[customer.username],
                        html=f'''
                        <html>
                        <body style="font-family: Arial, sans-serif;">
                            <h2>🚗 Parking Reminder</h2>
                            <p>Hi there,</p>
                            <p>We would love to host your vehicle again.</p>
                            <p><strong>Popular locations:</strong> {popular_lot_names}</p>
                            {recent_lot_block}
                            <p><a href="http://localhost:5001/#/customer/dashboard" 
                                  style="background-color: #007bff; color: white; padding: 10px 20px; 
                                         text-decoration: none; border-radius: 5px;">
                                Book Now
                            </a></p>
                            <p>Happy Parking!<br>Vehicle Parking Management Team</p>
                        </body>
                        </html>
                        '''
                    )
                    mail.send(msg)
                    notifications_sent += 1
                except Exception as e:
                    print(f'Failed to send reminder to {customer.username}: {e}')

                try:
                    send_webhook_notification.delay(
                        f"Reminder sent to {customer.username}"
                    )
                except Exception:
                    pass

        admin_email = _resolve_admin_email(User)
        if admin_email:
            summary_html = f'''
            <p>Daily reminder job finished at {datetime.now().strftime('%Y-%m-%d %H:%M')}.</p>
            <ul>
                <li>Total eligible customers: {len(customers)}</li>
                <li>Reminders sent: {notifications_sent}</li>
                <li>Popular lots promoted: {popular_lot_names}</li>
                <li>New lots highlighted: {recent_lot_names or 'None today'}</li>
            </ul>
            '''
            try:
                admin_msg = Message(
                    'Daily Reminder Job Summary',
                    recipients=[admin_email],
                    html=summary_html
                )
                mail.send(admin_msg)
            except Exception as exc:
                print(f'Failed to notify admin about reminders: {exc}')

        try:
            send_webhook_notification.delay(
                f"Daily reminder job complete. Notifications sent: {notifications_sent}"
            )
        except Exception:
            pass

        return f'Daily reminders sent to {notifications_sent} users'


@shared_task(bind=True, name='tasks.send_monthly_activity_report')
def send_monthly_activity_report(self):
    
    from app import app, mail
    from models import db, User, Booking, ParkingLot
    from flask_mail import Message
    
    with app.app_context():

        today = datetime.now()
        first_day_this_month = today.replace(day=1)
        last_day_prev_month = first_day_this_month - timedelta(days=1)
        first_day_prev_month = last_day_prev_month.replace(day=1)
        month_name = first_day_prev_month.strftime('%B %Y')
        

        customers = User.query.filter_by(role='customer').all()
        reports_sent = 0
        
        for customer in customers:

            bookings = Booking.query.filter(
                Booking.customer_id == customer.id,
                Booking.booking_date >= first_day_prev_month,
                Booking.booking_date <= last_day_prev_month
            ).all()
            
            if not bookings:
                continue
            

            total_bookings = len(bookings)
            completed_bookings = len([b for b in bookings if b.status == 'completed'])
            total_spent = sum(b.amount_paid or 0 for b in bookings)
            total_hours = sum(b.hours_booked or 0 for b in bookings)
            

            lot_usage = {}
            for b in bookings:
                lot_usage[b.lot_id] = lot_usage.get(b.lot_id, 0) + 1
            
            most_used_lot_id = max(lot_usage, key=lot_usage.get) if lot_usage else None
            most_used_lot = ParkingLot.query.get(most_used_lot_id) if most_used_lot_id else None
            most_used_lot_name = most_used_lot.name if most_used_lot else 'N/A'
            

            html_report = f'''
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    .header {{ background-color: #007bff; color: white; padding: 20px; text-align: center; }}
                    .stats {{ display: flex; flex-wrap: wrap; justify-content: space-around; margin: 20px 0; }}
                    .stat-card {{ background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; margin: 10px; min-width: 150px; }}
                    .stat-value {{ font-size: 24px; font-weight: bold; color: #007bff; }}
                    .stat-label {{ color: #666; }}
                    table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
                    th, td {{ border: 1px solid #ddd; padding: 10px; text-align: left; }}
                    th {{ background-color: #007bff; color: white; }}
                    tr:nth-child(even) {{ background-color: #f8f9fa; }}
                    .footer {{ margin-top: 20px; padding: 10px; background: #f8f9fa; text-align: center; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🚗 Monthly Parking Report</h1>
                    <h3>{month_name}</h3>
                </div>
                
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-value">{total_bookings}</div>
                        <div class="stat-label">Total Bookings</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{completed_bookings}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">₹{total_spent:.2f}</div>
                        <div class="stat-label">Amount Spent</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{total_hours}</div>
                        <div class="stat-label">Hours Parked</div>
                    </div>
                </div>
                
                <h3>📍 Most Used Location: {most_used_lot_name}</h3>
                
                <h3>📋 Booking Details</h3>
                <table>
                    <tr>
                        <th>Date</th>
                        <th>Location</th>
                        <th>Duration</th>
                        <th>Amount</th>
                        <th>Status</th>
                    </tr>
            '''
            
            for b in bookings:
                lot = ParkingLot.query.get(b.lot_id)
                lot_name = lot.name if lot else 'Unknown'
                html_report += f'''
                    <tr>
                        <td>{b.booking_date}</td>
                        <td>{lot_name}</td>
                        <td>{b.hours_booked} hrs</td>
                        <td>₹{b.amount_paid or 0:.2f}</td>
                        <td>{b.status}</td>
                    </tr>
                '''
            
            html_report += '''
                </table>
                <div class="footer">
                    <p>Thank you for using Vehicle Parking Management System!</p>
                    <p><a href="http://localhost:5001/#/customer/dashboard">Book More Parking</a></p>
                </div>
            </body>
            </html>
            '''
            
            try:
                msg = Message(
                    f'Your Monthly Parking Report - {month_name}',
                    recipients=[customer.username],
                    html=html_report
                )
                mail.send(msg)
                reports_sent += 1
            except Exception as e:
                print(f'Failed to send report to {customer.username}: {e}')
        
        admin_email = _resolve_admin_email(User)
        if admin_email:
            summary_html = f'''
            <p>Monthly activity report job ran on {datetime.now().strftime('%Y-%m-%d %H:%M')}.</p>
            <ul>
                <li>Customers evaluated: {len(customers)}</li>
                <li>Reports emailed: {reports_sent}</li>
                <li>Period covered: {first_day_prev_month.strftime('%d %b %Y')} – {last_day_prev_month.strftime('%d %b %Y')}</li>
            </ul>
            '''
            try:
                admin_msg = Message(
                    f'Monthly Report Job Summary - {month_name}',
                    recipients=[admin_email],
                    html=summary_html
                )
                mail.send(admin_msg)
            except Exception as exc:
                print(f'Failed to notify admin about monthly report: {exc}')

        try:
            send_webhook_notification.delay(
                f"Monthly report job complete. Reports sent: {reports_sent}"
            )
        except Exception:
            pass

        return f'Monthly reports sent to {reports_sent} users'


def generate_user_parking_csv(user_id):

    from app import app, mail
    from models import User, Booking
    from flask_mail import Message

    with app.app_context():
        user = User.query.get(user_id)
        if not user:
            return {'error': 'User not found'}

        bookings = Booking.query.filter_by(customer_id=user_id).order_by(Booking.start_time.desc()).all()
        os.makedirs(app.config['EXPORTS_FOLDER'], exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        filename = f'parking_history_{user_id}_{timestamp}.csv'
        file_path = os.path.join(app.config['EXPORTS_FOLDER'], filename)

        headers = [
            'Booking ID', 'Parking Lot', 'Spot Number', 'Vehicle Number', 'Status',
            'Start Time', 'Actual End Time', 'Hours Charged', 'Total Amount', 'Remarks'
        ]

        with open(file_path, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(headers)
            for booking in bookings:
                lot_name = booking.lot.name if booking.lot else 'N/A'
                spot_number = booking.spot.spot_number if booking.spot else 'N/A'
                writer.writerow([
                    booking.id,
                    lot_name,
                    spot_number,
                    booking.vehicle_number,
                    booking.status,
                    booking.start_time.isoformat() if booking.start_time else '',
                    booking.actual_end_time.isoformat() if booking.actual_end_time else '',
                    booking.hours_charged or 0,
                    booking.total_amount or booking.amount_paid or 0,
                    booking.remarks or ''
                ])

        try:
            msg = Message(
                'Your parking history export is ready',
                recipients=[user.username],
                html=f'''
                <p>Hi {user.username},</p>
                <p>Your parking history report has been generated successfully.</p>
                <p>You can download it from your dashboard (Summary → Export section).</p>
                <p>File name: <strong>{filename}</strong> ({len(bookings)} records)</p>
                <p>Regards,<br/>Vehicle Parking Management System</p>
                '''
            )
            mail.send(msg)
        except Exception as exc:
            print(f'Failed to send export notification email: {exc}')

        return {
            'filename': filename,
            'records': len(bookings)
        }


@shared_task(bind=True, name='tasks.export_user_parking_csv')
def export_user_parking_csv(self, user_id):

    return generate_user_parking_csv(user_id)


def generate_admin_bookings_csv():

    from app import app
    from models import Booking

    with app.app_context():
        bookings = Booking.query.order_by(Booking.start_time.desc()).all()
        os.makedirs(app.config['EXPORTS_FOLDER'], exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        filename = f'admin_bookings_{timestamp}.csv'
        file_path = os.path.join(app.config['EXPORTS_FOLDER'], filename)

        headers = [
            'Booking ID', 'Customer Email', 'Parking Lot', 'Spot Number', 'Vehicle Number',
            'Status', 'Start Time', 'Actual End Time', 'Hours Charged', 'Total Amount'
        ]

        with open(file_path, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(headers)
            for booking in bookings:
                lot_name = booking.lot.name if booking.lot else 'N/A'
                spot_number = booking.spot.spot_number if booking.spot else 'N/A'
                customer_email = booking.user.username if getattr(booking, 'user', None) else 'N/A'
                writer.writerow([
                    booking.id,
                    customer_email,
                    lot_name,
                    spot_number,
                    booking.vehicle_number,
                    booking.status,
                    booking.start_time.isoformat() if booking.start_time else '',
                    booking.actual_end_time.isoformat() if booking.actual_end_time else '',
                    booking.hours_charged or 0,
                    booking.total_amount or booking.amount_paid or 0
                ])

        return {
            'filename': filename,
            'records': len(bookings)
        }


@shared_task(bind=True, name='tasks.export_admin_bookings_csv')
def export_admin_bookings_csv(self):

    return generate_admin_bookings_csv()


@shared_task(bind=True, name='tasks.send_webhook_notification')
def send_webhook_notification(self, message):
    
    from app import app
    
    webhook_url = os.environ.get('GOOGLE_CHAT_WEBHOOK_URL', '')
    
    if not webhook_url:
        print('Google Chat webhook URL not configured')
        return 'Webhook URL not configured'
    
    try:
        payload = {
            'text': f'🚗 Parking App Notification: {message}'
        }
        response = requests.post(webhook_url, json=payload, timeout=10)
        return f'Webhook sent: {response.status_code}'
    except Exception as e:
        print(f'Webhook failed: {e}')
        return f'Webhook failed: {str(e)}'
