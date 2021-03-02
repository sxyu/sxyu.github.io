from jinja2 import Template, Environment, FileSystemLoader
import os
import os.path as osp
import json
dir_path = osp.dirname(os.path.realpath(__file__))

all_required_jsonlist = []
nav, req_jsonlist = [], []
def register_page(path, menu_text, req_json=[]):
    nav.append((path, menu_text))
    req_jsonlist.append(req_json)
    all_required_jsonlist.extend(req_json)

# Register the pages here: path/url, name
register_page('index.html', 'About', ['pubs', 'timeline'])
register_page('projects.html', 'Projects')
register_page('contests.html', 'Contests + Interests')
#  register('teaching.html', 'Teaching')

# Dedup
all_required_jsonlist = list(set(all_required_jsonlist))
all_jsonlist = {}
# Load jsons for each listing
for json_req in all_required_jsonlist:
    lst = []
    config = json.load(open(osp.join(dir_path, json_req, '_config.json'), 'r'))

    files = sorted(os.listdir(osp.join(dir_path, json_req)))
    if config.get('reversed', False):
        files = reversed(files)
    for json_name in files:
        if json_name == '_config.json':
            continue;
        with open(osp.join(dir_path, json_req, json_name), 'r') as f:
            j = json.load(f)
            lst.append(j)
    all_jsonlist[json_req] = lst

for (path, page_id), json_reqs in zip(nav, req_jsonlist):
    with open(os.path.join(dir_path, path), 'r') as f:
        template = Environment(loader=FileSystemLoader(dir_path)).from_string(f.read())

    extras = {}
    for json_req in json_reqs:
        extras[json_req] = all_jsonlist[json_req]

    render_html = template.render(navigation = nav, active_page = page_id, **extras)
    with open(os.path.join(dir_path, '../' + path), 'w') as f:
        f.write(render_html)

