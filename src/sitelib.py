from jinja2 import Template, Environment, FileSystemLoader
import os
import os.path as osp
import json
dir_path = osp.dirname(os.path.realpath(__file__))

class Site:
    def __init__(self):
        self.all_required_jsonlist = []
        self.nav = []
        self.req_jsonlist = []
        with open(osp.join(dir_path, "autolink.json")) as f:
            self.links = json.load(f)

    def register_page(self, path, menu_text, req_json=[]):
        self.nav.append((path, menu_text))
        self.req_jsonlist.append(req_json)
        self.all_required_jsonlist.extend(req_json)

    def build(self):
        # Dedup
        all_required_jsonlist = list(set(self.all_required_jsonlist))
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

        def autolink(name):
            if name in self.links:
                link_data = self.links[name]
                class_str = (' class="' + link_data["class"] + '"') if "class" in link_data else ""
                return '<a href="' + link_data["link"] + '"' + class_str + '>' + name + '</a>'
            else:
                return name

        for (path, page_id), json_reqs in zip(self.nav, self.req_jsonlist):
            print("Building", path)
            with open(os.path.join(dir_path, path), 'r') as f:
                template = Environment(loader=FileSystemLoader(dir_path)).from_string(f.read())

            render_html = template.render(navigation = self.nav, active_page = page_id,
                                          autolink = autolink,
                                          **all_jsonlist)
            with open(os.path.join(dir_path, '../' + path), 'w') as f:
                f.write(render_html)
        print("Done")
