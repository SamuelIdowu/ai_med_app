import os
import sys
import io
import json
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.services.vision_engine import WoundVisionEngine

def main():
    engine = WoundVisionEngine()
    
    # Check data/image and data/images
    candidate_dirs = [
        os.path.join("data", "image"),
        os.path.join("data", "images")
    ]
    
    image_dir = None
    for d in candidate_dirs:
        if os.path.isdir(d):
            image_dir = d
            break
            
    if not image_dir:
        print("No image directory found in data/image or data/images")
        return

    images = [f for f in os.listdir(image_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))]
    print(f"Testing {len(images)} images found in {image_dir}/\n")
    
    results = []
    
    for img_name in sorted(images):
        img_path = os.path.join(image_dir, img_name)
        with open(img_path, "rb") as f:
            raw_bytes = f.read()
            
        with Image.open(img_path) as im:
            width, height = im.size
            mode = im.mode
            fmt = im.format
            
        classification_result = engine.classify_wound(raw_bytes)
        
        info = {
            "filename": img_name,
            "path": img_path,
            "filesize_bytes": len(raw_bytes),
            "dimensions": f"{width}x{height}",
            "color_mode": mode,
            "format": fmt,
            "classification": classification_result["classification"],
            "severity_grade": classification_result["severity_grade"],
            "confidence": classification_result["confidence"],
            "erythema_index": classification_result["annotations"].get("erythema_index"),
            "contrast_index": classification_result["annotations"].get("contrast_index"),
            "recommendation": classification_result["recommendation"],
            "red_flags": classification_result["red_flags"]
        }
        results.append(info)
        
        print("=" * 60)
        print(f"File: {img_name}")
        print(f"Dimensions: {width}x{height} | Mode: {mode} | Size: {len(raw_bytes):,} bytes")
        print(f"Classification  : {info['classification'].upper()}")
        print(f"Severity Grade  : {info['severity_grade'].upper()}")
        print(f"Confidence      : {round(info['confidence'] * 100, 1)}%")
        print(f"Erythema Index  : {info['erythema_index']} (Tissue inflammation ratio)")
        print(f"Contrast Index  : {info['contrast_index']} (Edge / tissue variance)")
        print(f"Recommendation  :\n  {info['recommendation']}")
        print("Red Flags to Monitor:")
        for rf in info['red_flags']:
            print(f"  • {rf}")
            
    print("\n" + "=" * 60)
    print("COMPARATIVE SUMMARY")
    print("=" * 60)
    print(f"{'Filename':<20} | {'Class':<12} | {'Severity':<10} | {'Conf':<6} | {'Erythema':<8} | {'Contrast':<8}")
    print("-" * 75)
    for r in results:
        print(f"{r['filename']:<20} | {r['classification']:<12} | {r['severity_grade']:<10} | {round(r['confidence']*100, 1)}% | {r['erythema_index']:<8} | {r['contrast_index']:<8}")

if __name__ == "__main__":
    main()
