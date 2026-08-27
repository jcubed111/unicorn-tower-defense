import sys
import re
import string


class_re = r'C--[a-zA-Z0-9_-]+'


# NOTE: only strip the trailing newline. A blanket replace('\n', '') also eats
# newline characters the minifier emits *inside* template literals (eg the one
# in the "Wave n/m\nNext wave in ..." countdown), silently corrupting them.
js = open('build/main-min.js').read().rstrip('\n');

# .strip() matters: this gets injected into a JS string literal, and a stray
# trailing newline makes it an unterminated string.
css = open('build/styles-min.css').read().strip()

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

# Hand out the one-character names to the classes that appear most often.
# (Past 26 classes the names go to two characters, so ordering is worth a few
# bytes.) Sorting also makes the build deterministic: iterating the set
# directly leaves the assignment at the mercy of PYTHONHASHSEED.
all_class_names = css_class_names | js_class_names
class_name_remapping = {
    c: unique_class_name(i)
    for i, c in enumerate(sorted(
        all_class_names,
        key=lambda c: (-(css + js).count(c), c),
    ))
}

def replace_classes(source):
    def class_replace(match):
        return class_name_remapping[match.group(0)]

    return re.sub(class_re, class_replace, source)

# The stylesheet rides along inside the JS payload (main.js document.write's it)
# rather than in its own <style> tag, so that it goes through the same
# compressor as the code instead of being deflated on its own.
if '[CSS]' not in js:
    print("ERROR: no [CSS] placeholder in the JS to inject the stylesheet into", file=sys.stderr)
    sys.exit(1)

sys.stdout.write(replace_classes(js.replace('[CSS]', css.replace('"', '\\"'))))
