
from passlib.hash import sha256_crypt
from passlib.context import CryptContext

# Test hash from DB
db_hash = '$5$rounds=535000$yCTq/PBtTr7s0l.h$r8Snd/zcmH54QZqOaL9elvVmnqPOHiVtISgO/J7eYNB'

print(f"Testing hash: {db_hash}")
print(f"Is sha256_crypt? {sha256_crypt.identify(db_hash)}")

ctx = CryptContext(schemes=["bcrypt", "sha256_crypt"])
print(f"Context identify: {ctx.identify(db_hash)}")

# Try to verify with a common password if possible, or just check if it's recognized
try:
    recognized = ctx.identify(db_hash)
    print(f"Recognized as: {recognized}")
except Exception as e:
    print(f"Error identifying: {e}")

# Generate a new one to compare
new_h = sha256_crypt.hash("password", rounds=535000)
print(f"New hash: {new_h}")
print(f"New hash recognized? {sha256_crypt.identify(new_h)}")
