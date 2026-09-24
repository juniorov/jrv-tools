import { deleteField, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { weekKey } from '../utils/weeklyMenu'

function currentUid() {
  const uid = useAuthStore().user?.uid
  if (!uid) throw new Error('No hay sesión activa')
  return uid
}

// Doc id = uid: una sola plantilla / un solo set de overrides por usuario.
function templateRef() {
  return doc(db, 'recetas_weekly_menu', currentUid())
}

function overridesRef() {
  return doc(db, 'recetas_week_menu_overrides', currentUid())
}

export async function getWeeklyMenu() {
  const snapshot = await getDoc(templateRef())
  return snapshot.exists() ? (snapshot.data().assignments ?? {}) : {}
}

/**
 * Asigna (o quita, con recipeId=null) la receta de un día+comida en la plantilla recurrente.
 * `setDoc` con `merge:true` mergea mapas anidados campo por campo, así que solo toca esta celda
 * sin pisar las demás comidas de ese día.
 */
export async function setTemplateSlot(dayIndex, slotKey, recipeId) {
  await setDoc(templateRef(), { assignments: { [String(dayIndex)]: { [slotKey]: recipeId } } }, { merge: true })
}

/** Overrides vigentes de la semana actual; si el doc quedó de una semana anterior, se ignora. */
export async function getWeekMenuOverrides() {
  const snapshot = await getDoc(overridesRef())
  if (!snapshot.exists()) return {}
  const data = snapshot.data()
  return data.weekStart === weekKey() ? (data.overrides ?? {}) : {}
}

/** Intercambia la receta de un día+comida solo para la semana actual (no toca la plantilla). */
export async function setWeekMenuOverride(dayIndex, slotKey, recipeId) {
  const currentWeek = weekKey()
  const snapshot = await getDoc(overridesRef())
  const isStale = !snapshot.exists() || snapshot.data().weekStart !== currentWeek
  const overrides = isStale ? {} : (snapshot.data().overrides ?? {})
  overrides[String(dayIndex)] = { ...(overrides[String(dayIndex)] || {}), [slotKey]: recipeId }
  await setDoc(overridesRef(), { weekStart: currentWeek, overrides })
}

/** Quita el intercambio de un día+comida (vuelve a la plantilla esa semana). */
export async function clearWeekMenuOverride(dayIndex, slotKey) {
  const snapshot = await getDoc(overridesRef())
  if (!snapshot.exists() || snapshot.data().weekStart !== weekKey()) return
  await updateDoc(overridesRef(), { [`overrides.${dayIndex}.${slotKey}`]: deleteField() })
}
