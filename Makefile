ASEPRITE := "$$HOME/Library/Application Support/Steam/steamapps/common/Aseprite/Aseprite.app/Contents/MacOS/aseprite"

SPRITE_SIZE := 15

JS_FILES := \
	src/utils.js \
	src/gameState.js \
	src/audio.js \
	src/particles.js \
	src/sprite.js \
	dev/sprites.js \
	src/enemy.js \
	src/tower.js \
	src/terrain.js \
	src/render.js \
	src/htmlRender.js \
	src/levelData.js \
	src/gameFlow.js \
	src/main.js

# IMAGES := $(wildcard src/*.png)
# IMAGES_DIST := $(IMAGES:src/%.png=dist/%.webp)
# IMAGES_DEV := $(IMAGES:src/%.png=dev/%.webp)

JS_DEV := $(JS_FILES:src/%=dev/%)

# how many parallel Roadroller searches to race. Each is ~20s and they run
# concurrently, so more is nearly free until you run out of cores.
PACK_RUNS := 8

# how many itertions to zip for. Less is faster; seems to max out after 10k
# ZIP_ITERS := 10000
ZIP_ITERS := 100


.PHONY: all report clean

all: $(IMAGES_DEV) dev/index.html to-be-titled.zip report

clean:
	rm -rf dev/*
	rm -rf dev/.[!.]*
	rm -rf dist/*
	rm -rf dist/.[!.]*
	rm -rf build/*
	rm -rf build/.[!.]*

# dev/%.webp: dist/%.webp
# 	cp $^ $@

dev/%.js: src/%.js
	cp $^ $@

dev/styles.css: build/styles-min.css
	cp $^ $@

dev/sprites.js: build/sprites.png scripts/compileSprites.js
	@echo $@ "<-" $^
	@node scripts/compileSprites.js $< $@ $(SPRITE_SIZE)

dev/index.html: build/index.html $(IMAGES_DEV) $(JS_DEV) scripts/combine-dev.py dev/styles.css
	python3 scripts/combine-dev.py $(JS_DEV) > $@


build/main-max.js: $(JS_FILES)
	@echo $@ "<-" $^
	@cat $^ > build/main-max.js


build/main-min.js: build/main-max.js
	@echo $@ "<-" $^
	@npx google-closure-compiler --js=build/main-max.js --js_output_file=build/main-min-1.js --compilation_level=ADVANCED_OPTIMIZATIONS
	@npx uglifyjs build/main-min-1.js -c drop_console=true,unsafe=true,passes=3 -m --mangle-props --toplevel > build/main-min-2.js
	@cat build/main-min-2.js | sed 's/window[.]//g' > $@

# Roadroller is a context-mixing packer: it beats DEFLATE badly enough on this
# payload to be worth the ~2KB self-extracting stub it prepends. Its parameter
# search is randomized, so pack.sh races PACK_RUNS of them and keeps the best.
build/main-packed.js: build/main-payload.js scripts/pack.sh
	@echo $@ "<-" $^
	@scripts/pack.sh $< $@ $(PACK_RUNS)
# 	npx uglifyjs build/main-min-1.js \
# 	    --compress \
# 	        arrows=true,booleans=true,collapse_vars=true,comparisons=true,dead_code=true,drop_console=true,drop_debugger=true,hoist_funs=true,hoist_props=true,hoist_vars=true,if_return=true,inline=3,join_vars=true,keep_fargs=false,keep_infinity=false,loops=true,module=true,negate_iife=true,properties=true,pure_getters=true,reduce_funcs=true,reduce_vars=true,sequences=true,side_effects=true,strings=true,switches=true,templates=true,top_retain=false,toplevel=true,typeofs=true,unsafe=true,unsafe_comps=true,unsafe_Function=true,unsafe_math=true,unsafe_proto=true,unsafe_regexp=true,unsafe_undefined=true,unused=true \
# 	    --mangle \
# 	    --toplevel \
# 	    --output $@

build/sprites.png: src/sprites.aseprite
	@echo $@ "<-" $^
	@$(ASEPRITE) -b $^ --sheet-type horizontal --sheet $@ > /dev/null

build/styles-min.css: src/styles.scss scripts/optimize-css.js
	@echo $@ "<-" $<
	@npx sass $< $@-1 --style=compressed --no-source-map
	@cat $@-1 | node scripts/optimize-css.js > $@

build/index.html: src/index.html
	@echo $@ "<-" $^
	@ npx html-minifier \
		--collapse-whitespace \
		--remove-comments \
		--remove-optional-tags \
		--remove-redundant-attributes \
		--remove-script-type-attributes \
		--remove-tag-whitespace \
		-o $@ \
		$^


# # There are two compression methods here, I'm getting basically the same
# # results for each atm, but might be worth trying later too.
# dist/%.webp: src/%.png
# 	@echo $@ "<-" $^
# 	@cwebp -lossless -q 100 -m 6 -z 9 -metadata none $^ -o $@
# # 	@magick $^ -define webp:lossless=true -quality 100 -define webp:method=6 -strip $@

dist/styles-min.css: build/styles-min.css
	cp $^ $@

# The finished JS payload: minified code with the stylesheet injected into it
# and every C-- CSS class name shortened, in both the code and the CSS.
build/main-payload.js: build/main-min.js build/styles-min.css scripts/combine.py
	@echo $@ "<-" $^
	@python3 scripts/combine.py > $@

dist/index.html: build/index.html build/main-packed.js scripts/wrap-html.py
	@echo $@ "<-" $^
	@python3 scripts/wrap-html.py > $@

to-be-titled.zip: dist/index.html $(IMAGES_DIST)
	@echo $@ "<-" $^
	@rm -f $@ dist/$@
	@cd dist && 7z a -tzip -bd -bso0 -bsp0 -mx9 $@ $(^:dist/%=%)
	@mv dist/$@ $@
	@npx advzip --recompress --shrink-insane -q -i$(ZIP_ITERS) $@
	@rm -rf test_extract
	@unzip to-be-titled.zip -d test_extract > /dev/null

report: to-be-titled.zip
	@echo '------------------------------------';
	@echo;
	@FILE_SIZE=$$(stat -c%s to-be-titled.zip 2>/dev/null || stat -f%z to-be-titled.zip); \
		PERCENT=$$(awk -v f="$$FILE_SIZE" -v t="13312" 'BEGIN { printf "%.3f", (f/t)*100 }'); \
		if (( $$(echo "$$PERCENT > 100" | bc -l) )); then \
			MESSAGE=$$(echo "🛑 TOO LARGE 🛑"); \
		else \
			MESSAGE=$$(echo "👍"); \
		fi; \
		echo "      $$FILE_SIZE / 13,312  =  $$PERCENT%  $$MESSAGE"; \
		echo "Prev: $$FILE_SIZE / 13,312  =  $$PERCENT%  $$MESSAGE  (from last committed)" > zipinfo.txt;
	-@git show HEAD:zipinfo.txt
	@echo;
	@echo '------------------------------------';
