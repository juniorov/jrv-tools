import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'

const metricsRef = collection(db, 'recetas_body_metrics')

function currentUid() {
  const uid = useAuthStore().user?.uid
  if (!uid) throw new Error('No hay sesión activa')
  return uid
}

// Se ordena en cliente para no requerir un índice compuesto de Firestore.
export async function getBodyMetrics() {
  const uid = currentUid()
  const snapshot = await getDocs(query(metricsRef, where('ownerId', '==', uid)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.date.localeCompare(b.date))
}

export async function getBodyMetric(metricId) {
  const snapshot = await getDoc(doc(db, 'recetas_body_metrics', metricId))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function createBodyMetric({
  date,
  weightKg,
  bodyFatPercent = null,
  bodyFatKg = null,
  visceralFat = null,
  muscleMassKg = null,
  waistCm = null,
  bmi = null,
}) {
  const uid = currentUid()
  const docRef = doc(metricsRef)
  await setDoc(docRef, {
    ownerId: uid,
    date,
    weightKg,
    bodyFatPercent,
    bodyFatKg,
    visceralFat,
    muscleMassKg,
    waistCm,
    bmi,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateBodyMetric(
  metricId,
  { date, weightKg, bodyFatPercent = null, bodyFatKg = null, visceralFat = null, muscleMassKg = null, waistCm = null, bmi = null },
) {
  await updateDoc(doc(db, 'recetas_body_metrics', metricId), {
    date,
    weightKg,
    bodyFatPercent,
    bodyFatKg,
    visceralFat,
    muscleMassKg,
    waistCm,
    bmi,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteBodyMetric(metricId) {
  await deleteDoc(doc(db, 'recetas_body_metrics', metricId))
}
