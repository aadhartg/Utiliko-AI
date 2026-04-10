import psycopg2
import os

# Using the IP from the main DATABASE_URL in .env
DATABASE_URL = "postgresql://postgres:postgres@192.168.0.55:9001/utiliko_db"


def check():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        cur.execute("SELECT count(*) FROM ai_actions WHERE status = 'pending'")
        pending = cur.fetchone()[0]

        cur.execute("SELECT count(*) FROM ai_actions")
        total = cur.fetchone()[0]

        print(f"Pending actions: {pending}")
        print(f"Total actions: {total}")

        if total > 0:
            cur.execute(
                "SELECT action_type, status, created_at FROM ai_actions ORDER BY created_at DESC LIMIT 5"
            )
            for row in cur.fetchall():
                print(f"Action: {row[0]}, Status: {row[1]}, Created: {row[2]}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    check()
