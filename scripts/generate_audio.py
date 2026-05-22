#!/usr/bin/env python3
"""
Generate all game sound effects as WAV files.
Uses only Python stdlib (wave, struct, math) — no dependencies.
"""

import wave, struct, math, os

OUTPUT_DIR = "assets/audio"
SAMPLE_RATE = 44100

os.makedirs(OUTPUT_DIR, exist_ok=True)


def write_wav(filename, samples, sample_rate=SAMPLE_RATE):
    """Write mono 16-bit WAV file."""
    path = os.path.join(OUTPUT_DIR, filename)
    with wave.open(path, 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        for s in samples:
            clamped = max(-1.0, min(1.0, s))
            w.writeframes(struct.pack('<h', int(clamped * 32767)))
    print(f"  ✅ {path} ({len(samples)} samples, {len(samples)/sample_rate:.2f}s)")


def sine(freq, duration, volume=0.5, fade_out=True):
    """Generate sine wave samples."""
    n = int(SAMPLE_RATE * duration)
    samples = []
    for i in range(n):
        t = i / SAMPLE_RATE
        env = 1.0
        if fade_out:
            env = max(0, 1.0 - (i / n) ** 0.5)
        samples.append(math.sin(2 * math.pi * freq * t) * volume * env)
    return samples


def noise_burst(duration, volume=0.3):
    """Generate filtered noise burst."""
    import random
    n = int(SAMPLE_RATE * duration)
    samples = []
    prev = 0
    for i in range(n):
        raw = random.uniform(-1, 1)
        # Simple low-pass filter
        filtered = prev * 0.7 + raw * 0.3
        prev = filtered
        env = max(0, 1.0 - (i / n))
        samples.append(filtered * volume * env)
    return samples


def mix(*sample_lists):
    """Mix multiple sample lists together."""
    max_len = max(len(s) for s in sample_lists)
    result = [0.0] * max_len
    for samples in sample_lists:
        for i, s in enumerate(samples):
            result[i] += s
    # Normalize if clipping
    peak = max(abs(s) for s in result) if result else 1
    if peak > 1.0:
        result = [s / peak for s in result]
    return result


def concat(*sample_lists):
    """Concatenate sample lists."""
    result = []
    for samples in sample_lists:
        result.extend(samples)
    return result


def silence(duration):
    """Generate silence."""
    return [0.0] * int(SAMPLE_RATE * duration)


def fade_in(samples, duration=0.01):
    """Apply fade-in to samples."""
    n = int(SAMPLE_RATE * duration)
    for i in range(min(n, len(samples))):
        samples[i] *= i / n
    return samples


def fade_out_samples(samples, duration=0.05):
    """Apply fade-out to end of samples."""
    n = int(SAMPLE_RATE * duration)
    start = max(0, len(samples) - n)
    for i in range(start, len(samples)):
        progress = (len(samples) - i) / n
        samples[i] *= progress
    return samples


# ============================================================
# Generate Sound Effects
# ============================================================

print("🔊 Generating game sound effects...\n")

# 1. Click — short snap for piece placement
print("1. click.wav")
click = sine(800, 0.06, 0.4)
click = mix(click, sine(1200, 0.04, 0.2))
write_wav("click.wav", click)

# 2. Snap — satisfying piece-snapping-into-place sound
print("2. snap.wav")
snap = sine(600, 0.03, 0.5)
snap2 = sine(900, 0.05, 0.3)
snap = concat(snap, snap2)
snap = fade_in(snap)
write_wav("snap.wav", snap)

# 3. Success — ascending three-note chime (C5-E5-G5)
print("3. success.wav")
c5 = sine(523.25, 0.18, 0.35)
e5 = sine(659.25, 0.18, 0.35)
g5 = sine(783.99, 0.28, 0.4)
success = concat(c5, silence(0.02), e5, silence(0.02), g5)
write_wav("success.wav", success)

# 4. Error / Bonk — single low tone
print("4. error.wav")
error = sine(200, 0.15, 0.3)
error = mix(error, sine(150, 0.12, 0.2))
write_wav("error.wav", error)

# 5. Whistle — train whistle (frequency sweep)
print("5. whistle.wav")
n_whistle = int(SAMPLE_RATE * 0.8)
whistle = []
for i in range(n_whistle):
    t = i / SAMPLE_RATE
    progress = i / n_whistle
    # Sweep from 600 to 900 Hz then back to 700
    if progress < 0.4:
        freq = 600 + (300 * progress / 0.4)
    else:
        freq = 900 - (200 * (progress - 0.4) / 0.6)
    env = min(1.0, progress * 10) * max(0, 1.0 - progress ** 2)
    whistle.append(math.sin(2 * math.pi * freq * t) * 0.35 * env)
write_wav("whistle.wav", whistle)

# 6. Fanfare — happy ascending melody (C5-D5-E5-G5-A5-C6)
print("6. fanfare.wav")
notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]
fanfare_parts = []
for i, freq in enumerate(notes):
    note = sine(freq, 0.12, 0.3)
    fanfare_parts.append(note)
    if i < len(notes) - 1:
        fanfare_parts.append(silence(0.02))
# Final sustained note
final_note = sine(1046.50, 0.5, 0.35)
fanfare_parts.append(silence(0.05))
fanfare_parts.append(final_note)
fanfare = concat(*fanfare_parts)
write_wav("fanfare.wav", fanfare)

# 7. Star — twinkling star earn sound
print("7. star.wav")
star1 = sine(1046.50, 0.1, 0.3)
star2 = sine(1318.51, 0.2, 0.35)
star = concat(star1, silence(0.01), star2)
# Add sparkle overtone
sparkle = sine(2637, 0.15, 0.1)
star = mix(star, concat(silence(0.05), sparkle))
write_wav("star.wav", star)

# 8. Button — short UI button press
print("8. button.wav")
button = sine(440, 0.05, 0.2)
button = mix(button, sine(660, 0.03, 0.1))
write_wav("button.wav", button)

# 9. Chug — train chugging/moving sound (rhythmic)
print("9. chug.wav")
chug_parts = []
for i in range(4):
    # Each chug: noise burst + low tone
    burst = noise_burst(0.08, 0.25)
    tone = sine(80 + i * 5, 0.08, 0.15)
    chug_cycle = mix(burst, tone)
    chug_parts.append(chug_cycle)
    chug_parts.append(silence(0.12))
chug = concat(*chug_parts)
write_wav("chug.wav", chug)

# 10. Pop — bubble pop for UI elements appearing
print("10. pop.wav")
n_pop = int(SAMPLE_RATE * 0.1)
pop = []
for i in range(n_pop):
    t = i / SAMPLE_RATE
    progress = i / n_pop
    freq = 400 + 600 * (1 - progress)  # Descending chirp
    env = max(0, 1.0 - progress ** 0.3)
    pop.append(math.sin(2 * math.pi * freq * t) * 0.35 * env)
write_wav("pop.wav", pop)

# 11. Slide — sliding piece sound
print("11. slide.wav")
n_slide = int(SAMPLE_RATE * 0.2)
slide = []
for i in range(n_slide):
    t = i / SAMPLE_RATE
    progress = i / n_slide
    freq = 300 + 200 * progress
    env = 0.3 * (1.0 - progress) * min(1, progress * 20)
    slide.append(math.sin(2 * math.pi * freq * t) * env)
write_wav("slide.wav", slide)

# 12. Correct — correct match sound (cheerful double beep)
print("12. correct.wav")
beep1 = sine(880, 0.1, 0.3)
beep2 = sine(1108, 0.15, 0.35)
correct = concat(beep1, silence(0.05), beep2)
write_wav("correct.wav", correct)

# 13. Wrong — gentle wrong buzz
print("13. wrong.wav")
wrong1 = sine(250, 0.12, 0.25)
wrong2 = sine(200, 0.15, 0.25)
wrong = concat(wrong1, silence(0.02), wrong2)
write_wav("wrong.wav", wrong)

# 14. Level Start — short intro jingle
print("14. levelstart.wav")
intro_notes = [
    (392.00, 0.1),  # G4
    (440.00, 0.1),  # A4
    (523.25, 0.15), # C5
    (659.25, 0.25), # E5
]
intro_parts = []
for freq, dur in intro_notes:
    intro_parts.append(sine(freq, dur, 0.3))
    intro_parts.append(silence(0.02))
levelstart = concat(*intro_parts)
write_wav("levelstart.wav", levelstart)

# 15. Hint — soft notification bell
print("15. hint.wav")
bell1 = sine(1200, 0.15, 0.2)
bell2 = sine(1500, 0.2, 0.15)
hint = mix(
    concat(bell1, silence(0.05), bell2),
    concat(silence(0.0), sine(2400, 0.1, 0.05))
)
write_wav("hint.wav", hint)

print(f"\n✅ All {15} sound effects generated in '{OUTPUT_DIR}/'!")
print(f"   Total files: {len(os.listdir(OUTPUT_DIR))}")
