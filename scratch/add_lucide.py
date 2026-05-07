import os
import glob

views_dir = r"c:\Users\Daniel\Documents\ENGENHARIA2\ENGENHARIA2\frontend\views"

lucide_script = '<script src="https://unpkg.com/lucide@latest"></script>'

for filepath in glob.glob(os.path.join(views_dir, "*.html")):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    if "lucide" not in content:
        content = content.replace("</head>", f"    {lucide_script}\n</head>")
        
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

print("Lucide script added to all HTML files.")
