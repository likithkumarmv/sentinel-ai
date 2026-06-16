from fastapi import APIRouter, File, UploadFile, HTTPException
import traceback

router = APIRouter()

# Lazy-load heavy ML models to prevent crashing the entire backend if they're missing.
# Object detection is a nice-to-have feature — the core interview system must not depend on it.
yolo_model = None

def _load_yolo():
    """Attempt to load YOLO model. Called once on first request."""
    global yolo_model
    if yolo_model is not None:
        return True
    try:
        from ultralytics import YOLO
        print("[Models] Initializing YOLOv8 Nano model...")
        yolo_model = YOLO("yolov8n.pt")
        print("[Models] YOLOv8 Nano loaded successfully.")
        return True
    except ImportError:
        print("[Models] ultralytics not installed — object detection disabled.")
        return False
    except Exception as e:
        print(f"[Models] Failed to load YOLO: {e}")
        return False

@router.post("/analyze_frame")
async def analyze_frame(file: UploadFile = File(...)):
    if not _load_yolo():
        # Return empty detections instead of 500 — frontend handles gracefully
        return {"success": True, "detections": []}
    
    try:
        from PIL import Image
        import io

        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # predict
        results_list = yolo_model.predict(image, conf=0.3, verbose=False)
        if not results_list:
            return {"success": True, "detections": []}
            
        result = results_list[0]
        
        # format results
        results = []
        for box in result.boxes:
            class_id = int(box.cls[0].item())
            label = result.names[class_id]
            confidence = float(box.conf[0].item())
            bbox = box.xyxy[0].tolist() # [x_min, y_min, x_max, y_max]
            
            results.append({
                "label": label,
                "confidence": confidence,
                "bbox": bbox
            })
            
        return {"success": True, "detections": results}
    except Exception as e:
        print("Detection error:", e)
        traceback.print_exc()
        # Return empty instead of crashing the request
        return {"success": True, "detections": []}
