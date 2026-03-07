import time
import requests
import argparse
from scapy.all import sniff, IP, TCP, ICMP, UDP, conf

# --- CONFIGURATION ---
DEFAULT_API_URL = "http://127.0.0.1:8000/api/ingest-log/" 

# Throttling: Don't spam the dashboard
last_sent = {} 

def send_alert(src_ip, dst_ip, attack_type, severity, api_url):
    """Sends the detected threat to Django"""
    global last_sent
    
    # Simple throttle: Don't report the same IP for the same attack twice in 3 seconds
    key = f"{src_ip}_{attack_type}"
    if key in last_sent and (time.time() - last_sent[key]) < 3:
        return

    print(f"[!] DETECTED: {attack_type} from {src_ip} -> {dst_ip}")
    
    try:
        requests.post(api_url, json={
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "type": attack_type,
            "severity": severity,
            "is_threat": True, # Force threat flag
        })
        last_sent[key] = time.time()
    except Exception as e:
        print(f"[ERROR] API Down? {e}")

packet_counts = {}

def check_threshold(src_ip, attack_type, threshold_count, time_window=2):
    global packet_counts
    key = f"{src_ip}_{attack_type}"
    now = time.time()
    
    if key not in packet_counts:
        packet_counts[key] = []
        
    packet_counts[key].append(now)
    # Filter out packets older than the time window
    packet_counts[key] = [t for t in packet_counts[key] if now - t <= time_window]
    
    if len(packet_counts[key]) >= threshold_count:
        packet_counts[key].clear() # Reset after triggering
        return True
    return False

def get_packet_analyzer(api_url):
    def analyze_packet(packet):
        """The Logic: Inspects packet layers with Thresholding"""
        
        # We only care about IP packets (not local ARP stuff)
        if not packet.haslayer(IP):
            return

        src_ip = packet[IP].src
        dst_ip = packet[IP].dst

        # 1. DETECT ICMP (Ping) Flood
        if packet.haslayer(ICMP):
            if packet[ICMP].type == 8: # Echo Request
                if check_threshold(src_ip, "ICMP", 20, 2): # 20 pings in 2 seconds
                    send_alert(src_ip, dst_ip, "Ping Flood Detected", "MEDIUM", api_url)

        # 2. DETECT TCP SYN SCAN / Stealth Scan
        if packet.haslayer(TCP):
            tcp_flags = packet[TCP].flags
            
            # 'S' means SYN.
            if 'S' in tcp_flags:
                if check_threshold(src_ip, "SYN_SCAN", 20, 2): # 20 SYNs in 2s
                    send_alert(src_ip, dst_ip, "TCP SYN Port Scan", "HIGH", api_url)

        # 3. UDP Traffic / DNS Amplification
        if packet.haslayer(UDP):
            dst_port = packet[UDP].dport
            if dst_port == 53: # DNS
                if len(packet) > 512:
                    if check_threshold(src_ip, "DNS_AMP", 10, 2): # 10 large queries in 2s
                        send_alert(src_ip, dst_ip, "DNS Amplification Attempt", "CRITICAL", api_url)

        # 4. DETECT LARGE PAYLOADS - Potential Data Exfiltration
        if len(packet) > 1500:
             if check_threshold(src_ip, "LARGE_PAYLOAD", 5, 2): # 5 large packets in 2s
                 send_alert(src_ip, dst_ip, "Abnormal Packet Size (Data Exfiltration)", "HIGH", api_url)


            
    return analyze_packet

def start_sniffer(api_url):
    print(f"[*] Network Sniffer started...")
    print(f"[*] Analyzing live traffic and sending alerts to: {api_url}")
    
    # 'prn' is the function to call for every packet
    sniff(prn=get_packet_analyzer(api_url), store=0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Live Network Sniffer for I-Guard")
    parser.add_argument("--url", "-u", default=DEFAULT_API_URL, help="API Endpoint URL")
    
    args = parser.parse_args()
    
    try:
        start_sniffer(args.url)
    except PermissionError:
        print("[!] ERROR: You must run this script as Sudo / Administrator (Run VS Code as Admin if using the terminal there)!")
    except Exception as e:
        print(f"[!] Error: {e}")