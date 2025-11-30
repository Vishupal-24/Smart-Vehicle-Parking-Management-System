
from celery import Celery
from celery.schedules import crontab

def make_celery(app):
    celery = Celery(
        app.import_name,
        broker=app.config['CELERY_BROKER_URL'],
        backend=app.config['CELERY_RESULT_BACKEND']
    )
    
    celery.conf.update(
        CELERYBEAT_SCHEDULE={
            'daily-reminders-evening': {
                'task': 'tasks.send_daily_reminders',
                'schedule': crontab(hour=18, minute=0),
            },
            'monthly-activity-report': {
                'task': 'tasks.send_monthly_activity_report',
                'schedule': crontab(day_of_month=1, hour=9, minute=0),
            },
        },
        CELERY_TIMEZONE='Asia/Kolkata',
        CELERY_TASK_SERIALIZER='json',
        CELERY_RESULT_SERIALIZER='json',
        CELERY_ACCEPT_CONTENT=['json'],
    )
    
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    
    celery.Task = ContextTask
    return celery
