# MITRE ATT&CK mappings (basic)
MITRE_MAPPING = {
    "brute_force": {
        "technique_id": "T1110",
        "technique_name": "Brute Force",
        "tactic": "Credential Access"
    },
    "port_scan": {
        "technique_id": "T1046",
        "technique_name": "Network Service Scanning",
        "tactic": "Discovery"
    }
}









def explain_threat(flow_data, prediction, confidence):
    """
    Explains WHY traffic is Normal or Attack
    and maps it to MITRE ATT&CK
    """

    mitre_info = None

    if prediction == "Attack":

        # Decide attack type based on behavior
        if flow_data["failed_logins"] >= 3:
            attack_type = "brute_force"
        elif flow_data["port_count"] >= 10:
            attack_type = "port_scan"
        else:
            attack_type = None

        # Fetch MITRE mapping
        if attack_type:
            mitre_info = MITRE_MAPPING[attack_type]

        explanation = (
            "Suspicious activity detected. "
            f"Failed login attempts: {flow_data['failed_logins']}, "
            f"Ports accessed: {flow_data['port_count']}, "
            f"Packet count: {flow_data['packet_count']}. "
            "Behavior matches known attack patterns."
        )

    else:
        explanation = (
            "Traffic behavior appears normal. "
            "No indicators of brute force or scanning activity detected."
        )

    return {
        "prediction": prediction,
        "confidence": round(confidence, 2),
        "explanation": explanation,
        "mitre": mitre_info
    }










if __name__ == "__main__":
    sample_flow = {
        "packet_count": 70,
        "failed_logins": 7,
        "port_count": 25
    }

    result = explain_threat(sample_flow, "Attack", 0.82)
    print(result)