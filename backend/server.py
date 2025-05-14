from flask import Flask, jsonify
from flask_cors import CORS
import subprocess

app = Flask(__name__)
CORS(app)

ZTKeco_DIR = r"C:\Users\TheGameProduction\Desktop\all\ZTKeco\ZTKeco"

@app.route('/sync-transactions', methods=['GET'])
def sync_transactions():
    try:
        result = subprocess.run(
            ["dotnet", "run", "get-all-transactions"],
            cwd=ZTKeco_DIR,
            capture_output=True,
            text=True,
            check=True
        )
        print("✅ Output:", result.stdout)
        return jsonify({ "success": True, "message": "Sync completed successfully." }), 200
    except subprocess.CalledProcessError as e:
        print("❌ Error:", e.stderr)
        return jsonify({ "success": False, "message": "Sync failed." }), 500

if __name__ == '__main__':
    app.run(host='localhost', port=4000)
