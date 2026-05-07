import os
import glob

views_dir = r"c:\Users\Daniel\Documents\ENGENHARIA2\ENGENHARIA2\frontend\views"

css_replacement = """    <link rel="stylesheet" href="/public/variables.css">
    <link rel="stylesheet" href="/public/layout.css">
    <link rel="stylesheet" href="/public/components.css">
    <link rel="stylesheet" href="/public/pages.css">"""

js_old = '<script src="/public/script.js"></script>'
js_new = '<script type="module" src="/public/main.js"></script>'

for filepath in glob.glob(os.path.join(views_dir, "*.html")):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace CSS
    content = content.replace('    <link rel="stylesheet" href="/public/style.css">', css_replacement)
    content = content.replace('<link rel="stylesheet" href="/public/style.css">', css_replacement)
    
    # Replace JS
    content = content.replace(js_old, js_new)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

print("HTML files updated successfully.")
