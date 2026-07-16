import time
import socket
import psutil
import requests
from collections import defaultdict
from scapy.all import sniff, IP, TCP, ICMP, UDP, conf

# --- CONFIGURATION ---
API_URL = "http://127.0.0.1:8000/api/ingest-log/" 
STATS_URL = "http://127.0.0.1:8000/api/ingest-packet-stats/"

# State Management: Memory of what IPs are doing
# Format: packet_history["192.168.1.5"]["TCP SYN Scan"] = [time1, time2, time3...]
packet_history = defaultdict(lambda: defaultdict(list))

# Format: alert_cooldown["192.168.1.5"]["TCP SYN Scan"] = time_of_last_alert
alert_cooldown = defaultdict(lambda: defaultdict(float))

# Packet protocol counter for the two Donut charts (Receiving / Sending)
packet_stats = {
    "in": defaultdict(int),
    "out": defaultdict(int)
}
last_stats_sent = time.time()

def get_local_ips():
    """Identifies local IP addresses to classify direction (in vs out)"""
    local_ips = {"127.0.0.1", "0.0.0.0", "::1"}
    try:
        hostname = socket.gethostname()
        local_ips.add(socket.gethostbyname(hostname))
    except Exception:
        pass
    try:
        for iface_name, addrs in psutil.net_if_addrs().items():
            for addr in addrs:
                if addr.family == socket.AF_INET or (hasattr(socket, 'AF_INET6') and addr.family == socket.AF_INET6):
                    local_ips.add(addr.address)
    except Exception:
        pass
    return local_ips

LOCAL_IPS = get_local_ips()

def send_suspicious_activity(src_ip, dst_ip, attack_type, severity):
    """Sends the confirmed suspicious activity to Django"""
    print(f"[!] CONFIRMED SUSPICIOUS ACTIVITY: {attack_type} from {src_ip} -> {dst_ip}")
    try:
        requests.post(API_URL, json={
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "type": attack_type,
            "severity": severity,
            "is_threat": False,
            "is_suspicious": True,
        }, timeout=2)
    except Exception as e:
        print(f"[ERROR] API Down? {e}")

def send_packet_stats():
    """Sends aggregated protocol counts (Incoming & Outgoing) to backend for the Donut charts"""
    global last_stats_sent
    try:
        payload = {
            "in": dict(packet_stats["in"]),
            "out": dict(packet_stats["out"])
        }
        requests.post(STATS_URL, json=payload, timeout=1)
        # Clear counters after dispatching
        packet_stats["in"].clear()
        packet_stats["out"].clear()
        last_stats_sent = time.time()
    except Exception as e:
        pass # Silently continue sniffing if backend is momentarily busy

def check_threshold(src_ip, dst_ip, attack_type, severity, limit, window, cooldown=60):
    """
    The Sliding Window Logic:
    - limit: How many packets are allowed?
    - window: In what time frame (seconds)?
    - cooldown: How long to stay quiet after alerting once (seconds)?
    """
    current_time = time.time()
    
    # 1. Add current packet timestamp to history
    packet_history[src_ip][attack_type].append(current_time)
    
    # 2. Clean up old packets that fell out of our time window
    packet_history[src_ip][attack_type] = [
        t for t in packet_history[src_ip][attack_type] 
        if current_time - t <= window
    ]
    
    # 3. Did they cross the threshold?
    if len(packet_history[src_ip][attack_type]) >= limit:
        # 4. Are we in a cooldown period? (Prevents spamming the dashboard)
        if current_time - alert_cooldown[src_ip][attack_type] > cooldown:
            send_suspicious_activity(src_ip, dst_ip, attack_type, severity)
            
            # Start the cooldown timer and clear the history for this attack
            alert_cooldown[src_ip][attack_type] = current_time
            packet_history[src_ip][attack_type] = []

def analyze_packet(packet):
    """Inspects packet layers, records protocol metrics, and routes to threshold checkers"""
    global last_stats_sent
    current_time = time.time()

    # Determine protocol & direction for Donut Chart statistics
    protocol = "Other/RAW"
    direction = "in"

    if packet.haslayer(IP):
        src_ip = packet[IP].src
        dst_ip = packet[IP].dst

        if dst_ip in LOCAL_IPS or dst_ip.startswith("127."):
            direction = "in"
        else:
            direction = "out"

        if packet.haslayer(TCP):
            ports = (packet[TCP].sport, packet[TCP].dport)
            if 20 in ports or 21 in ports:
                protocol = "FTP"
            elif 80 in ports or 443 in ports or 8080 in ports:
                protocol = "HTTP/S"
            elif 22 in ports or 3389 in ports:
                protocol = "SSH/RDP"
            elif 53 in ports:
                protocol = "DNS"
            else:
                protocol = "TCP"
        elif packet.haslayer(UDP):
            ports = (packet[UDP].sport, packet[UDP].dport)
            if 53 in ports:
                protocol = "DNS"
            else:
                protocol = "UDP"
        elif packet.haslayer(ICMP):
            protocol = "ICMP"
        else:
            protocol = "Other/RAW"
    else:
        # Non-IP packets (like ARP)
        protocol = "Other/RAW"
        if hasattr(packet, 'dst') and packet.dst == conf.iface.mac:
            direction = "in"
        else:
            direction = "out"

    # Count packet toward live statistics
    packet_stats[direction][protocol] += 1

    # Dispatch stats every 2 seconds
    if current_time - last_stats_sent >= 2.0:
        send_packet_stats()

    # If not IP layer, skip threshold checks
    if not packet.haslayer(IP):
        return

    src_ip = packet[IP].src
    dst_ip = packet[IP].dst

    # Ignore local broadcast noise
    if src_ip == "0.0.0.0" or src_ip == "255.255.255.255":
        return

    # 0. GENERAL TRAFFIC FREQUENCY / REQUEST FLOOD
    check_threshold(src_ip, dst_ip, "High Frequency Request Flood", "HIGH", limit=10, window=4)

    # 1. DETECT ICMP (Ping Flood)
    if packet.haslayer(ICMP) and packet[ICMP].type == 8:
        check_threshold(src_ip, dst_ip, "ICMP Ping Flood", "LOW", limit=10, window=5)

    # 2. DETECT TCP SYN SCAN (Port Scan)
    elif packet.haslayer(TCP) and packet[TCP].flags == 'S':
        check_threshold(src_ip, dst_ip, "TCP SYN Scan", "MEDIUM", limit=20, window=10)

        # Unauthorized Access / Rapid Connection Attempt Check (SSH, RDP, Telnet, MSSQL)
        if packet[TCP].dport in [22, 23, 3389, 1433]:
            check_threshold(src_ip, dst_ip, f"Unauthorized Access Attempt (Port {packet[TCP].dport})", "CRITICAL", limit=5, window=5)

    # 3. DETECT UNUSUAL PORTS
    elif packet.haslayer(TCP):
        dst_port = packet[TCP].dport
        if dst_port in [6667, 8080, 3389, 22]:
            check_threshold(src_ip, dst_ip, f"Unusual Port Access (Port {dst_port})", "MEDIUM", limit=15, window=30)

    # 4. DETECT LARGE PAYLOADS (Exfiltration Check)
    elif len(packet) > 1500:
        check_threshold(src_ip, dst_ip, "Abnormal Payload Size (>1500 bytes)", "HIGH", limit=1, window=1)

    # 5. UDP FLOOD DETECTION
    elif packet.haslayer(UDP):
        check_threshold(src_ip, dst_ip, "UDP Flood", "MEDIUM", limit=30, window=5)

def start_sniffer():
    print(f"[*] SOC-GUARD Universal Packet Sniffer started...")
    print(f"[*] Monitoring all network packet layers & tracking protocol stats (in/out)...")
    print(f"[*] Sending suspicious activity alerts to: {API_URL}")
    sniff(prn=analyze_packet, store=0)

if __name__ == "__main__":
    try:
        start_sniffer()
    except Exception as e:
        print(f"[!] Error: {e}. Are you running as Administrator/Sudo?")