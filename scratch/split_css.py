import os

css_path = r"c:\Users\Daniel\Documents\ENGENHARIA2\ENGENHARIA2\frontend\public\style.css"
out_dir = r"c:\Users\Daniel\Documents\ENGENHARIA2\ENGENHARIA2\frontend\public"

with open(css_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

def write_css(name, ranges):
    with open(os.path.join(out_dir, name), "w", encoding="utf-8") as f:
        f.write(f"/* {name} */\n")
        for start, end in ranges:
            # 1-indexed to 0-indexed
            f.writelines(lines[start-1:end])

# variables.css
write_css("variables.css", [(1, 30), (265, 274)])

# layout.css
write_css("layout.css", [(31, 211)])

# components.css
write_css("components.css", [(212, 264), (275, 321), (575, 731)])

# pages.css
write_css("pages.css", [(322, 574), (732, len(lines))])

print("CSS split completed.")
