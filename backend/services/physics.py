import math

def calculate_kinematic_stress(frames):
    """
    Takes a list of kinematic frames from MediaPipe and calculates:
    - Angular velocity (omega) of the head.
    - Number of stress spikes (rapid "snaps").
    - Time spent in >15 degree flexion (static load endurance).
    
    Each frame is expected to have:
    {
        "t": timestamp_ms,
        "nose": {"x", "y", "z"},
        "left_shoulder": {"x", "y", "z"},
        "right_shoulder": {"x", "y", "z"},
        "left_hip": {"x", "y", "z"},
        "right_hip": {"x", "y", "z"}
    }
    """
    if not frames or len(frames) < 2:
        return {
            "max_angular_velocity": 0.0,
            "stress_spikes": 0,
            "flexion_seconds": 0.0
        }

    max_omega = 0.0
    stress_spikes = 0
    flexion_ms = 0.0
    
    OMEGA_SPIKE_THRESHOLD = 150.0  # degrees per second, threshold for a "snap"

    for i in range(1, len(frames)):
        prev = frames[i-1]
        curr = frames[i]
        
        dt_s = (curr["t"] - prev["t"]) / 1000.0
        if dt_s <= 0.001:
            continue

        # Calculate shoulder midpoint for prev and curr
        prev_shoulder_x = (prev["left_shoulder"]["x"] + prev["right_shoulder"]["x"]) / 2.0
        prev_shoulder_y = (prev["left_shoulder"]["y"] + prev["right_shoulder"]["y"]) / 2.0
        
        curr_shoulder_x = (curr["left_shoulder"]["x"] + curr["right_shoulder"]["x"]) / 2.0
        curr_shoulder_y = (curr["left_shoulder"]["y"] + curr["right_shoulder"]["y"]) / 2.0

        # Calculate head angle relative to shoulders (in 2D plane for simplicity, or 3D if z is reliable)
        # We will use 2D (x, y) as MediaPipe z can be noisy, but x,y are normalized 0-1
        # Calculate angle of the vector from shoulder to nose
        prev_dx = prev["nose"]["x"] - prev_shoulder_x
        prev_dy = prev["nose"]["y"] - prev_shoulder_y
        prev_angle = math.degrees(math.atan2(prev_dx, prev_dy))
        
        curr_dx = curr["nose"]["x"] - curr_shoulder_x
        curr_dy = curr["nose"]["y"] - curr_shoulder_y
        curr_angle = math.degrees(math.atan2(curr_dx, curr_dy))

        # Angular velocity (omega) = dTheta / dt
        d_theta = abs(curr_angle - prev_angle)
        # Handle wrap-around
        if d_theta > 180:
            d_theta = 360 - d_theta
            
        omega = d_theta / dt_s
        
        if omega > max_omega:
            max_omega = omega
            
        if omega > OMEGA_SPIKE_THRESHOLD:
            # We might want to debounce this, but for now simple count
            stress_spikes += 1

        # Calculate spine angle (Static Load Endurance)
        curr_hip_x = (curr["left_hip"]["x"] + curr["right_hip"]["x"]) / 2.0
        curr_hip_y = (curr["left_hip"]["y"] + curr["right_hip"]["y"]) / 2.0
        
        spine_dx = curr_shoulder_x - curr_hip_x
        spine_dy = curr_shoulder_y - curr_hip_y
        # Vertical is 0 degrees flexion (assuming y is down). 
        # spine_dx = 0 means straight up/down. 
        spine_angle = math.degrees(math.atan2(spine_dx, -spine_dy))
        
        if abs(spine_angle) > 15.0:
            flexion_ms += (curr["t"] - prev["t"])

    # Basic debounce for stress spikes (since high omega might span a few frames)
    # If frames are 30fps, 1 spike might trigger 2-3 times. 
    # Let's divide by 3 for a rough debounce
    stress_spikes = stress_spikes // 3

    return {
        "max_angular_velocity": round(max_omega, 2),
        "stress_spikes": stress_spikes,
        "flexion_seconds": round(flexion_ms / 1000.0, 2)
    }
