import click
from subprocess import run
from datetime import datetime
from pathlib import Path

# Constants
BASE_DIR = Path(__file__).resolve().parent
ALEMBIC_DIR = BASE_DIR / "alembic"
ENV_FILE = BASE_DIR / ".env"

# Ensure .env is loaded
from dotenv import load_dotenv

load_dotenv(dotenv_path=ENV_FILE)


@click.group()
def cli():
    """🔧 Alembic Migration CLI"""
    pass


@cli.command()
@click.argument("message")
def create(message):
    """
    Create a new migration with a timestamp-based revision ID.
    """
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    command = [
        "alembic",
        "revision",
        "--autogenerate",
        "-m",
        message,
        "--rev-id",
        timestamp,
    ]
    run(command)


@cli.command()
def upgrade():
    """Apply latest migration (upgrade head)."""
    run(["alembic", "upgrade", "head"])


@cli.command()
@click.argument("revision")
def downgrade(revision):
    """Downgrade to a specific revision."""
    run(["alembic", "downgrade", revision])


@cli.command()
@click.option("--count", default=1, help="Rollback n migrations (default 1)")
def rollback(count):
    """Rollback last n migrations."""
    for _ in range(count):
        run(["alembic", "downgrade", "-1"])


@cli.command()
def current():
    """Show current revision."""
    run(["alembic", "current"])


@cli.command()
def history():
    """Show migration history."""
    run(["alembic", "history"])


@cli.command()
def heads():
    """Show head(s) of migration branches."""
    run(["alembic", "heads"])


@cli.command()
def status():
    """Alias for current + heads."""
    print("🔍 Current revision:")
    run(["alembic", "current"])
    print("\n🔍 Heads:")
    run(["alembic", "heads"])


if __name__ == "__main__":
    cli()
