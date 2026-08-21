import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from 'react';

import {
  doc,
  getDoc
} from 'firebase/firestore';

import {
  useFirebase
} from '../firebase';

const InstitutionContext =
  createContext(null);

export function InstitutionProvider({
  children
}) {
  const {
    db,
    appId
  } = useFirebase();

  const [
    institution,
    setInstitution
  ] = useState(null);

  const [
    loadingInstitution,
    setLoadingInstitution
  ] = useState(true);

  const [
    institutionError,
    setInstitutionError
  ] = useState(null);

  useEffect(() => {
    if (!db || !appId) {
      setLoadingInstitution(false);
      return;
    }

    let cancelled = false;

    async function loadInstitution() {
      try {
        setLoadingInstitution(true);
        setInstitutionError(null);

        const institutionRef = doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'config',
          'institution'
        );

        const snapshot =
          await getDoc(institutionRef);

        if (cancelled) return;

        if (!snapshot.exists()) {
          setInstitution(null);
          return;
        }

        setInstitution({
          id: snapshot.id,
          ...snapshot.data()
        });

      } catch (error) {
        console.error(
          'No se pudo cargar la identidad institucional:',
          error
        );

        if (!cancelled) {
          setInstitutionError(error);
          setInstitution(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingInstitution(false);
        }
      }
    }

    loadInstitution();

    return () => {
      cancelled = true;
    };
  }, [db, appId]);

  return (
    <InstitutionContext.Provider
      value={{
        institution,
        loadingInstitution,
        institutionError
      }}
    >
      {children}
    </InstitutionContext.Provider>
  );
}

export function useInstitution() {
  const context =
    useContext(InstitutionContext);

  if (!context) {
    throw new Error(
      'useInstitution debe utilizarse dentro de InstitutionProvider.'
    );
  }

  return context;
}
