import sys

html = open('build/index.html').read()
js = open('build/main-packed.js').read().rstrip('\n')

# the stylesheet travels inside the JS payload in this build
sys.stdout.write(
    html
        .replace('[CSS]', '')
        # The closing </script> is REQUIRED. Dropping it saves 9 bytes and
        # silently breaks the page: Chrome discards the pending script at EOF
        # and runs nothing, with no console error. Verified by A/B test.
        .replace('[JS]', '<script>' + js + '</script>')
)
