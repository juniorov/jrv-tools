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

const recipesRef = collection(db, 'recetas_recipes')

function currentUid() {
  const uid = useAuthStore().user?.uid
  if (!uid) throw new Error('No hay sesión activa')
  return uid
}

// Se ordena en cliente para no requerir un índice compuesto de Firestore.
export async function getRecipes() {
  const uid = currentUid()
  const snapshot = await getDocs(query(recipesRef, where('ownerId', '==', uid)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getRecipe(recipeId) {
  const snapshot = await getDoc(doc(db, 'recetas_recipes', recipeId))
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export async function createRecipe({
  name,
  description = '',
  steps = [],
  tags = [],
  yieldType,
  yieldValue,
  yieldUnit,
  ingredients,
}) {
  const uid = currentUid()
  const docRef = doc(recipesRef)
  await setDoc(docRef, {
    ownerId: uid,
    name,
    description,
    steps,
    tags,
    yieldType,
    yieldValue,
    yieldUnit: yieldType === 'servings' ? 'porciones' : yieldUnit,
    ingredients,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateRecipe(recipeId, { name, description, steps, tags, yieldType, yieldValue, yieldUnit, ingredients }) {
  await updateDoc(doc(db, 'recetas_recipes', recipeId), {
    name,
    description,
    steps,
    tags,
    yieldType,
    yieldValue,
    yieldUnit: yieldType === 'servings' ? 'porciones' : yieldUnit,
    ingredients,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteRecipe(recipeId) {
  await deleteDoc(doc(db, 'recetas_recipes', recipeId))
}
