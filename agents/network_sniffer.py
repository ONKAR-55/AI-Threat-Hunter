import time
import requests
from scapy.all import sniff, IP, TCP, ICMP, conf

# --- CONFIGURATION ---
# The API Endpoint we built earlier
API_URL = "http://127.0.0.1:8000/api/ingest-log/" 

# Throttling: Don't spam the dashboard with 1000 alerts per second
last_sent = {} 

def send_alert(src_ip, dst_ip, attack_type, severity):
    """Sends the detected threat to Django"""
    global last_sent
    
    # Simple throttle: Don't report the same IP for the same attack twice in 5 seconds
    key = f"{src_ip}_{attack_type}"
    if key in last_sent and (time.time() - last_sent[key]) < 5:
        return

    print(f"[!] DETECTED: {attack_type} from {src_ip} -> {dst_ip}")
    
    try:
        requests.post(API_URL, json={
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "type": attack_type,
            "severity": severity,
            "is_threat": True, # Forcing it to skip AI detection for testing, or we can leave it false
        })
        last_sent[key] = time.time()
    except Exception as e:
        print(f"[ERROR] API Down? {e}")

def analyze_packet(packet):
    """The Logic: Inspects packet layers"""
    
    # We only care about IP packets (not local ARP stuff)
    if not packet.haslayer(IP):
        return

    src_ip = packet[IP].src
    dst_ip = packet[IP].dst

    # 1. DETECT ICMP (Ping) - Potential Ping Flood
    if packet.haslayer(ICMP):
        # Type 8 is an Echo Request (Ping)
        if packet[ICMP].type == 8:
            send_alert(src_ip, dst_ip, "ICMP Probe (Ping)", "LOW")

    # 2. DETECT TCP SYN SCAN - Potential Nmap Scan
    if packet.haslayer(TCP):
        tcp_flags = packet[TCP].flags
        
        # 'S' means SYN (Synchronize). This is the first step of a connection.
        # Hackers send thousands of these to find open ports.
        if tcp_flags == 'S':
            dst_port = packet[TCP].dport
            # We report it as a scan. 
            # (In a real SOC, you'd wait for a threshold, but for a demo, instant is better)
            send_alert(src_ip, dst_ip, f"TCP SYN Scan (Port {dst_port})", "MEDIUM")

    # 3. DETECT LARGE PAYLOADS - Potential Data Exfiltration
    if len(packet) > 1500:
        send_alert(src_ip, dst_ip, "Abnormal Packet Size", "HIGH")

def start_sniffer():
    print(f"[*] Sniffer started...")
    print(f"[*] Sending alerts to: {API_URL}")
    
    # 'prn' is the function to call for every packet
    # 'store=0' prevents RAM from filling up
    sniff(prn=analyze_packet, store=0)

if __name__ == "__main__":
    # Scapy requires Administrator / Root privileges to capture traffic!
    try:
        start_sniffer()
    except PermissionError:
        print("[!] ERROR: You must run this script as Sudo / Administrator!")
    except Exception as e:
        print(f"[!] Error: {e}")