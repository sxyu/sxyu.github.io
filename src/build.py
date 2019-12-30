from jinja2 import Template, Environment, FileSystemLoader
import os
dir_path = os.path.dirname(os.path.realpath(__file__))

nav = []
def register(path, menu_text):
    nav.append((path, menu_text))

# Register the pages here: path/url, name
register('index.html', 'About')
register('projects.html', 'Projects')
register('contests.html', 'Contests + Interests')
#  register('teaching.html', 'Teaching')

for path, page_id in nav:
    with open(os.path.join(dir_path, path), 'r') as f:
        template = Environment(loader=FileSystemLoader(dir_path)).from_string(f.read())
    render_html = template.render(navigation = nav, active_page = page_id)
    with open(os.path.join(dir_path, '../' + path), 'w') as f:
        f.write(render_html)

