import sys

html = open('build/index.html').read()
js = open('build/main-packed.js').read().rstrip('\n')

# the stylesheet travels inside the JS payload in this build
sys.stdout.write(
    html
        .replace('[CSS]', '')
        .replace('[JS]', '<script>' + js + '</script>')
)
