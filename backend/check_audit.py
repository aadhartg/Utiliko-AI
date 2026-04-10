import psycopg2

DATABASE_URL = "postgresql://postgres:postgres@192.168.0.55:9001/utiliko_db"


def check():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        cur.execute(
            "SELECT event_type, actor, timestamp FROM ai_audit_log ORDER BY timestamp DESC LIMIT 10"
        )
        rows = cur.fetchall()
        print("Latest Audit Logs:")
        for row in rows:
            print(f"- {row[0]} by {row[1]} at {row[2]}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    check()
