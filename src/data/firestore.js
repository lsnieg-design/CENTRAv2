import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

/**
 * Referencia a una colección pública de CENTRA.
 *
 * Todas las entidades nuevas deberían utilizar estas funciones
 * para acceder a Firestore.
 */
export const publicCollectionRef = (
  db,
  appId,
  collectionName
) => {
  return collection(
    db,
    'artifacts',
    appId,
    'public',
    'data',
    collectionName
  );
};

/**
 * Referencia a un documento público de CENTRA.
 */
export const publicDocRef = (
  db,
  appId,
  collectionName,
  id
) => {
  return doc(
    db,
    'artifacts',
    appId,
    'public',
    'data',
    collectionName,
    id
  );
};

/**
 * Obtener todos los documentos de una colección.
 */
export async function getPublicCollection(
  db,
  appId,
  collectionName
) {
  const snapshot =
    await getDocs(
      publicCollectionRef(
        db,
        appId,
        collectionName
      )
    );

  return snapshot.docs.map(
    item => ({
      id: item.id,
      ...item.data()
    })
  );
}

/**
 * Obtener un documento concreto.
 */
export async function getPublicDocument(
  db,
  appId,
  collectionName,
  id
) {
  const snapshot =
    await getDoc(
      publicDocRef(
        db,
        appId,
        collectionName,
        id
      )
    );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data()
  };
}

/**
 * Crear documento con ID automático.
 */
export async function createPublicDocument(
  db,
  appId,
  collectionName,
  data
) {
  const reference =
    await addDoc(
      publicCollectionRef(
        db,
        appId,
        collectionName
      ),
      data
    );

  return reference.id;
}

/**
 * Crear o reemplazar parcialmente un documento con ID conocido.
 */
export async function setPublicDocument(
  db,
  appId,
  collectionName,
  id,
  data,
  options = {
    merge: true
  }
) {
  await setDoc(
    publicDocRef(
      db,
      appId,
      collectionName,
      id
    ),
    data,
    options
  );

  return id;
}

/**
 * Actualizar campos de un documento existente.
 */
export async function updatePublicDocument(
  db,
  appId,
  collectionName,
  id,
  data
) {
  await updateDoc(
    publicDocRef(
      db,
      appId,
      collectionName,
      id
    ),
    data
  );

  return id;
}

/**
 * Eliminar un documento.
 */
export async function deletePublicDocument(
  db,
  appId,
  collectionName,
  id
) {
  await deleteDoc(
    publicDocRef(
      db,
      appId,
      collectionName,
      id
    )
  );
}
