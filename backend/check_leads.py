import psycopg2

DATABASE_URL = "postgresql://postgres:postgres@192.168.0.55:9001/utiliko_db"


def check():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        cur.execute("SELECT count(*) FROM leads")
        count = cur.fetchone()[0]
        print(f"Total leads in DB: {count}")

        if count > 0:
            cur.execute("SELECT lead_id, source, industry, stage FROM leads LIMIT 5")
            rows = cur.fetchall()
            print("\nSample Leads:")
            for row in rows:
                print(f"- {row[0]}: {row[1]}, {row[2]}, {row[3]}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    check()
