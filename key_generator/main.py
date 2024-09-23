import json
import os
from eth_account import Account

# Generate a new private key
account = Account.create()

# Get the private key and address
private_key = account.key.hex()
acc_address = account.address

# Create a dictionary to store the data
account_data = {
    "address": acc_address,
    "private_key": private_key
}

# Get the directory of the current script
current_dir = os.path.dirname(os.path.abspath(__file__))

# Create the path for the .caller file
caller_file_path = os.path.join(current_dir, ".caller")

# Save to .caller file as JSON
with open(caller_file_path, "w") as f:
    json.dump(account_data, f, indent=4)

print(f".caller file created at {caller_file_path} with address ({acc_address}) and key saved.")