import psycopg2

DATABASE_URL = "postgresql://postgres:postgres@192.168.0.55:9001/utiliko_db"


def check():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        cur.execute("SELECT tier, count(*) FROM ai_lead_scores GROUP BY tier")
        rows = cur.fetchall()
        print("Tiers in DB:")
        for row in rows:
            print(f"- {row[0]}: {row[1]}")

        cur.execute(
            "SELECT lead_id FROM ai_lead_scores WHERE tier IN ('Hot', 'Warm') LIMIT 5"
        )
        rows = cur.fetchall()
        print("\nSample Hot/Warm Lead IDs:")
        for row in rows:
            print(f"- {row[0]}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    check()
