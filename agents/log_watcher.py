import time
import requests
import os
import argparse
import sys

# --- CONFIGURATION DEFAULT ---
DEFAULT_LOG_FILE = "test_log.txt" 
DEFAULT_API_URL = "http://127.0.0.1:8000/api/ingest-system-log/"

def parse_and_send(line, api_url, token=None):
    """
    Converts a raw log line into JSON and sends it to Django.
    """
    line = line.strip()
    if not line:
        return

    # Simple logic to guess severity
    level = "INFO"
    lower_line = line.lower()
    if "error" in lower_line or "failed" in lower_line or "critical" in lower_line:
        level = "ERROR"
    elif "warning" in lower_line or "warn" in lower_line:
        level = "WARNING"

    # Try to extract component (basic heuristic: first word or bracketed content)
    component = "System"
    try:
        if "[" in line and "]" in line:
            # Extract content in brackets e.g. "sshd[123]" -> "sshd"
            start = line.find("[")
            # Find preceeding word
            prev_space = line.rfind(" ", 0, start)
            if prev_space != -1:
                component = line[prev_space+1:start]
            else:
                component = line[:start]
    except:
        pass

    payload = {
        "level": level,
        "component": component, 
        "message": line
    }
    
    headers = {}
    if token:
        headers['Authorization'] = f"Bearer {token}"

    try:
        response = requests.post(api_url, json=payload, headers=headers)
        if response.status_code == 200:
            print(f"[SENT][{level}] {line[:50]}...")
        else:
            print(f"[FAIL] Server returned {response.status_code}: {response.text}")
    except Exception as e:
        print(f"[ERROR] Connection failed: {e}")

def follow(thefile):
    """Generator function that yields new lines in a file"""
    # Go to the end of the file
    thefile.seek(0, os.SEEK_END) 
    
    while True:
        line = thefile.readline()
        if not line:
            time.sleep(0.5) 
            continue
        yield line

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Log Watcher Agent")
    parser.add_argument("--file", "-f", default=DEFAULT_LOG_FILE, help="Path to the log file to watch")
    parser.add_argument("--url", "-u", default=DEFAULT_API_URL, help="API Endpoint URL")
    parser.add_argument("--token", "-t", help="Bearer Token for Authentication")
    
    args = parser.parse_args()
    
    log_file = args.file
    api_url = args.url
    
    print(f"[*] Agent started.")
    print(f"[*] Watching: {os.path.abspath(log_file)}")
    print(f"[*] Target: {api_url}")
    
    # Create the dummy file if it doesn't exist (For testing)
    if not os.path.exists(log_file):
        with open(log_file, "w") as f:
            f.write(f"Log file created at {time.ctime()}\n")
            print(f"[*] Created placeholder log file.")

    try:
        with open(log_file, "r") as logfile:
            loglines = follow(logfile)
            
            for line in loglines:
                parse_and_send(line, api_url, args.token)
            
    except KeyboardInterrupt:
        print("\n[*] Agent stopped.")
    except FileNotFoundError:
        print(f"[!] Error: File {log_file} not found.")
    except Exception as e:
        print(f"[!] Error: {e}")
