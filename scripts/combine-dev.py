import sys

js_files = sys.argv[1:]

html = open('build/index.html').read()

sys.stdout.write(
    html
        .replace("[JS]", ''.join(
            f'<script type="text/javascript" src="{path.replace("dev/", "")}"></script>' for path in js_files
        ))
        .replace("[CSS]", '<link rel="stylesheet" href="styles.css"/>')
)
