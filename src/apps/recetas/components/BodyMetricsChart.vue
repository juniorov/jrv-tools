<script setup>
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js'
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { metricSeries } from '../utils/bodyMetrics'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend)

const props = defineProps({
  entries: { type: Array, required: true },
  metric: { type: String, default: 'weightKg' },
  label: { type: String, default: 'Peso (kg)' },
})

const dateFormatter = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short' })

const series = computed(() => metricSeries(props.entries, props.metric))

const chartData = computed(() => ({
  labels: series.value.map((s) => dateFormatter.format(new Date(`${s.date}T00:00:00`))),
  datasets: [
    {
      label: props.label,
      data: series.value.map((s) => s.value),
      borderColor: '#f59e0b',
      backgroundColor: '#f59e0b',
      tension: 0.3,
      pointRadius: 3,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
}
</script>

<template>
  <div class="progress-chart">
    <Line v-if="series.length" :data="chartData" :options="chartOptions" />
    <p v-else class="text-muted mb-0">Registra una medición para ver tu progreso aquí.</p>
  </div>
</template>

<style scoped>
.progress-chart {
  position: relative;
  height: 260px;
}
</style>
