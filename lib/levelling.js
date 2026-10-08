const DEFAULT_MULTIPLIER = 1
const MAX_SAFE_XP = Number.MAX_SAFE_INTEGER

export const growth =
  Math.pow(Math.PI / Math.E, 1.618) *
  Math.E *
  0.75

const normalizeMultiplier = multiplier => {
  const value = Number(multiplier)

  return Number.isFinite(value) && value > 0
    ? value
    : DEFAULT_MULTIPLIER
}

const normalizeLevel = level => {
  const value = Number(level)

  if (!Number.isFinite(value)) {
    if (value === Infinity) return Infinity
    return 0
  }

  return Math.max(0, Math.floor(value))
}

const normalizeXp = xp => {
  const value = Number(xp)

  if (value === Infinity) {
    return Infinity
  }

  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, value)
}

export function xpRange(
  level,
  multiplier = global.multiplier || DEFAULT_MULTIPLIER
) {
  if (Number(level) < 0) {
    throw new TypeError('level cannot be negative')
  }

  const mult = normalizeMultiplier(multiplier)
  const currentLevel = normalizeLevel(level)
  const nextLevel = currentLevel + 1

  if (currentLevel === 0) {
    const max = Math.floor(mult)

    return {
      min: 0,
      max,
      xp: Math.max(0, max + 1)
    }
  }

  const min = Math.floor(
    Math.pow(currentLevel, growth) * mult
  ) + 1

  const max = Math.floor(
    Math.pow(nextLevel, growth) * mult
  )

  return {
    min,
    max,
    xp: Math.max(0, max - min + 1)
  }
}

export function findLevel(
  xp,
  multiplier = global.multiplier || DEFAULT_MULTIPLIER
) {
  const value = Number(xp)

  if (value === Infinity) {
    return Infinity
  }

  if (Number.isNaN(value)) {
    return NaN
  }

  if (value <= 0) {
    return -1
  }

  const mult = normalizeMultiplier(multiplier)

  let level = Math.floor(
    Math.pow(value / mult, 1 / growth)
  )

  if (!Number.isFinite(level)) {
    return Number.MAX_SAFE_INTEGER
  }

  level = Math.max(0, level)

  const range = xpRange(level, mult)

  if (value < range.min) {
    level--

    if (level < 0) {
      return 0
    }
  }

  while (value > xpRange(level, mult).max) {
    level++

    if (level >= Number.MAX_SAFE_INTEGER) {
      return Number.MAX_SAFE_INTEGER
    }
  }

  while (
    level > 0 &&
    value < xpRange(level, mult).min
  ) {
    level--
  }

  return level
}

export function canLevelUp(
  level,
  xp,
  multiplier = global.multiplier || DEFAULT_MULTIPLIER
) {
  const currentLevel = Number(level)
  const currentXp = Number(xp)

  if (
    !Number.isFinite(currentLevel) &&
    currentLevel !== Infinity
  ) {
    return false
  }

  if (currentLevel < 0) {
    return false
  }

  if (currentXp === Infinity) {
    return true
  }

  if (
    !Number.isFinite(currentXp) ||
    currentXp <= 0
  ) {
    return false
  }

  const mult = normalizeMultiplier(multiplier)

  const nextRange = xpRange(
    currentLevel + 1,
    mult
  )

  return currentXp >= nextRange.min
}

export function xpToNextLevel(
  level,
  xp,
  multiplier = global.multiplier || DEFAULT_MULTIPLIER
) {
  const currentXp = normalizeXp(xp)

  if (currentXp === Infinity) {
    return 0
  }

  const range = xpRange(
    normalizeLevel(level) + 1,
    multiplier
  )

  return Math.max(
    0,
    range.min - currentXp
  )
}

export function progressToNextLevel(
  level,
  xp,
  multiplier = global.multiplier || DEFAULT_MULTIPLIER
) {
  const currentLevel = normalizeLevel(level)
  const currentXp = normalizeXp(xp)
  const range = xpRange(
    currentLevel,
    multiplier
  )

  if (currentXp === Infinity) {
    return 100
  }

  if (currentLevel === 0) {
    return Math.min(
      100,
      Math.floor(
        (currentXp /
          Math.max(1, range.max)) *
          100
      )
    )
  }

  const total =
    range.max - range.min + 1

  const progress =
    currentXp - range.min + 1

  return Math.max(
    0,
    Math.min(
      100,
      Math.floor(
        (progress / total) * 100
      )
    )
  )
}

export function levelInfo(
  level,
  xp,
  multiplier = global.multiplier || DEFAULT_MULTIPLIER
) {
  const currentLevel = normalizeLevel(level)
  const currentXp = normalizeXp(xp)
  const range = xpRange(
    currentLevel,
    multiplier
  )

  return {
    level: currentLevel,
    xp: currentXp,
    min: range.min,
    max: range.max,
    required: range.xp,
    remaining: xpToNextLevel(
      currentLevel,
      currentXp,
      multiplier
    ),
    progress: progressToNextLevel(
      currentLevel,
      currentXp,
      multiplier
    ),
    canLevelUp: canLevelUp(
      currentLevel,
      currentXp,
      multiplier
    )
  }
}

export function isMaxXp(xp) {
  return (
    xp === Infinity ||
    Number(xp) >= MAX_SAFE_XP
  )
}