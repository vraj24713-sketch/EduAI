from sqlalchemy import text
from app.database.session import engine

try:
    with engine.connect() as connection:
        result = connection.execute(text("SELECT current_database(), current_user"))
        database, user = result.one()

        print("Database connection successful!")
        print(f"Database: {database}")
        print(f"User: {user}")

except Exception as error:
    print("Database connection failed.")
    print(f"Error: {error}")
finally:
    engine.dispose()