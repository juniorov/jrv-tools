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

const routinesRef = collection(db, 'gym_log_routines')

function currentUid() {
  const uid = useAuthStore().user?.uid
  if (!uid) throw new Error('No hay sesión activa')
  return uid
}

// Se ordena en cliente para no requerir un índice compuesto de Firestore.
export async function getRoutines() {
  const uid = currentUid()
  const snapshot = await getDocs(query(routinesRef, where('ownerId', '==', uid)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getRoutine(routineId) {
  const snapshot = await getDoc(doc(db, 'gym_log_routines', routineId))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function createRoutine({ name, description = '', exercises, category }) {
  const uid = currentUid()
  const docRef = doc(routinesRef)
  await setDoc(docRef, {
    ownerId: uid,
    name,
    description,
    exercises,
    category: category || 'Otro',
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

/** Importa varias rutinas ya normalizadas (ver utils/routineImport.js) de una sola vez. */
export async function importRoutines(routines) {
  const ids = []
  for (const routine of routines) {
    ids.push(await createRoutine(routine))
  }
  return ids
}

export async function updateRoutine(routineId, { name, description, exercises, category }) {
  await updateDoc(doc(db, 'gym_log_routines', routineId), { name, description, exercises, category: category || 'Otro' })
}

export async function deleteRoutine(routineId) {
  await deleteDoc(doc(db, 'gym_log_routines', routineId))
}
