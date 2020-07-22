#!/bin/bash
cd ~/proj/cc-tools/web-table
scp index.html ocf:public_html/table
scp css/style.css    ocf:public_html/table/css
scp js/main.js  ocf:public_html/table/js
scp data/*.json  ocf:public_html/table/data
