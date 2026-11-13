import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { COLLECTIONS } from './collections';

const normalizeDni = (value) => String(value ?? '').replace(/\D/g, '');

const getStudentDni = (record = {}) =>
  String(
    record.dni ||
      record.documentNumber ||
      record.identificationNumber ||
      record.numeroDocumento ||
      ''
  ).trim();

/**
 * Hook unificado para leer estudiantes activos/inactivos desde:
 * 1. Modelo nuevo: people (type === 'student') + student_profiles + student_group_assignments
 * 2. Fallback: colección legacy 'students' (si existen registros antiguos sin migrar)
 */
export function useStudents(db, appId, { activeOnly = false } = {}) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db || !appId) {
      setStudents([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    let people = [];
    let profiles = [];
    let assignments = [];
    let legacyStudents = [];

    const base = (name) =>
      collection(db, 'artifacts', appId, 'public', 'data', name);

    const rebuild = () => {
      const peopleById = new Map(people.map((p) => [p.id, p]));
      const profileIds = new Set();

      const fromProfiles = profiles.map((profile) => {
        const personId = profile.personId || profile.id;
        const person = peopleById.get(personId) || peopleById.get(profile.id) || {};
        if (personId) profileIds.add(personId);

        const activeAssignments = assignments.filter(
          (item) =>
            item.studentId === personId &&
            item.status !== 'closed' &&
            !item.validTo
        );

        const isActive =
          person.active !== undefined
            ? person.active !== false
            : profile.isActive !== false;

        return {
          ...person,
          ...profile,
          id: personId,
          personId,
          firstName: profile.firstName || person.firstName || '',
          lastName: profile.lastName || person.lastName || '',
          fullName:
            profile.fullName ||
            person.fullName ||
            `${profile.firstName || person.firstName || ''} ${
              profile.lastName || person.lastName || ''
            }`.trim(),
          dni: getStudentDni(profile) || getStudentDni(person),
          active: isActive,
          isActive,
          groupAssignments: activeAssignments,
        };
      });

      const withoutProfile = people
        .filter((p) => p.id && !profileIds.has(p.id))
        .map((person) => {
          const activeAssignments = assignments.filter(
            (item) =>
              item.studentId === person.id &&
              item.status !== 'closed' &&
              !item.validTo
          );
          const isActive = person.active !== false && person.isActive !== false;
          return {
            ...person,
            id: person.id,
            personId: person.id,
            dni: getStudentDni(person),
            active: isActive,
            isActive,
            groupAssignments: activeAssignments,
          };
        });

      const merged = [...fromProfiles, ...withoutProfile];
      const knownIds = new Set(merged.flatMap((s) => [s.id, s.personId]).filter(Boolean));
      const knownDnis = new Set(
        merged.map((s) => normalizeDni(s.dni)).filter(Boolean)
      );

      legacyStudents.forEach((legacy) => {
        const legacyId = legacy.id || legacy.personId;
        const dniKey = normalizeDni(getStudentDni(legacy));
        if ((legacyId && knownIds.has(legacyId)) || (dniKey && knownDnis.has(dniKey))) {
          return;
        }
        const isActive = legacy.isActive !== false && legacy.active !== false;
        merged.push({
          ...legacy,
          id: legacyId,
          personId: legacyId,
          dni: getStudentDni(legacy),
          active: isActive,
          isActive,
          groupAssignments: [],
        });
      });

      const filtered = activeOnly ? merged.filter((s) => s.active !== false) : merged;
      filtered.sort((a, b) =>
        `${a.lastName || ''} ${a.firstName || ''}`.localeCompare(
          `${b.lastName || ''} ${b.firstName || ''}`,
          'es-AR'
        )
      );

      setStudents(filtered);
      setLoading(false);
    };

    const unsubs = [
      onSnapshot(
        query(base(COLLECTIONS.PEOPLE), where('type', '==', 'student')),
        (snap) => {
          people = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          rebuild();
        },
        (err) => {
          console.error('useStudents (people) error:', err);
          setError(err);
          setLoading(false);
        }
      ),
      onSnapshot(
        base(COLLECTIONS.STUDENT_PROFILES),
        (snap) => {
          profiles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          rebuild();
        },
        (err) => {
          console.error('useStudents (profiles) error:', err);
          setError(err);
          setLoading(false);
        }
      ),
      onSnapshot(
        base(COLLECTIONS.STUDENT_GROUP_ASSIGNMENTS),
        (snap) => {
          assignments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          rebuild();
        },
        (err) => console.warn('useStudents (assignments) warning:', err)
      ),
      onSnapshot(
        base('students'),
        (snap) => {
          legacyStudents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          rebuild();
        },
        () => {
          // Colección legacy opcional
          rebuild();
        }
      ),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [db, appId, activeOnly]);

  return { students, loading, error };
}

/**
 * Hook unificado para leer el personal institucional desde:
 * staff_records + people (type === 'staff') + staff_profiles
 */
export function useStaff(db, appId, { activeOnly = false } = {}) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db || !appId) {
      setStaff([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    let records = [];
    let people = [];
    let profiles = [];

    const base = (name) =>
      collection(db, 'artifacts', appId, 'public', 'data', name);

    const rebuild = () => {
      const byId = new Map();

      people.forEach((p) => {
        byId.set(p.id, { ...p, id: p.id, personId: p.id });
      });

      profiles.forEach((prof) => {
        const id = prof.personId || prof.id;
        byId.set(id, { ...(byId.get(id) || {}), ...prof, id, personId: id });
      });

      records.forEach((rec) => {
        byId.set(rec.id, { ...(byId.get(rec.id) || {}), ...rec, id: rec.id, personId: rec.id });
      });

      let merged = Array.from(byId.values()).map((item) => {
        const isActive = item.active !== false && item.isActive !== false && !item.fechaBaja;
        return {
          ...item,
          firstName: item.firstName || '',
          lastName: item.lastName || '',
          fullName:
            item.fullName ||
            `${item.firstName || ''} ${item.lastName || ''}`.trim(),
          active: isActive,
          isActive,
        };
      });

      if (activeOnly) {
        merged = merged.filter((item) => item.active);
      }

      merged.sort((a, b) =>
        `${a.lastName || ''} ${a.firstName || ''}`.localeCompare(
          `${b.lastName || ''} ${b.firstName || ''}`,
          'es-AR'
        )
      );

      setStaff(merged);
      setLoading(false);
    };

    const unsubs = [
      onSnapshot(
        base('staff_records'),
        (snap) => {
          records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          rebuild();
        },
        (err) => {
          console.error('useStaff (staff_records) error:', err);
          setError(err);
          setLoading(false);
        }
      ),
      onSnapshot(
        query(base(COLLECTIONS.PEOPLE), where('type', '==', 'staff')),
        (snap) => {
          people = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          rebuild();
        },
        (err) => console.warn('useStaff (people) warning:', err)
      ),
      onSnapshot(
        base(COLLECTIONS.STAFF_PROFILES),
        (snap) => {
          profiles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          rebuild();
        },
        (err) => console.warn('useStaff (staff_profiles) warning:', err)
      ),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [db, appId, activeOnly]);

  return { staff, loading, error };
}
