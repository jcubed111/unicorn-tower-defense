import sys

html = open('build/index.html').read()
js = open('build/main-packed.js').read().rstrip('\n')

# the stylesheet travels inside the JS payload in this build
sys.stdout.write(
    html
        .replace('[CSS]', '')
        # No closing </script>: it is the last thing in the file, and the HTML
        # parser closes an open script element at EOF. Worth 9 bytes.
        .replace('[JS]', '<script>' + js)
)
