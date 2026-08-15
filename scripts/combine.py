import sys
import re
import string


class_re = r'C--[a-zA-Z0-9_-]+'


# the minifier leaves a couple newlines in we need to cut out.
js = open('build/main-min.js').read().replace('\n', '');

css = open('build/styles-min.css').read()
html = open('build/index.html').read()

css_class_names = set(re.findall(class_re, css))
js_class_names = set(re.findall(class_re, js))

extra_classes = css_class_names ^ js_class_names

for c in extra_classes:
    print(f"ERROR: Found extra class name {c}\n", file=sys.stderr)

def unique_class_name(i):
    result = ''
    while True:
        remaining = i % 26
        result = string.ascii_lowercase[remaining] + result
        if i < 26:
            break
        i = (i // 26) - 1
    return result

class_name_remapping = {
    c: unique_class_name(i)
    for i, c in enumerate(css_class_names | js_class_names)
}

def replace_classes(source):
    def class_replace(match):
        return class_name_remapping[match.group(0)]

    return re.sub(class_re, class_replace, source)

# print(class_name_remapping, file=sys.stderr)

sys.stdout.write(
    html
        .replace("[JS]", '<script>' + replace_classes(js) + '</script>')
        .replace("[CSS]", '<style>' + replace_classes(css) + '</style>')
)
