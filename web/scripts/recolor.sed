# One-off migration for the made-to-measure redesign (deleted in Task 11).
# Maps the old dark-indigo classes onto the new tokens.
# Usage: sed -i -E -f scripts/recolor.sed <files>
s@hover:bg-brand/90@hover:bg-thread-deep@g
s@bg-brand text-white@bg-thread text-tissue@g
s@bg-\[#f59e0b\]@bg-tape@g
s@text-\[#f59e0b\]@text-ink@g
s@from-\[#818cf8\] to-\[#4338ca\]@from-thread to-thread-deep@g
s@from-brand-light via-brand to-\[#4338ca\]@from-thread to-thread-deep@g
s@text-\[10px\] font-bold tracking-\[0\.1[0-3]em\] uppercase text-brand@font-mono text-[11px] uppercase tracking-[0.14em] text-ink-2@g
s@rgba\(255, ?255, ?255, ?@rgba(28,26,23,@g
s@rgba\(99, ?102, ?241, ?@rgba(196,50,31,@g
s@rgba\((34, ?197, ?94|52, ?211, ?153), ?@rgba(59,91,143,@g
s@rgba\((239, ?68, ?68|248, ?113, ?113), ?@rgba(196,50,31,@g
s@rgba\(245, ?158, ?11, ?@rgba(230,180,34,@g
s@rgba\(13, ?17, ?23, ?@rgba(242,234,219,@g
s@rgba\(42, ?52, ?82, ?@rgba(179,164,137,@g
s@rgba\(0, ?0, ?0, ?0?\.[4-9][0-9]*\)@rgba(28,26,23,0.16)@g
s@rgba\(0, ?0, ?0, ?0?\.[0-3][0-9]*\)@rgba(28,26,23,0.06)@g
s@#22c55e@#3B5B8F@gI
s@#ef4444@#C4321F@gI
s@#f59e0b@#8A6100@gI
s@#(6366f1|818cf8)@#C4321F@gI
s@#4338ca@#A3281A@gI
/<h[12][ >]/ s@(["' ])font-(extrabold|bold) ?@\1@g
/<h[12][ >]/ s@ ?([a-z0-9:\[\]-]+:)?tracking-\[-[0-9.]+px\]@@g
