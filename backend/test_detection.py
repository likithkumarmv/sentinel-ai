import requests

url = "http://localhost:8000/api/detection/analyze_frame"
image_url = "https://upload.wikimedia.org/wikipedia/commons/3/37/Face-smiling.jpg"

print("[*] Downloading sample face image for testing...")
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
img_data = requests.get(image_url, headers=headers).content

with open("test_face.jpg", "wb") as f:
    f.write(img_data)

print("[*] Sending frame to detection API analyze_frame endpoint...")
with open("test_face.jpg", "rb") as f:
    files = {"file": ("test_face.jpg", f, "image/jpeg")}
    response = requests.post(url, files=files)
    print("[+] Response:")
    import json
    print(json.dumps(response.json(), indent=2))

