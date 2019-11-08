@echo off
pscp *.html *.png *.ico site.webmanifest browserconfig.xml sxyu@ssh.ocf.berkeley.edu:public_html
pscp *.html *.png *.ico site.webmanifest browserconfig.xml ayu@35.211.92.166:public_html
pscp css/*.css sxyu@ssh.ocf.berkeley.edu:public_html/css
pscp css/*.css ayu@35.211.92.166:public_html/css
pscp js/*.js sxyu@ssh.ocf.berkeley.edu:public_html/js
pscp js/*.js ayu@35.211.92.166:public_html/js
pscp img/* sxyu@ssh.ocf.berkeley.edu:public_html/img
pscp img/* ayu@35.211.92.166:public_html/img
