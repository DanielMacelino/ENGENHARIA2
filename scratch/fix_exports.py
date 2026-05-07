import os
import re

public_dir = r"c:\Users\Daniel\Documents\ENGENHARIA2\ENGENHARIA2\frontend\public"

def replace_all(file_name, old, new):
    path = os.path.join(public_dir, file_name)
    with open(path, "r", encoding="utf-8") as f:
        c = f.read()
    c = c.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(c)

# 1. utils.js
path = os.path.join(public_dir, "utils.js")
with open(path, "r", encoding="utf-8") as f:
    c = f.read()

# remove globals from utils.js
c = re.sub(r'let original.*?;', '', c)
c = c.replace("const API_URL = '/api';", "export const API_URL = '/api';")
c = c.replace("\nfunction ", "\nexport function ")
c = c.replace("\nasync function ", "\nexport async function ")
with open(path, "w", encoding="utf-8") as f:
    f.write(c)

# 2. auth.js
path = os.path.join(public_dir, "auth.js")
with open(path, "r", encoding="utf-8") as f:
    c = f.read()
c = c.replace("\nfunction ", "\nexport function ")
c = c.replace("\nasync function ", "\nexport async function ")
with open(path, "w", encoding="utf-8") as f:
    f.write(c)

# 3. dashboard.js
path = os.path.join(public_dir, "dashboard.js")
with open(path, "r", encoding="utf-8") as f:
    c = f.read()
c = c.replace("import { API_URL, showToast, getDistanciaHaversine } from './utils.js';", 
              "import { API_URL, showToast, getDistanciaHaversine } from './utils.js';\n\nlet originalAgendamentos = [];\nlet originalItens = [];\nlet originalLogs = [];")
c = c.replace("\nfunction ", "\nexport function ")
c = c.replace("\nasync function ", "\nexport async function ")
with open(path, "w", encoding="utf-8") as f:
    f.write(c)

print("Export fixes applied.")
