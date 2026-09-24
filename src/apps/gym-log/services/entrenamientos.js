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

const workoutsRef = collection(db, 'gym_log_workouts')

function currentUid() {
  const uid = useAuthStore().user?.uid
  if (!uid) throw new Error('No hay sesión activa')
  return uid
}

// Se ordena en cliente para no requerir un índice compuesto de Firestore.
export async function getWorkouts() {
  const uid = currentUid()
  const snapshot = await getDocs(query(workoutsRef, where('ownerId', '==', uid)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.date.localeCompare(a.date))
}

export async function getWorkout(workoutId) {
  const snapshot = await getDoc(doc(db, 'gym_log_workouts', workoutId))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function logWorkout({ date, routineId = null, routineName = '', exercises, notes = '' }) {
  const uid = currentUid()
  const docRef = doc(workoutsRef)
  await setDoc(docRef, {
    ownerId: uid,
    date,
    routineId,
    routineName,
    exercises,
    notes,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateWorkout(workoutId, { date, exercises, notes, routineId, routineName }) {
  await updateDoc(doc(db, 'gym_log_workouts', workoutId), { date, exercises, notes, routineId, routineName })
}

export async function deleteWorkout(workoutId) {
  await deleteDoc(doc(db, 'gym_log_workouts', workoutId))
}
