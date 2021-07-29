from sitelib import Site

def main():
    site = Site()

    # Register the pages here: path/url to file, name for sidebar, json listings to include
    site.register_page('index.html', 'About', ['pubs', 'timeline'])
    site.register_page('projects.html', 'Projects')
    site.register_page('contests.html', 'Contests + Interests')
    #  register('teaching.html', 'Teaching')

    site.build()

if __name__ == "__main__":
    main()
