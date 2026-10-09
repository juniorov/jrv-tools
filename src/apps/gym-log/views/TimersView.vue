<script setup>
import { computed, onUnmounted, ref } from 'vue'

const MODES = [
  {
    id: 'amrap',
    label: 'AMRAP',
    description: 'Tantas rondas o repeticiones como puedas en un tiempo fijo. El cronómetro corre una sola vez, de principio a fin.',
  },
  {
    id: 'emom',
    label: 'EMOM',
    description: 'Cada intervalo (normalmente 1 min) empieza una ronda nueva. Terminá el trabajo antes de que suene y descansá lo que quede.',
  },
  {
    id: 'forTime',
    label: 'For Time',
    description: 'Completá el trabajo prescrito lo más rápido posible. Cuenta hacia arriba; detenelo cuando termines. El "cap" es un tope opcional que avisa si se te acaba el tiempo.',
  },
  {
    id: 'clock',
    label: 'Clock',
    description: 'Cronómetro simple, sin rondas: elegí si cuenta hacia arriba o hacia abajo. Útil para planchas, estiramientos o cualquier ejercicio a tiempo libre.',
  },
  {
    id: 'tabata',
    label: 'Tabata',
    description: 'Alterna series cortas de trabajo y descanso durante varias rondas (clásico: 20s trabajo / 10s descanso x8).',
  },
]

const mode = ref('tabata')
const currentModeInfo = computed(() => MODES.find((m) => m.id === mode.value))

// Config por modo
const tabataWork = ref(20)
const tabataRest = ref(10)
const tabataRounds = ref(8)

const amrapMinutes = ref(20)

const emomInterval = ref(60)
const emomRounds = ref(10)

const forTimeCapMinutes = ref(0) // 0 = sin tope

const clockDirection = ref('down') // 'down' | 'up'
const clockMinutes = ref(5)

const prepareSeconds = ref(10)

// Estado del cronómetro
const phase = ref('idle') // idle | prepare | work | rest | done
const currentRound = ref(0)
const remaining = ref(0)
const elapsed = ref(0)
const paused = ref(false)
const capReached = ref(false)

let timer = null
let lastTickAt = null

const isCountingUp = computed(
  () => phase.value === 'work' && (mode.value === 'forTime' || (mode.value === 'clock' && clockDirection.value === 'up')),
)

const showsElapsed = computed(
  () =>
    (phase.value === 'work' || phase.value === 'done') &&
    (mode.value === 'forTime' || (mode.value === 'clock' && clockDirection.value === 'up')),
)

const showRounds = computed(() => mode.value === 'tabata' || mode.value === 'emom')
const totalRounds = computed(() => (mode.value === 'tabata' ? tabataRounds.value : emomRounds.value))

const workLabel = computed(
  () => ({ tabata: 'Trabajo', amrap: 'Trabajo', emom: 'Ronda', forTime: 'En marcha', clock: 'Cronómetro' })[mode.value],
)

const phaseLabel = computed(() => {
  if (phase.value === 'idle') return 'Listo para empezar'
  if (phase.value === 'prepare') return 'Prepárate'
  if (phase.value === 'rest') return 'Descanso'
  if (phase.value === 'done') return '¡Completado!'
  return workLabel.value
})

const displaySeconds = computed(() => (showsElapsed.value ? elapsed.value : remaining.value))

const phaseTotal = computed(() => {
  if (phase.value === 'prepare') return prepareSeconds.value
  if (phase.value === 'rest') return tabataRest.value
  if (phase.value === 'work') {
    if (mode.value === 'tabata') return tabataWork.value
    if (mode.value === 'emom') return emomInterval.value
    if (mode.value === 'amrap') return amrapMinutes.value * 60
    if (mode.value === 'clock' && clockDirection.value === 'down') return clockMinutes.value * 60
  }
  return 0
})

const progressPct = computed(() => (phaseTotal.value ? (remaining.value / phaseTotal.value) * 100 : 0))

function formatClock(totalSeconds) {
  const s = Math.max(0, totalSeconds)
  const minutes = Math.floor(s / 60)
  const seconds = s % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function adjust(target, delta, min = 0) {
  target.value = Math.max(min, target.value + delta)
}

function beep(freq, duration = 150) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration / 1000)
    osc.start()
    osc.stop(ctx.currentTime + duration / 1000)
  } catch {
    // Web Audio no disponible; el temporizador sigue funcionando en silencio.
  }
  if (navigator.vibrate) navigator.vibrate(120)
}

function checkForTimeCap() {
  if (mode.value !== 'forTime') return
  const cap = forTimeCapMinutes.value * 60
  if (cap > 0 && !capReached.value && elapsed.value >= cap) {
    capReached.value = true
    beep(220, 400)
  }
}

function beginWorkPhase() {
  phase.value = 'work'
  if (mode.value === 'amrap') remaining.value = amrapMinutes.value * 60
  else if (mode.value === 'emom') {
    remaining.value = emomInterval.value
    currentRound.value = 1
  } else if (mode.value === 'tabata') {
    remaining.value = tabataWork.value
    currentRound.value = 1
  } else if (mode.value === 'clock' && clockDirection.value === 'down') remaining.value = clockMinutes.value * 60
  else elapsed.value = 0
}

function advance() {
  if (phase.value === 'prepare') {
    beginWorkPhase()
    beep(880)
    return
  }

  if (phase.value === 'work') {
    if (mode.value === 'tabata') {
      if (currentRound.value >= tabataRounds.value) {
        finish()
        return
      }
      phase.value = 'rest'
      remaining.value = tabataRest.value
      beep(440)
    } else if (mode.value === 'emom') {
      if (currentRound.value >= emomRounds.value) {
        finish()
        return
      }
      currentRound.value += 1
      remaining.value = emomInterval.value
      beep(880)
    } else {
      finish()
    }
    return
  }

  if (phase.value === 'rest') {
    currentRound.value += 1
    phase.value = 'work'
    remaining.value = tabataWork.value
    beep(880)
  }
}

function tick() {
  clearInterval(timer)
  lastTickAt = Date.now()
  timer = setInterval(() => {
    if (paused.value) {
      // Do not count the time spent paused when the browser resumes the interval.
      lastTickAt = Date.now()
      return
    }

    const now = Date.now()
    const elapsedSeconds = Math.floor((now - lastTickAt) / 1000)
    if (elapsedSeconds < 1) return
    lastTickAt += elapsedSeconds * 1000

    // Catch up after background-tab throttling without depending on one callback per second.
    for (let second = 0; second < elapsedSeconds && timer; second += 1) {
      if (isCountingUp.value) {
        elapsed.value += 1
        checkForTimeCap()
      } else {
        remaining.value -= 1
        if (remaining.value <= 0) advance()
      }
    }
  }, 250)
}

function finish() {
  clearInterval(timer)
  timer = null
  lastTickAt = null
  phase.value = 'done'
  paused.value = false
  beep(660)
  setTimeout(() => beep(660), 200)
  setTimeout(() => beep(660), 400)
}

function start() {
  currentRound.value = 0
  capReached.value = false
  elapsed.value = 0
  if (prepareSeconds.value > 0) {
    phase.value = 'prepare'
    remaining.value = prepareSeconds.value
  } else {
    beginWorkPhase()
    beep(880)
  }
  paused.value = false
  tick()
}

function togglePause() {
  paused.value = !paused.value
}

function reset() {
  clearInterval(timer)
  timer = null
  lastTickAt = null
  phase.value = 'idle'
  currentRound.value = 0
  remaining.value = 0
  elapsed.value = 0
  paused.value = false
  capReached.value = false
}

function selectMode(id) {
  mode.value = id
  reset()
}

onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div class="timers-view">
    <h1 class="h4 mb-3"><i class="bi bi-stopwatch-fill me-2"></i>Cronómetros</h1>

    <div class="mode-tabs mb-2">
      <button
        v-for="m in MODES"
        :key="m.id"
        type="button"
        class="mode-tab"
        :class="{ active: mode === m.id }"
        @click="selectMode(m.id)"
      >
        {{ m.label }}
      </button>
    </div>
    <p class="mode-description mb-3">{{ currentModeInfo.description }}</p>

    <div class="timer-card" :class="`phase-${phase}`">
      <div class="phase-label">{{ phaseLabel }}</div>
      <div class="remaining">{{ formatClock(displaySeconds) }}</div>
      <div class="round-label" v-if="showRounds && phase !== 'idle'">Ronda {{ currentRound }} / {{ totalRounds }}</div>
      <div class="cap-label" v-if="mode === 'forTime' && capReached">¡Se acabó el time cap!</div>
      <div class="progress-track" v-if="!showsElapsed">
        <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
      </div>
    </div>

    <div class="config-card mb-3">
      <template v-if="mode === 'tabata'">
        <div class="config-row">
          <span class="config-label">Trabajo</span>
          <div class="stepper">
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(tabataWork, -5, 5)">−5s</button>
            <span class="step-value">{{ tabataWork }}s</span>
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(tabataWork, 5)">+5s</button>
          </div>
        </div>
        <div class="config-row">
          <span class="config-label">Descanso</span>
          <div class="stepper">
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(tabataRest, -5, 0)">−5s</button>
            <span class="step-value">{{ tabataRest }}s</span>
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(tabataRest, 5)">+5s</button>
          </div>
        </div>
        <div class="config-row">
          <span class="config-label">Rondas</span>
          <div class="stepper">
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(tabataRounds, -1, 1)">−1</button>
            <span class="step-value">{{ tabataRounds }}</span>
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(tabataRounds, 1)">+1</button>
          </div>
        </div>
      </template>

      <template v-else-if="mode === 'amrap'">
        <div class="config-row">
          <span class="config-label">Duración</span>
          <div class="stepper">
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(amrapMinutes, -1, 1)">−1min</button>
            <span class="step-value">{{ amrapMinutes }}min</span>
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(amrapMinutes, 1)">+1min</button>
          </div>
        </div>
      </template>

      <template v-else-if="mode === 'emom'">
        <div class="config-row">
          <span class="config-label">Intervalo</span>
          <div class="stepper">
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(emomInterval, -15, 15)">−15s</button>
            <span class="step-value">{{ emomInterval }}s</span>
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(emomInterval, 15)">+15s</button>
          </div>
        </div>
        <div class="config-row">
          <span class="config-label">Rondas</span>
          <div class="stepper">
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(emomRounds, -1, 1)">−1</button>
            <span class="step-value">{{ emomRounds }}</span>
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(emomRounds, 1)">+1</button>
          </div>
        </div>
      </template>

      <template v-else-if="mode === 'forTime'">
        <div class="config-row">
          <span class="config-label">Time cap</span>
          <div class="stepper">
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(forTimeCapMinutes, -1, 0)">−1min</button>
            <span class="step-value">{{ forTimeCapMinutes === 0 ? 'Sin tope' : `${forTimeCapMinutes}min` }}</span>
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(forTimeCapMinutes, 1)">+1min</button>
          </div>
        </div>
      </template>

      <template v-else-if="mode === 'clock'">
        <div class="config-row">
          <span class="config-label">Dirección</span>
          <div class="unit-toggle">
            <button
              type="button"
              class="unit-btn"
              :class="{ active: clockDirection === 'down' }"
              :disabled="phase !== 'idle'"
              @click="clockDirection = 'down'"
            >
              Cuenta atrás
            </button>
            <button
              type="button"
              class="unit-btn"
              :class="{ active: clockDirection === 'up' }"
              :disabled="phase !== 'idle'"
              @click="clockDirection = 'up'"
            >
              Cuenta arriba
            </button>
          </div>
        </div>
        <div class="config-row" v-if="clockDirection === 'down'">
          <span class="config-label">Duración</span>
          <div class="stepper">
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(clockMinutes, -1, 1)">−1min</button>
            <span class="step-value">{{ clockMinutes }}min</span>
            <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(clockMinutes, 1)">+1min</button>
          </div>
        </div>
      </template>

      <div class="config-row">
        <span class="config-label">Preparación</span>
        <div class="stepper">
          <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(prepareSeconds, -5, 0)">−5s</button>
          <span class="step-value">{{ prepareSeconds }}s</span>
          <button type="button" class="step-btn" :disabled="phase !== 'idle'" @click="adjust(prepareSeconds, 5)">+5s</button>
        </div>
      </div>
    </div>

    <div class="d-flex gap-2">
      <button v-if="phase === 'idle' || phase === 'done'" type="button" class="btn btn-primary flex-grow-1" @click="start">
        <i class="bi bi-play-fill me-1"></i>Iniciar
      </button>
      <template v-else>
        <button type="button" class="btn btn-outline-secondary flex-grow-1" @click="togglePause">
          <i :class="['bi', paused ? 'bi-play-fill' : 'bi-pause-fill', 'me-1']"></i>{{ paused ? 'Reanudar' : 'Pausar' }}
        </button>
        <button
          v-if="mode === 'forTime' || (mode === 'clock' && clockDirection === 'up')"
          type="button"
          class="btn btn-success"
          @click="finish"
        >
          <i class="bi bi-flag-fill me-1"></i>Terminé
        </button>
        <button type="button" class="btn btn-outline-danger" @click="reset">
          <i class="bi bi-stop-fill"></i>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.mode-tabs {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.mode-tab {
  flex: 0 0 auto;
  border: 1px solid var(--color-border-strong);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: 600;
  padding: 0.35rem 0.9rem;
  cursor: pointer;
  white-space: nowrap;
}

.mode-tab.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-on-primary);
}

.mode-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.timer-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 2rem 1rem;
  text-align: center;
  margin-bottom: 1.25rem;
  transition: background-color var(--transition-base);
}

.phase-work {
  background-color: var(--color-primary-bg);
  border-color: var(--color-primary);
}

.phase-rest {
  background-color: var(--color-secondary-bg);
  border-color: var(--color-secondary);
}

.phase-prepare {
  background-color: var(--color-warning-bg);
  border-color: var(--color-warning);
}

.phase-done {
  background-color: var(--color-success-bg);
  border-color: var(--color-success);
}

.phase-label {
  font-size: var(--font-size-lg);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.phase-work .phase-label {
  color: var(--color-primary);
}

.phase-rest .phase-label {
  color: var(--color-secondary);
}

.phase-prepare .phase-label {
  color: var(--color-warning);
}

.phase-done .phase-label {
  color: var(--color-success);
}

.remaining {
  font-size: 4rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.round-label {
  margin-top: 0.5rem;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-weight: 600;
}

.cap-label {
  margin-top: 0.5rem;
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  font-weight: 700;
}

.progress-track {
  margin-top: 1rem;
  height: 0.5rem;
  border-radius: var(--radius-full);
  background-color: var(--color-border);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: currentColor;
  color: var(--color-primary);
  transition: width 1s linear;
}

.phase-rest .progress-fill {
  color: var(--color-secondary);
}

.phase-prepare .progress-fill {
  color: var(--color-warning);
}

.config-card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.config-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.config-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  font-weight: 600;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.step-btn {
  border: 1px solid var(--color-border-strong);
  background-color: var(--color-background);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
}

.step-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.step-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  min-width: 4rem;
  text-align: center;
}

.unit-toggle {
  display: inline-flex;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.unit-btn {
  border: none;
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
}

.unit-btn.active {
  background-color: var(--color-primary);
  color: var(--color-on-primary);
}

.unit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
