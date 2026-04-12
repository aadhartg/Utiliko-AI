# backend/run.py
from core.config import settings
from subprocess import Popen
import sys
import argparse

# Extract values from settings
PYTHON_ENV = settings.PYTHON_ENV
PORT = int(settings.PORT)
HOST = settings.HOST
PYTHON_WORKER = settings.PYTHON_WORKER
SERVER_REQUEST_TIMEOUT = settings.SERVER_REQUEST_TIMEOUT


def start_server():
    if PYTHON_ENV == "development":
        # Run uvicorn server in development environment
        command = [
            "uvicorn",
            "main:app",
            "--host",
            HOST,
            "--port",
            str(PORT),
            "--reload",
        ]
    else:
        # Run gunicorn server in production environment
        command = [
            "gunicorn",
            "-w",
            f"{PYTHON_WORKER}",
            "-k",
            "uvicorn.workers.UvicornWorker",
            "--bind",
            f"0.0.0.0:{PORT}",
            "--access-logfile",
            "-",
            "--error-logfile",
            "-",
            "--access-logformat",
            '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"',
            "--timeout",
            SERVER_REQUEST_TIMEOUT,
            "main:app",
        ]

    print(f"Starting server on {HOST}:{PORT} in {PYTHON_ENV} mode...")
    process = Popen(command)

    try:
        process.wait()
    except KeyboardInterrupt:
        print("Terminating the server...")
        process.terminate()
        process.wait()
        sys.exit(0)


def start_celery():
    # Celery worker - Note: we use "celery_app" as the module name
    worker_cmd = [
        "celery",
        "-A",
        "celery_app",
        "worker",
        "--loglevel=INFO",
    ]

    # Start processes
    print("Starting Celery worker, Celery beat and Flower dashboard...")
    worker_process = Popen(worker_cmd)

    try:
        worker_process.wait()

    except KeyboardInterrupt:
        print("Terminating Celery worker, Celery beat and Flower dashboard...")
        worker_process.terminate()

        worker_process.wait()
        sys.exit(0)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Manage server and Celery worker.")
    parser.add_argument(
        "command",
        choices=["server", "celery"],
        help="Command to run: 'server' to start the FastAPI server, 'celery' to start the Celery worker.",
    )
    args = parser.parse_args()

    if args.command == "server":
        start_server()
    elif args.command == "celery":
        start_celery()
    else:
        print(
            "Invalid command. Use 'server' to start the FastAPI server or 'celery' to start the Celery worker."
        )
        sys.exit(1)
