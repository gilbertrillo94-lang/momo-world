const GENERATOR_VERSION = 1;
const MEMORY_CACHE = new Map();
const IN_FLIGHT = new Map();

const DIFFICULTY_CONFIG = {
  EASY: {
    minGapMs: 360,
    subdivision: 1,
    onsetThreshold: 1.18,
    quietThreshold: 0.22,
    chordChance: 0,
    maxNotesPerSecond: 2.8,
  },
  NORMAL: {
    minGapMs: 245,
    subdivision: 2,
    onsetThreshold: 1.08,
    quietThreshold: 0.17,
    chordChance: 0.035,
    maxNotesPerSecond: 4.3,
  },
  HARD: {
    minGapMs: 155,
    subdivision: 2,
    onsetThreshold: 0.98,
    quietThreshold: 0.12,
    chordChance: 0.075,
    maxNotesPerSecond: 6.2,
  },
  EXPERT: {
    minGapMs: 105,
    subdivision: 4,
    onsetThreshold: 0.9,
    quietThreshold: 0.09,
    chordChance: 0.12,
    maxNotesPerSecond: 8.2,
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeDifficulty(difficulty) {
  const normalized = String(difficulty || "NORMAL").toUpperCase();
  return DIFFICULTY_CONFIG[normalized] ? normalized : "NORMAL";
}

function hashString(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seedText) {
  let state = hashString(seedText) || 1;

  return function random() {
    state += 0x6d2b79f5;
    let value = state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function getCacheKey(song, difficulty) {
  return [
    "mba",
    GENERATOR_VERSION,
    song.id || song.audio,
    difficulty,
    song.audio,
    song.bpm || "auto",
    song.audioOffset || 0,
    song.patternOffset || 0,
  ].join(":");
}

function getStoredChart(cacheKey) {
  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      parsed.version !== GENERATOR_VERSION ||
      !Array.isArray(parsed.notes)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function storeChart(cacheKey, result) {
  try {
    window.localStorage.setItem(
      cacheKey,
      JSON.stringify({
        version: GENERATOR_VERSION,
        bpm: result.bpm,
        beatOffsetMs: result.beatOffsetMs,
        duration: result.duration,
        notes: result.notes,
      })
    );
  } catch {
    // localStorage can be unavailable or full. Memory caching still works.
  }
}

async function decodeAudio(audioPath) {
  const response = await fetch(audioPath);

  if (!response.ok) {
    throw new Error(`Could not load audio file: ${audioPath}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("Web Audio is not supported on this device.");
  }

  const context = new AudioContextClass();

  try {
    return await context.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    context.close?.().catch(() => {});
  }
}

function mixToMono(audioBuffer) {
  const channelCount = audioBuffer.numberOfChannels;
  const sampleCount = audioBuffer.length;
  const mono = new Float32Array(sampleCount);

  for (let channel = 0; channel < channelCount; channel += 1) {
    const channelData = audioBuffer.getChannelData(channel);

    for (let index = 0; index < sampleCount; index += 1) {
      mono[index] += channelData[index] / channelCount;
    }
  }

  return mono;
}

function analyzeFrames(samples, sampleRate) {
  const frameDuration = 0.02;
  const frameSize = Math.max(256, Math.floor(sampleRate * frameDuration));
  const frameCount = Math.ceil(samples.length / frameSize);

  const energy = new Float32Array(frameCount);
  const transient = new Float32Array(frameCount);
  const lowEnergy = new Float32Array(frameCount);

  let previousSample = 0;
  let lowPass = 0;

  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * frameSize;
    const end = Math.min(samples.length, start + frameSize);

    let sumSquares = 0;
    let transientSquares = 0;
    let lowSquares = 0;

    for (let index = start; index < end; index += 1) {
      const sample = samples[index];
      const difference = sample - previousSample;

      lowPass += 0.055 * (sample - lowPass);

      sumSquares += sample * sample;
      transientSquares += difference * difference;
      lowSquares += lowPass * lowPass;

      previousSample = sample;
    }

    const count = Math.max(1, end - start);

    energy[frame] = Math.sqrt(sumSquares / count);
    transient[frame] = Math.sqrt(transientSquares / count);
    lowEnergy[frame] = Math.sqrt(lowSquares / count);
  }

  return {
    energy,
    transient,
    lowEnergy,
    frameDuration,
  };
}

function smoothArray(values, radius = 2) {
  const result = new Float32Array(values.length);

  for (let index = 0; index < values.length; index += 1) {
    let sum = 0;
    let count = 0;

    for (
      let neighbor = Math.max(0, index - radius);
      neighbor <= Math.min(values.length - 1, index + radius);
      neighbor += 1
    ) {
      sum += values[neighbor];
      count += 1;
    }

    result[index] = sum / Math.max(1, count);
  }

  return result;
}

function buildOnsetEnvelope(analysis) {
  const { energy, transient, lowEnergy } = analysis;
  const envelope = new Float32Array(energy.length);

  let previousEnergy = 0;
  let previousLow = 0;

  for (let index = 0; index < energy.length; index += 1) {
    const energyRise = Math.max(0, energy[index] - previousEnergy);
    const lowRise = Math.max(0, lowEnergy[index] - previousLow);

    envelope[index] =
      transient[index] * 0.48 +
      energyRise * 2.1 +
      lowRise * 1.65;

    previousEnergy = energy[index];
    previousLow = lowEnergy[index];
  }

  return smoothArray(envelope, 1);
}

function percentile(values, fraction) {
  if (!values.length) return 0;

  const sorted = Array.from(values).sort((a, b) => a - b);
  const index = clamp(
    Math.floor((sorted.length - 1) * fraction),
    0,
    sorted.length - 1
  );

  return sorted[index];
}

function estimateBpm(onsetEnvelope, frameDuration, bpmHint) {
  const hint = Number(bpmHint);

  if (Number.isFinite(hint) && hint >= 55 && hint <= 220) {
    return hint;
  }

  const minBpm = 70;
  const maxBpm = 190;
  let bestBpm = 120;
  let bestScore = -Infinity;

  const threshold = percentile(onsetEnvelope, 0.72);

  for (let bpm = minBpm; bpm <= maxBpm; bpm += 1) {
    const beatSeconds = 60 / bpm;
    const lag = Math.max(1, Math.round(beatSeconds / frameDuration));

    let score = 0;
    let comparisons = 0;

    for (let index = lag; index < onsetEnvelope.length; index += 1) {
      const current = onsetEnvelope[index];
      const previous = onsetEnvelope[index - lag];

      if (current >= threshold || previous >= threshold) {
        score += current * previous;
        comparisons += 1;
      }
    }

    score /= Math.max(1, comparisons);

    if (score > bestScore) {
      bestScore = score;
      bestBpm = bpm;
    }
  }

  return bestBpm;
}

function findBeatOffset(onsetEnvelope, frameDuration, bpm) {
  const beatMs = 60000 / bpm;
  const beatFrames = Math.max(1, Math.round(beatMs / 1000 / frameDuration));

  let bestOffsetFrame = 0;
  let bestScore = -Infinity;

  for (let offset = 0; offset < beatFrames; offset += 1) {
    let score = 0;

    for (
      let frame = offset;
      frame < onsetEnvelope.length;
      frame += beatFrames
    ) {
      score += onsetEnvelope[frame];
    }

    if (score > bestScore) {
      bestScore = score;
      bestOffsetFrame = offset;
    }
  }

  return bestOffsetFrame * frameDuration * 1000;
}

function getFrameValue(values, timeMs, frameDuration) {
  const index = clamp(
    Math.round(timeMs / 1000 / frameDuration),
    0,
    values.length - 1
  );

  return values[index] || 0;
}

function localAverage(values, centerIndex, radius) {
  let sum = 0;
  let count = 0;

  for (
    let index = Math.max(0, centerIndex - radius);
    index <= Math.min(values.length - 1, centerIndex + radius);
    index += 1
  ) {
    sum += values[index];
    count += 1;
  }

  return sum / Math.max(1, count);
}

function detectSongStart(energy, frameDuration) {
  const floor = percentile(energy, 0.25);
  const active = percentile(energy, 0.62);
  const threshold = floor + (active - floor) * 0.42;
  const sustainedFrames = Math.max(4, Math.round(0.22 / frameDuration));

  for (let index = 0; index < energy.length - sustainedFrames; index += 1) {
    let activeCount = 0;

    for (let probe = 0; probe < sustainedFrames; probe += 1) {
      if (energy[index + probe] >= threshold) {
        activeCount += 1;
      }
    }

    if (activeCount >= sustainedFrames * 0.72) {
      return index * frameDuration * 1000;
    }
  }

  return 1000;
}

function chooseLane(previousLane, previousPreviousLane, random) {
  const options = [0, 1, 2, 3].filter((lane) => {
    if (lane === previousLane) return false;

    if (
      previousPreviousLane !== null &&
      previousLane !== null &&
      lane === previousPreviousLane &&
      Math.abs(previousLane - lane) === 1
    ) {
      return random() > 0.42;
    }

    return true;
  });

  if (!options.length) return Math.floor(random() * 4);

  const weighted = options.map((lane) => {
    let weight = 1;

    if (previousLane !== null) {
      const distance = Math.abs(lane - previousLane);
      if (distance === 1) weight += 1.25;
      if (distance === 2) weight += 0.55;
      if (distance === 3) weight += 0.15;
    }

    return { lane, weight };
  });

  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let target = random() * total;

  for (const item of weighted) {
    target -= item.weight;
    if (target <= 0) return item.lane;
  }

  return weighted[weighted.length - 1].lane;
}

function chooseChordLane(primaryLane, previousLane, random) {
  const candidates = [0, 1, 2, 3].filter(
    (lane) =>
      lane !== primaryLane &&
      lane !== previousLane &&
      Math.abs(lane - primaryLane) >= 1
  );

  if (!candidates.length) {
    return (primaryLane + 2) % 4;
  }

  return candidates[Math.floor(random() * candidates.length)];
}

function capDensity(notes, maxNotesPerSecond) {
  const accepted = [];
  const windowMs = 1000;

  for (const note of notes) {
    const recentCount = accepted.reduce((count, acceptedNote) => {
      return acceptedNote.time > note.time - windowMs ? count + 1 : count;
    }, 0);

    if (recentCount < maxNotesPerSecond) {
      accepted.push(note);
    }
  }

  return accepted;
}

function createFallbackChart(song, difficulty, bpm) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const random = createSeededRandom(`${song.id}:${difficulty}:fallback`);
  const beatMs = 60000 / bpm;
  const stepMs = beatMs / config.subdivision;
  const durationMs = Number(song.duration || 120) * 1000;
  const notes = [];

  let previousLane = null;
  let previousPreviousLane = null;
  let noteNumber = 0;

  for (let time = 2800; time < durationMs - 1000; time += stepMs) {
    if (difficulty === "EASY" && noteNumber % 2 === 1) {
      noteNumber += 1;
      continue;
    }

    const lane = chooseLane(
      previousLane,
      previousPreviousLane,
      random
    );

    notes.push({
      id: `${song.id}-${difficulty}-fallback-${noteNumber}-${lane}`,
      lane,
      time: Math.round(time),
    });

    previousPreviousLane = previousLane;
    previousLane = lane;
    noteNumber += 1;
  }

  return notes;
}

function buildChartFromAnalysis({
  song,
  difficulty,
  analysis,
  onsetEnvelope,
  bpm,
  beatOffsetMs,
  durationMs,
}) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const random = createSeededRandom(
    `${song.id || song.audio}:${difficulty}:${GENERATOR_VERSION}`
  );

  const beatMs = 60000 / bpm;
  const stepMs = beatMs / config.subdivision;
  const detectedStartMs = detectSongStart(
    analysis.energy,
    analysis.frameDuration
  );

  const metadataOffset = Number(song.audioOffset || 0);
  const patternOffset = Number(song.patternOffset || 0);
  const startPaddingMs = difficulty === "EXPERT" ? 900 : 1200;

  let gridStartMs =
    beatOffsetMs + metadataOffset + patternOffset;

  while (gridStartMs < detectedStartMs + startPaddingMs) {
    gridStartMs += beatMs;
  }

  const energyFloor = percentile(analysis.energy, 0.2);
  const energyStrong = percentile(analysis.energy, 0.82);
  const onsetMedian = percentile(onsetEnvelope, 0.5);

  const candidates = [];

  for (
    let timeMs = gridStartMs;
    timeMs < durationMs - 850;
    timeMs += stepMs
  ) {
    const frameIndex = clamp(
      Math.round(timeMs / 1000 / analysis.frameDuration),
      0,
      onsetEnvelope.length - 1
    );

    const onset = onsetEnvelope[frameIndex];
    const nearbyOnset = localAverage(onsetEnvelope, frameIndex, 2);
    const energy = analysis.energy[frameIndex] || 0;
    const low = analysis.lowEnergy[frameIndex] || 0;

    const normalizedEnergy = clamp(
      (energy - energyFloor) /
        Math.max(0.00001, energyStrong - energyFloor),
      0,
      1.5
    );

    const normalizedOnset =
      onset / Math.max(0.00001, onsetMedian);

    const musicalStrength =
      normalizedOnset * 0.58 +
      normalizedEnergy * 0.27 +
      low / Math.max(0.00001, energyStrong) * 0.15;

    const beatPosition =
      Math.round((timeMs - gridStartMs) / stepMs) %
      config.subdivision;

    const isMainBeat = beatPosition === 0;

    let requiredStrength = config.onsetThreshold;

    if (isMainBeat) requiredStrength -= 0.18;
    if (normalizedEnergy < config.quietThreshold) {
      requiredStrength += 0.55;
    }

    const shouldPlace =
      musicalStrength >= requiredStrength ||
      (isMainBeat &&
        normalizedEnergy > 0.42 &&
        nearbyOnset > onsetMedian * 0.72);

    if (!shouldPlace) continue;

    candidates.push({
      time: Math.round(timeMs),
      strength: musicalStrength,
      energy: normalizedEnergy,
      isMainBeat,
    });
  }

  candidates.sort((a, b) => a.time - b.time);

  const notes = [];
  let previousTime = -Infinity;
  let previousLane = null;
  let previousPreviousLane = null;
  let noteNumber = 0;

  for (const candidate of candidates) {
    if (candidate.time - previousTime < config.minGapMs) {
      continue;
    }

    const lane = chooseLane(
      previousLane,
      previousPreviousLane,
      random
    );

    notes.push({
      id: `${song.id || "song"}-${difficulty}-${noteNumber}-${lane}`,
      lane,
      time: candidate.time,
    });

    const chordProbability =
      config.chordChance *
      clamp((candidate.strength - 1) * 0.7 + candidate.energy, 0, 1.5);

    if (
      difficulty !== "EASY" &&
      candidate.isMainBeat &&
      candidate.energy > 0.72 &&
      random() < chordProbability
    ) {
      const chordLane = chooseChordLane(lane, previousLane, random);

      notes.push({
        id: `${song.id || "song"}-${difficulty}-${noteNumber}-${chordLane}-chord`,
        lane: chordLane,
        time: candidate.time,
      });
    }

    previousPreviousLane = previousLane;
    previousLane = lane;
    previousTime = candidate.time;
    noteNumber += 1;
  }

  return capDensity(notes, config.maxNotesPerSecond);
}

export async function generateBeatmap(song, difficulty = "NORMAL") {
  if (!song?.audio) {
    throw new Error("The selected song is missing an audio path.");
  }

  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const cacheKey = getCacheKey(song, normalizedDifficulty);

  if (MEMORY_CACHE.has(cacheKey)) {
    return MEMORY_CACHE.get(cacheKey);
  }

  const stored = getStoredChart(cacheKey);

  if (stored) {
    MEMORY_CACHE.set(cacheKey, stored);
    return stored;
  }

  if (IN_FLIGHT.has(cacheKey)) {
    return IN_FLIGHT.get(cacheKey);
  }

  const generationPromise = (async () => {
    try {
      const audioBuffer = await decodeAudio(song.audio);
      const samples = mixToMono(audioBuffer);
      const analysis = analyzeFrames(samples, audioBuffer.sampleRate);
      const onsetEnvelope = buildOnsetEnvelope(analysis);
      const bpm = estimateBpm(
        onsetEnvelope,
        analysis.frameDuration,
        song.bpm
      );
      const beatOffsetMs = findBeatOffset(
        onsetEnvelope,
        analysis.frameDuration,
        bpm
      );

      const durationMs = Math.round(audioBuffer.duration * 1000);

      let notes = buildChartFromAnalysis({
        song,
        difficulty: normalizedDifficulty,
        analysis,
        onsetEnvelope,
        bpm,
        beatOffsetMs,
        durationMs,
      });

      if (notes.length < Math.max(24, audioBuffer.duration * 0.18)) {
        notes = createFallbackChart(
          {
            ...song,
            duration: audioBuffer.duration,
          },
          normalizedDifficulty,
          bpm
        );
      }

      const result = {
        version: GENERATOR_VERSION,
        bpm,
        beatOffsetMs,
        duration: audioBuffer.duration,
        notes,
      };

      MEMORY_CACHE.set(cacheKey, result);
      storeChart(cacheKey, result);

      return result;
    } catch (error) {
      console.warn("Automatic beatmap analysis failed.", error);

      const bpm =
        Number(song.bpm) >= 55 && Number(song.bpm) <= 220
          ? Number(song.bpm)
          : 120;

      const result = {
        version: GENERATOR_VERSION,
        bpm,
        beatOffsetMs: 0,
        duration: Number(song.duration || 120),
        notes: createFallbackChart(
          song,
          normalizedDifficulty,
          bpm
        ),
      };

      MEMORY_CACHE.set(cacheKey, result);
      return result;
    } finally {
      IN_FLIGHT.delete(cacheKey);
    }
  })();

  IN_FLIGHT.set(cacheKey, generationPromise);
  return generationPromise;
}

export function prewarmBeatmap(song, difficulty = "NORMAL") {
  return generateBeatmap(song, difficulty).catch((error) => {
    console.warn("Beatmap prewarm failed.", error);
    return null;
  });
}

export function clearBeatmapCache(song) {
  MEMORY_CACHE.clear();
  IN_FLIGHT.clear();

  if (!song || typeof window === "undefined") return;

  try {
    const prefix = `mba:${GENERATOR_VERSION}:${song.id || song.audio}:`;

    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith(prefix)) {
        window.localStorage.removeItem(key);
      }
    });
  } catch {
    // Ignore unavailable localStorage.
  }
}