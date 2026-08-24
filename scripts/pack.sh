#!/bin/bash
# Packs $1 into $2 with Roadroller, keeping the best of $3 parallel searches.
#
# Roadroller tunes its sparse context models with simulated annealing seeded
# from Math.random, so each search lands somewhere in a ~25 byte band. One
# search is ~20s and there are cores to spare, so race a handful and keep the
# smallest; wall clock stays about the same as a single run.
set -uo pipefail

input="$1"
output="$2"
runs="${3:-8}"
tmp="$(dirname "$output")/pack"

rm -rf "$tmp"
mkdir -p "$tmp"

for i in $(seq 1 "$runs"); do
	npx roadroller "$input" -o "$tmp/$i.js" -O2 -D 2> "$tmp/$i.log" &
done
wait

best=
best_size=0
for i in $(seq 1 "$runs"); do
	[ -s "$tmp/$i.js" ] || continue
	size=$(wc -c < "$tmp/$i.js" | tr -d " ")
	echo "  run $i: $size bytes"
	if [ -z "$best" ] || [ "$size" -lt "$best_size" ]; then
		best="$i"
		best_size="$size"
	fi
done

if [ -z "$best" ]; then
	echo "pack.sh: every Roadroller run failed; last log:" >&2
	cat "$tmp/$runs.log" >&2
	exit 1
fi

# The params that won, in case they're worth pinning with -O0 later.
params=$(sed -n 's/.*use `\(.*\)` to replicate.*/\1/p' "$tmp/$best.log")
echo "  best: run $best at $best_size bytes ($params)"

cp "$tmp/$best.js" "$output"
rm -rf "$tmp"
