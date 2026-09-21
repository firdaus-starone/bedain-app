import sys
from PIL import Image
import numpy as np

def crop_logo(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)
    
    # Define "white" as anything close to 255, 255, 255
    r, g, b, a = data.T
    white_areas = (r > 240) & (g > 240) & (b > 240)
    
    # Make white areas transparent
    data[..., 3][white_areas.T] = 0
    
    transparent_img = Image.fromarray(data)
    
    # Get bounding box of non-transparent pixels
    bbox = transparent_img.getbbox()
    if bbox:
        # Crop to bounding box
        cropped = transparent_img.crop(bbox)
        
        # We only want the icon on the left. The text is on the right.
        # Let's split the cropped image into left and right, assuming the icon is on the left third or half.
        width, height = cropped.size
        # Looking at typical logos, the icon is roughly a square on the left.
        # So let's crop a square from the left edge.
        icon_width = min(width, height + 20) # A bit wider than height to be safe
        icon = cropped.crop((0, 0, icon_width, height))
        
        # Trim again to get just the tight bounding box of the icon
        icon_bbox = icon.getbbox()
        if icon_bbox:
            final_icon = icon.crop(icon_bbox)
            final_icon.save(output_path, "PNG")
            print("Logo successfully cropped and saved to", output_path)
            return
            
    print("Failed to crop logo.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python crop.py <input> <output>")
        sys.exit(1)
    crop_logo(sys.argv[1], sys.argv[2])
