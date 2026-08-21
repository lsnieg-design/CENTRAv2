import { getCachedAppConfig, getInstitutionName } from '../config';
import React, { useState, useEffect } from 'react';
import { X, Edit3, Plus, BookOpen, Printer, PieChart, FileText } from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, query, deleteDoc } from 'firebase/firestore';

const CONFIG_INDICADORES = {
 pedagogico: { 
  'Inicial': [
   { id: 'lectoescritura', label: 'Lectoescritura', options: ['Presilábico: Explora la escritura con dibujos o grafismos sin valor sonoro aún.', 'Silábico: Comienza a asignar valor sonoro a las letras, mayormente vocales.', 'Silábico-alfabético: Transición; combina sílabas completas con letras aisladas.', 'Alfabético: Escribe de forma autónoma representando los fonemas con coherencia.'] },
   { id: 'escritura', label: 'Escritura', options: ['Requiere guía física constante (mano-sobre-mano) para realizar grafismos.', 'Escribe mediante copia fiel o dictado fonético sencillo con apoyo docente.', 'Escribe frases cortas mediante dictado fonético con supervisión frecuente.', 'Escribe de forma autónoma y creativa, expresando ideas con sentido completo.'] },
   { id: 'comprension', label: 'Comprensión', options: ['No logra significar el texto, se limita a identificar imágenes.', 'Comprende textos breves y sencillos mediante lectura compartida.', 'Comprende el sentido global de textos breves de manera guiada.', 'Realiza lectura autónoma y comprende el sentido global de textos diversos.'] },
   { id: 'reconocimiento', label: 'Reconocimiento', options: ['Solo identifica su propio nombre entre otras palabras.', 'Reconoce nombre propio y de sus pares con facilidad.', 'Reconoce palabras de uso frecuente y frases cortas.', 'Lee palabras y frases con sentido completo de forma autónoma.'] },
   { id: 'serie_numerica', label: 'Serie numérica', options: ['Realiza conteo hasta 10, precisando apoyo con material concreto.', 'Realiza conteo hasta 20 y reconoce números en contextos cotidianos.', 'Maneja series numéricas amplias y reconoce familias numéricas.', 'Domina series numéricas complejas con total autonomía.'] },
   { id: 'operaciones', label: 'Operaciones', options: ['Identifica cantidades, pero no logra realizar operaciones.', 'Resuelve sumas y restas simples utilizando material didáctico.', 'Resuelve sumas y restas complejas con apoyo esporádico.', 'Resuelve problemas cotidianos con operaciones complejas autónomamente.'] },
   { id: 'figuras', label: 'Figuras y lógica', options: ['Identifica figuras básicas, pero requiere mediación para clasificarlas.', 'Clasifica elementos por forma, tamaño o color con supervisión.', 'Resuelve problemas simples de lógica y comparación.', 'Resuelve problemas de alta complejidad de forma autónoma.'] },
   { id: 'rutinas', label: 'Rutinas / Higiene', options: ['Requiere asistencia total y acompañamiento cercano en toda rutina.', 'Realiza rutinas básicas con supervisión constante y apoyo puntual.', 'Realiza rutinas con supervisión mínima y esporádica.', 'Es totalmente autónomo en sus rutinas escolares y cuidado personal.'] },
   { id: 'organizacion', label: 'Organización', options: ['Precisa que el adulto organice sus materiales de trabajo siempre.', 'Organiza sus materiales solo ante el recordatorio del docente.', 'Mantiene sus materiales organizados de forma independiente.', 'Anticipa y organiza todos los materiales necesarios antes de iniciar.'] },
   { id: 'pedido_ayuda', label: 'Pedido de ayuda', options: ['Ante la dificultad, espera la intervención externa.', 'Solicita ayuda mediante mediación o sugerencia del docente.', 'Identifica cuando necesita ayuda y la solicita ante la duda.', 'Es proactivo; ante un obstáculo busca soluciones antes de pedir ayuda.'] },
   { id: 'vinculo_pares', label: 'Vínculo con pares', options: ['Su juego es paralelo o solitario; le cuesta integrar a otros.', 'Interactúa con pares principalmente en actividades guiadas.', 'Se integra espontáneamente a juegos cooperativos grupales.', 'Lidera o propone actividades grupales de forma activa.'] },
   { id: 'vinculo_adulto', label: 'Vínculo adulto', options: ['Dependencia total del adulto para iniciar cualquier tarea.', 'Busca apoyo y validación constante de figuras adultas.', 'Busca apoyo solo ante dudas específicas o situaciones nuevas.', 'Establece un vínculo saludable de referencia, con autonomía.'] },
   { id: 'emocional', label: 'Expresión emocional', options: ['Ante malestar reacciona con impulsividad o conductas físicas.', 'Expresa su malestar verbalmente solo mediante mediación.', 'Expresa sus sentimientos de forma verbal con claridad.', 'Posee autorregulación y gestiona sus emociones de forma autónoma.'] },
   { id: 'pautas', label: 'Pautas / Turnos', options: ['No respeta pautas de convivencia ni turnos de habla.', 'Respeta pautas y turnos solo ante el recordatorio frecuente.', 'Respeta pautas y turnos con mínima guía docente.', 'Respeta los turnos y acuerdos de convivencia autónomamente.'] },
   { id: 'escucha', label: 'Escucha activa', options: ['Se encuentra desconectado de las consignas grupales.', 'Escucha si se lo interpela o busca individualmente.', 'Participa en la escucha de relatos o propuestas grupales.', 'Se muestra atento y responde correctamente a consignas grupales.'] },
   { id: 'conflictos', label: 'Conflictos', options: ['Reacciona con conductas físicas o impulsivas ante el conflicto.', 'Expresa el malestar pero requiere mediación docente directa.', 'Resuelve conflictos mediante el diálogo con intervención mínima.', 'Resuelve conflictos de forma autónoma, aceptando acuerdos de paz.'] },
   { id: 'desplazamiento', label: 'Desplazamiento', options: ['Necesita guía física permanente para transitar la escuela.', 'Reconoce los espacios, pero requiere recordatorios constantes.', 'Se desplaza por la escuela con recordatorios esporádicos.', 'Autónomo en toda la institución con sentido de pertenencia.'] },
   { id: 'juego', label: 'Tipo de juego', options: ['Su juego es puramente exploratorio y sensorial.', 'Desarrolla juego simbólico (imaginativo con elementos).', 'Participa en juegos reglados simples respetando turnos.', 'Propone y participa en juegos reglados complejos y creativos.'] },
   { id: 'ciencias', label: 'Ciencias / Indagación', options: ['Precisa modelado paso a paso para usar materiales. Muestra curiosidad puntual sin lograr sostener la observación.', 'Manipula los materiales con intención clara y sentido. Indaga sobre el entorno con mediación y preguntas docentes.', 'Realiza producciones propias con intención creativa. Manifiesta curiosidad, investiga fenómenos y busca explicaciones.', 'Utiliza y cuida los materiales con creatividad y autonomía. Investiga de forma independiente, proponiendo explicaciones propias.'] },
   { id: 'cuidado', label: 'Cuidado del entorno', options: ['No registra el entorno ni las pautas de cuidado.', 'Identifica normas de cuidado con supervisión constante.', 'Identifica y aplica normas de cuidado con mínima guía.', 'Autónomo en el cuidado del medio ambiente y los seres vivos.'] },
   { id: 'comunicacion', label: 'Comunicación', options: ['Comunicación reactiva; utiliza gestos básicos ante necesidad inmediata.', 'Comunicación funcional; usa señas, pictogramas o habla simple con apoyo.', 'Comunicación activa; comunica deseos y necesidades con frases breves.', 'Comunicación compleja; relata eventos y sostiene conversaciones con fluidez.'] },
   { id: 'funciones', label: 'Funciones Ejecutivas', options: ['Atención muy dispersa; requiere estímulos constantes para focalizar.', 'Atención breve; sigue instrucciones de un solo paso con mediación.', 'Atención sostenida en tareas cortas; sigue instrucciones de dos pasos.', 'Atención focalizada; sigue secuencias complejas con autonomía total.'] },
   { id: 'flexibilidad', label: 'Flexibilidad Cognitiva', options: ['Gran dificultad ante cambios: desregulación frente a lo imprevisto.', 'Acepta cambios en la rutina si se anticipan con apoyo visual.', 'Adapta su conducta ante cambios moderados con mínima mediación.', 'Alta flexibilidad; se ajusta a cambios imprevistos de forma autónoma.'] },
   { id: 'sensorial', label: 'Procesamiento Sensorial', options: ['Responde con desregulación ante estímulos ambientales (ruidos/luces).', 'Presenta sensibilidad alta; requiere espacios tranquilos para calmarse.', 'Registra estímulos ambientales sin que afecten significativamente su tarea.', 'Alta tolerancia sensorial; se autorregula adecuadamente en entornos activos.'] },
   { id: 'intereses', label: 'Intereses y Fortalezas', options: ['Su interés es restringido a objetos únicos sin variante.', 'Presenta intereses identificables que sirven como motivadores de tarea.', 'Utiliza sus pasiones para realizar actividades y socializar con pares.', 'Transfiere sus habilidades destacadas a múltiples contextos escolares.'] },
   { id: 'apoyos', label: 'Apoyos eficaces', options: ['Requiere apoyos físicos y contacto directo constante.', 'Requiere agendas visuales y soportes concretos permanentes.', 'Utiliza apoyos puntuales ante tareas nuevas o de alta complejidad.', 'Autónomo; requiere apoyos mínimos solo para organización avanzada.'] }
  ]
 },
 psicomotricidad: {
  'Inicial': [
   { id: 'estabilidad', label: 'Desempeño en actividades de estabilidad postural', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'coordinacion', label: 'Coordinación motriz (manipulación y desplazamiento)', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'juegos_corporales', label: 'Participación en juegos con consignas corporales', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'espera', label: 'Tolerancia a tiempos de espera y turnos', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'adaptacion', label: 'Adaptación a cambios en la dinámica', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'conducta', label: 'Manejo de conductas ante demandas', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'iniciativa', label: 'Iniciativa y participación sostenida', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
  ]
 },
 plastica: {
  '1° Ciclo': [
   { id: 'uso_materiales', label: 'Reconoce uso de materiales', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'colores_primarios', label: 'Utiliza colores primarios y secundarios', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'mezclas', label: 'Realiza mezclas de colores', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'operaciones', label: 'Operaciones básicas de forma autónoma', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'comunicacion', label: 'Comunica ideas y emociones', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'participacion', label: 'Participa activamente', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'solicita_ayuda', label: 'Solicita ayuda', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'higiene', label: 'Cuidado e higiene de materiales', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
  ],
  '2° Ciclo': [
    { id: 'uso_materiales', label: 'Reconoce uso de materiales', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'analisis_obra', label: 'Observa y analiza obras de arte', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'experimenta_color', label: 'Explora y experimenta colores', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'espacio_trabajo', label: 'Reconoce y respeta espacio de trabajo', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'operaciones', label: 'Operaciones básicas de forma autónoma', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'participacion', label: 'Participa activamente', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'solicita_ayuda', label: 'Solicita ayuda', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'higiene', label: 'Cuidado e higiene de materiales', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
  ],
  'CFI': [
    { id: 'uso_materiales', label: 'Reconoce uso de materiales', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'experimenta_color', label: 'Experimenta colores', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'analisis_obra', label: 'Observa y analiza obras de arte', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'espacio_marco', label: 'Reconoce espacio, marco y límite', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'operaciones', label: 'Operaciones básicas de forma autónoma', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'participacion', label: 'Participa activamente', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'solicita_ayuda', label: 'Solicita ayuda', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'higiene', label: 'Cuidado e higiene de materiales', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
  ]
 },
 musica_brenda: {
  'Inicial': [
    { id: 'mb_esquema_corporal', label: 'Reconoce el esquema corporal.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'mb_imita_movimientos', label: 'Imita los movimientos de un modelo.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'mb_expresion_musica', label: 'Se expresa a través de la música.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'mb_voces_mando', label: 'Reconoce voces de mando: arriba, abajo, stop.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'mb_canciones_ludicas', label: 'Participa en canciones lúdicas con consignas de movimiento.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'mb_expresion_elementos', label: 'Participa en actividades de expresión corporal con elementos: telas, pañuelos, globos, burbujas.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'mb_respeta_actividades', label: 'Respeta y participa en las actividades pautadas en clase.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
  ]
},
musica: {
    'Nivel 1': [
      { id: 'reconocimiento_corporal', label: 'Reconocimiento corporal: Explora y produce sonidos con su cuerpo.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'seguimiento_pulso', label: 'Seguimiento del pulso: Identifica y sigue el tiempo en la ronda.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'atencion_estructural', label: 'Atención estructural: Descubre y respeta el inicio y el corte.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'manejo_instrumentos', label: 'Manejo de instrumentos: Examina y toca percusión menor.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'asociacion_efectos', label: 'Asociación de efectos: Rastrea ruidos para creaciones artísticas del momento.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
    ],
    'Nivel 2': [
      { id: 'coordinacion_sonora', label: 'Dominio de coordinación: Ensaya y combina planos sonoros.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'ensamble', label: 'Práctica en ensamble: Distingue su ritmo junto a compañeros.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'control_matices', label: 'Control de matices: Experimenta cambios de velocidad e intensidad.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'uso_registro', label: 'Uso de registro: Interpreta gráficos para recordar ritmos.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'sincronia', label: 'Logro de sincronía: Testea tocar coordinando con la imagen.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
    ]
  },
 educacion_fisica: {
  '2° Ciclo': [
    { id: 'ef_acoplamiento', label: 'Acoplamiento de movimientos: Coordinar dos o más acciones sin interrupción.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_ajuste', label: 'Ajuste espacio-temporal.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_disociacion', label: 'Disociación Segmentaria: la capacidad de mover las extremidades de forma independiente.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_equilibrio', label: 'Equilibrio dinámico / habilidades manipulativas.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_ritmo', label: 'Ritmo: Adaptar el movimiento corporal a estímulos externos.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_diferenciacion', label: 'Diferenciación: aplicar la fuerza justa.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_condicionales', label: 'Capacidades condicionales.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_social_docente', label: 'Se relaciona con el docente y acude a él sin dificultades.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_social_propuestas', label: 'Responde a las propuestas de la clase.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_social_materiales', label: 'Utiliza los materiales con el grupo.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_social_colabora', label: 'Puede colaborar para guardar y transportar materiales.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_ludico_norma', label: 'Aceptación de la norma.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_ludico_reglas', label: 'Modificación de reglas.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_ludico_sociomotor', label: 'El juego Sociomotor.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_ludico_simbolico', label: 'Del juego simbólico al juego reglado.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_ludico_deporte', label: 'Iniciación al Deporte Escolar.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
  ],
  'CFI': [
    { id: 'ef_cfi_tecnicas', label: 'Técnicas básicas de deportes.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_combinacion', label: 'Combinación de habilidades en velocidad.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_ambidextra', label: 'Ambidextra funcional.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_condicionales', label: 'Desarrollo de las Capacidades Condicionales.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_coordinativas', label: 'Capacidades Coordinativas Complejas.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_resolucion', label: 'Resolución Motriz Autónoma.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_lenguaje', label: 'Lenguaje Corporal.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_social_docente', label: 'Se relaciona con el docente y acude a él sin dificultades.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_social_propuestas', label: 'Responde a las propuestas de la clase.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_social_materiales', label: 'Utiliza los materiales con el grupo.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_social_colabora', label: 'Puede colaborar para guardar y transportar materiales.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_ludico_motriz', label: 'Dimensión Motriz y Funcional.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_ludico_socio', label: 'Dimensión Socio-Afectiva.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_ludico_cognitiva', label: 'Dimensión Cognitiva y Estratégica.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_ludico_reglado', label: 'Juego / deportes Reglado.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_ludico_iniciacion', label: 'Iniciación al Deporte Adaptado (handball, vóley, softbol, futbol).', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
   ]
 },
 laboral: {
  'CFI': [
   { id: 'herramientas_reconocimiento', label: 'Herramientas: Reconocimiento', options: ['No identifica herramientas; requiere asistencia para seleccionarlas.', 'Identifica herramientas básicas con apoyo visual o señalamiento.', 'Identifica y nombra herramientas de uso frecuente en el taller.', 'Reconoce y diferencia una amplia gama de herramientas según su función.'] },
   { id: 'herramientas_uso', label: 'Herramientas: Uso adecuado', options: ['Requiere guía física total para manipular cualquier herramienta.', 'Manipula herramientas con supervisión constante y seguridad asistida.', 'Usa herramientas con autonomía bajo supervisión mínima de seguridad.', 'Manipula herramientas con destreza, seguridad y total autonomía.'] },
   { id: 'produccion_proceso', label: 'Producción: Proceso', options: ['No logra seguir pasos; requiere mediación en cada acción.', 'Sigue pasos simples mediante apoyos visuales o instrucciones cortas.', 'Realiza tareas productivas siguiendo secuencias establecidas.', 'Desarrolla productos terminados cumpliendo el proceso completo solo.'] },
   { id: 'produccion_calidad', label: 'Producción: Calidad/Terminación', options: ['Requiere que el docente finalice o corrija su producción.', 'Realiza producciones con supervisión frecuente de los detalles.', 'Logra acabados de buena calidad con revisiones esporádicas.', 'Realiza producciones con alta calidad y atención a los detalles.'] },
   { id: 'autonomia_trabajo', label: 'Autonomía: Trabajo autónomo', options: ['Dependencia absoluta del adulto para iniciar y sostener la tarea.', 'Sostiene la tarea por tiempos breves con recordatorio docente.', 'Mantiene el ritmo de trabajo con supervisión intermitente.', 'Trabaja con autonomía, organizando sus tiempos y tareas solo.'] },
   { id: 'autonomia_seguridad', label: 'Autonomía: Seguridad e Higiene', options: ['Desconoce las normas; requiere control físico constante.', 'Conoce las normas básicas si se le recuerdan antes de empezar.', 'Respeta las normas de seguridad e higiene de forma consistente.', 'Es referente en normas de seguridad y cuida su espacio de trabajo.'] },
   { id: 'rol_pautas', label: 'Rol Laboral: Respeto de pautas', options: ['No respeta pautas; interrumpe el trabajo de otros.', 'Respeta pautas y horarios con supervisión frecuente.', 'Cumple con las pautas de trabajo y los tiempos del taller.', 'Demuestra compromiso y sentido de responsabilidad laboral.'] },
   { id: 'rol_equipo', label: 'Rol Laboral: Trabajo en equipo', options: ['Realiza su tarea de forma aislada sin considerar el entorno.', 'Participa en tareas compartidas cuando el docente lo coordina.', 'Colabora con pares en producciones grupales de forma fluida.', 'Propone tareas colaborativas y ayuda a otros en el taller.'] },
   { id: 'comprension_proceso', label: 'Comprensión del proceso', options: ['Ejecuta acciones aisladas sin comprender el resultado final del producto.', 'Comprende una parte del proceso con mediación docente constante.', 'Comprende la secuencia del proceso productivo y su lugar en el mismo.', 'Entiende el proceso productivo integral y cómo su tarea aporta al resultado.'] },
   { id: 'responsabilidad_rol', label: 'Responsabilidad de rol', options: ['Requiere supervisión para mantenerse en su puesto o función asignada.', 'Asume un rol simple con supervisión; cumple tareas asignadas por terceros.', 'Mantiene su rol y función con autonomía dentro del grupo de trabajo.', 'Identifica necesidades del sistema y asume funciones de forma proactiva.'] },
   { id: 'adaptabilidad', label: 'Adaptabilidad al cambio', options: ['Presenta rigidez frente a variaciones en la tarea o en el puesto de trabajo.', 'Acepta cambios en su función tras una explicación y acompañamiento.', 'Se adapta a diferentes roles o tareas dentro del taller con mínima guía.', 'Muestra gran versatilidad; cambia de función según la necesidad del sistema.'] },
   { id: 'gestion_tiempos', label: 'Gestión de tiempos', options: ['No registra el tiempo; requiere guía para iniciar, pausar o terminar.', 'Realiza la tarea respetando ritmos mínimos bajo supervisión externa.', 'Regula su propio ritmo de trabajo para cumplir con los tiempos de entrega.', 'Planifica su tiempo y recursos para optimizar la producción del sistema.'] }
  ]
 }
};
const DICCIONARIO = {
 // ==========================================
 // ÁREA PEDAGÓGICA 
 // ==========================================
 lectoescritura: [
  `Nombre se encuentra en la etapa presilábica, explorando la escritura a través de dibujos y trazos. Comienza a comprender que la escritura tiene un significado y que puede utilizarse para comunicar ideas. Por eso, cuando escribe, suele realizar dibujos o marcas que representan aquello que quiere expresar, aunque todavía no utilice letras de manera convencional. Este recorrido forma parte de los primeros pasos en el aprendizaje de la lectura y la escritura.`,
  `Nombre se encuentra en la etapa silábica. Está comenzando a comprender que las palabras están formadas por sonidos que pueden representarse con letras. Por eso, al escribir, suele utilizar una letra para cada parte de la palabra, especialmente vocales. Este proceso muestra importantes avances en la construcción de la lectura y la escritura.`,
  `Nombre se encuentra en la etapa silábico-alfabética. Al escribir, comienza a incorporar cada vez más letras para representar las palabras, mostrando una mayor comprensión de la relación entre lo que se dice y lo que se escribe. Sus producciones reflejan avances importantes en la construcción de la lectura y la escritura, acercándose progresivamente a la escritura convencional.`,
  `Nombre se encuentra en la etapa alfabética. Escribe de manera autónoma y sus producciones resultan claras y comprensibles para quienes las leen. Logra representar por escrito aquello que desea comunicar, organizando progresivamente sus ideas y utilizando la escritura como una herramienta para expresar conocimientos, experiencias e intereses.`
],

 escritura: [
 `Requiere acompañamiento físico constante para realizar grafismos y actividades de escritura. A través de este apoyo, va explorando el uso de los materiales, fortaleciendo el control de sus movimientos y descubriendo distintas formas de representar ideas y mensajes por escrito. Cada experiencia contribuye al desarrollo progresivo de habilidades vinculadas a la escritura.`,
  `Escribe palabras y producciones breves a partir de la copia o del dictado, contando con el acompañamiento del equipo docente cuando lo requiere. Se observa una participación activa en las propuestas de escritura y avances progresivos en la utilización de esta herramienta para expresar ideas y registrar información.`,
  `Escribe palabras y frases cortas con acompañamiento y supervisión frecuente. Logra comunicar ideas sencillas por escrito y muestra avances en la organización de sus producciones, fortaleciendo progresivamente la confianza y la autonomía en las situaciones de escritura.`,
  `Escribe de manera autónoma, expresando ideas, experiencias y conocimientos a través de producciones con sentido y claridad. Utiliza la escritura para comunicar aquello que desea compartir, mostrando iniciativa y creatividad en sus producciones. Se observa un buen nivel de autonomía en las situaciones de escritura propuestas.`
],
comprension: [
   `Nombre se encuentra en proceso de acercamiento a la lectura. Actualmente, logra reconocer imágenes presentes en los textos, utilizando estas referencias para anticipar. Se continúa favoreciendo el descubrimiento hacia las palabras escritas que también transmiten mensajes e información, ampliando progresivamente las posibilidades de comprensión.`,
  `Nombre comprende textos breves y sencillos cuando la lectura es acompañada por otras personas. Las situaciones de lectura compartida favorecen la comprensión de personajes, acciones y secuencias, permitiéndole participar activamente en la construcción de significado.`,
  `Nombre comprende el sentido general de textos breves con apoyo y orientación. A través de preguntas, intercambios y acompañamiento, logra identificar información importante y reconstruir aspectos relevantes de aquello que ha leído o do.`,
  `Nombre realiza lecturas de manera autónoma y comprende el sentido global de diversos textos. Identifica información relevante, relaciona ideas y construye interpretaciones acordes al contenido, utilizando la lectura como una herramienta funcional para aprender y acceder a nueva información.`
],
reconocimiento: [
    `Reconoce su propio nombre entre otras palabras escritas, utilizándolo como una referencia significativa para acercarse progresivamente al reconocimiento de nuevas palabras y elementos presentes en el entorno escolar.`,
  `Reconoce con facilidad su nombre y el de sus compañeros, identificando palabras significativas que funcionan como referentes para ampliar progresivamente sus conocimientos sobre la lectura y la escritura.`,
  `Reconoce de manera autónoma palabras de uso frecuente y frases breves presentes en distintos contextos cotidianos. Este avance le permite relacionar la escritura con situaciones concretas y ampliar sus posibilidades de comprensión.`,
  `Lee y comprende palabras y frases de manera autónoma, otorgándoles significado dentro de diferentes contextos. Utiliza esta habilidad de forma funcional en actividades escolares y situaciones de la vida cotidiana.`
],
serie_numerica: [
  `Nombre realiza conteos hasta 10 utilizando material concreto como apoyo. La manipulación de objetos favorece la comprensión de la cantidad, la secuencia numérica y la relación entre número y cantidad.`,
  `Nombre realiza conteos hasta 20 y reconoce números presentes en diferentes situaciones cotidianas. Continúa fortaleciendo la secuencia numérica y ampliando progresivamente la comprensión de los números en distintos contextos.`,
  `Nombre se desenvuelve con seguridad en series numéricas cada vez más amplias, reconociendo relaciones entre números y cantidades. Logra ordenar, comparar y establecer vínculos numéricos con creciente autonomía.`,
  `Nombre utiliza series numéricas amplias de manera autónoma y segura. Reconoce regularidades, establece relaciones numéricas y aplica estos conocimientos en diferentes situaciones de aprendizaje y de la vida cotidiana.`
],

operaciones: [
  `Reconoce cantidades y establece relaciones simples entre ellas. Actualmente se encuentra construyendo estrategias que le permitan comprender progresivamente el significado de las operaciones matemáticas y su aplicación en situaciones concretas.`,
  `Resuelve sumas y restas simples utilizando material concreto y apoyos visuales. Estas herramientas favorecen la comprensión de los procesos de agregar, quitar y comparar cantidades.`,
  `Resuelve sumas y restas de mayor complejidad con un buen nivel de autonomía, requiriendo únicamente orientaciones ocasionales para revisar procedimientos o resultados.`,
  `Utiliza las operaciones matemáticas de manera autónoma para resolver situaciones de la vida cotidiana. Selecciona estrategias adecuadas y aplica sus conocimientos con seguridad y funcionalidad.`
],
 figuras: [
   `Reconoce algunas figuras geométricas básicas y se encuentra desarrollando progresivamente estrategias para observar, comparar y clasificar elementos según diferentes características.`,
  `Clasifica elementos considerando atributos como la forma, el tamaño o el color cuando cuenta con orientación y acompañamiento. Estas experiencias favorecen la organización de la información y el desarrollo del pensamiento lógico.`,
  `Resuelve situaciones sencillas de comparación y razonamiento lógico. Logra identificar relaciones entre los elementos.`,
  `Resuelve situaciones de lógica y comparación con autonomía, analizando diferentes alternativas y aplicando estrategias cada vez más complejas para abordar los desafíos propuestos.`
],
 rutinas: [
  `Necesita acompañamiento cercano para participar de las rutinas de cuidado personal, higiene y organización propias de la jornada escolar. Se trabaja progresivamente en la incorporación de hábitos que favorezcan una mayor autonomía en estas actividades.`,
  `Realiza rutinas básicas de cuidado personal y organización cuando cuenta con acompañamiento, orientación y recordatorios. Estas intervenciones favorecen la incorporación progresiva de hábitos cada vez más autónomos.`,
  `Desarrolla las rutinas diarias con un buen nivel de autonomía. Requiere únicamente acompañamiento ocasional para supervisar o recordar algunos pasos específicos en determinadas situaciones.`,
  `Se desenvuelve con autonomía y seguridad en las rutinas de cuidado personal, higiene y organización que forman parte de la vida escolar. Gestiona estas actividades de manera independiente y adecuada a las demandas cotidianas.`
],

 organizacion: [
  `Necesita acompañamiento para organizar los materiales y preparar el espacio necesario para desarrollar las actividades. Se trabaja progresivamente en la incorporación de hábitos que favorezcan la autonomía y el orden en las tareas escolares.`,
  `Organiza sus materiales cuando recibe recordatorios y orientaciones. Se encuentra fortaleciendo progresivamente hábitos de preparación, cuidado y organización de los elementos necesarios para trabajar.`,
  `Mantiene organizados sus materiales y espacios de trabajo de manera autónoma durante la jornada escolar. Evidencia hábitos de orden que favorecen su participación y desempeño en las actividades.`,
  `Anticipa y organiza de manera autónoma los materiales necesarios para realizar las distintas actividades. Demuestra iniciativa y responsabilidad en la preparación de sus tareas y espacios de trabajo.`
],
pedido_de_ayuda: [
 `Necesita acompañamiento cercano frente a situaciones que resultan difíciles o desafiantes. Cuando encuentra obstáculos en una tarea, suele requerir orientación para retomar la actividad y continuar avanzando. Se trabaja progresivamente en el desarrollo de recursos que favorezcan la confianza, la perseverancia y la búsqueda de alternativas frente a las dificultades.`,
  `Comienza a reconocer cuándo necesita apoyo para resolver una actividad. Con acompañamiento y sugerencias, logra solicitar ayuda y aprovechar las orientaciones recibidas para continuar participando y avanzar en la tarea propuesta.`,
  `Identifica las situaciones en las que requiere apoyo y solicita ayuda de manera adecuada cuando surge alguna duda o dificultad. Este recurso le permite continuar avanzando en las actividades y fortalecer progresivamente su autonomía en el aprendizaje.`,
  `Identifica cuando necesita ayuda y la solicita.`
],
 flexibilidad: [
  `Necesita acompañamiento para afrontar cambios en las rutinas, las actividades o las propuestas habituales. La anticipación y los apoyos brindados favorecen progresivamente una mayor adaptación a situaciones nuevas o diferentes.`,
  `Logra adaptarse a cambios y propuestas diferentes cuando cuenta con explicaciones previas, acompañamiento y tiempo para anticipar lo que sucederá. Estas estrategias favorecen una participación más segura y confiada.`,
  `Se adapta adecuadamente a modificaciones en las actividades, las rutinas o las consignas habituales. Acepta nuevas propuestas con una actitud positiva, requiriendo únicamente orientaciones ocasionales en algunas situaciones.`,
  `Demuestra una gran capacidad para adaptarse a situaciones nuevas, cambios de rutina o propuestas diferentes. Afronta los desafíos con flexibilidad, mostrando disposición para explorar alternativas y desenvolverse con autonomía en contextos diversos.`
],
 vinculo_pares: [
 `Participa principalmente en actividades y juegos de manera individual o en cercanía de otras personas. A través de distintas propuestas, se promueven oportunidades de encuentro e intercambio que favorezcan progresivamente la construcción de vínculos y la participación compartida.`,
  `Participa y comparte actividades con sus compañeros cuando cuenta con el acompañamiento y la orientación de las personas adultas. En estos espacios logra sostener intercambios positivos y disfrutar de experiencias grupales junto a otras personas.`,
  `Se integra espontáneamente a juegos y actividades compartidas con sus compañeros. Disfruta de los espacios grupales, participa activamente y logra sostener intercambios positivos con otras personas.`,
  `Participa de manera activa en las dinámicas grupales, proponiendo ideas y favoreciendo la participación de sus compañeros. Se destaca por su disposición para compartir, colaborar y contribuir a la construcción de experiencias colectivas.`
],
 vinculo_adulto: [
   `Necesita el acompañamiento cercano de las personas adultas para comenzar, sostener y finalizar las actividades propuestas. La presencia, orientación y apoyo brindados favorecen la participación, la confianza y el desarrollo progresivo de mayores niveles de autonomía.`,
  `Suele buscar la cercanía y el acompañamiento de las personas adultas durante las actividades. La orientación y las devoluciones recibidas le brindan seguridad para avanzar en las tareas y fortalecer la confianza en sus propias posibilidades.`,
  `Se desenvuelve con autonomía en la mayoría de las actividades cotidianas. Recurre al acompañamiento de las personas adultas cuando surgen dudas puntuales o frente a situaciones nuevas que requieren orientación adicional.`,
  `Mantiene un vínculo positivo y de confianza con las personas adultas de referencia. Se muestra seguro para desenvolverse de manera autónoma en las actividades diarias, solicitando acompañamiento únicamente cuando lo considera necesario.`
],
 emocional: [
   `Se encuentra aprendiendo progresivamente a expresar y comunicar aquello que le preocupa, incomoda o genera frustración. En algunas situaciones puede manifestar su malestar a través de conductas o reacciones inapropiadas, por lo que requiere acompañamiento para identificar lo que siente y encontrar formas más adecuadas de expresarlo.`,
  `Comienza a poner en palabras aquello que siente cuando cuenta con el acompañamiento y la orientación una persona adulta. Logra identificar progresivamente sus emociones y necesidades.`,
  `Reconoce y expresa sus emociones, necesidades e inquietudes de manera clara y adecuada. Logra comunicar aquello que le agrada, le preocupa o le resulta difícil, favoreciendo la resolución de situaciones cotidianas a través del diálogo.`,
  `Reconoce sus emociones y cuenta con recursos para gestionarlas de manera cada vez más autónoma. Frente a situaciones que generan frustración, enojo o preocupación, logra poner en práctica estrategias que le permiten recuperar la calma y continuar participando de las actividades de forma adecuada.`
],
 pautas: [
  `Se encuentra en proceso de incorporar las pautas de convivencia y los tiempos de espera propios de las actividades grupales. Requiere acompañamiento frecuente para participar de los intercambios, r a otras personas y esperar su turno en distintas situaciones de la jornada escolar.`,
  `Logra respetar las pautas de convivencia y los turnos de participación cuando cuenta con recordatorios y acompañamiento. Estos apoyos favorecen una participación cada vez más organizada dentro de las actividades compartidas con el grupo.`,
  `Participa adecuadamente de las actividades grupales, respetando los acuerdos de convivencia y los turnos de intercambio en la mayoría de las situaciones. Requiere únicamente orientaciones ocasionales para sostener estas conductas en algunos momentos específicos.`,
  `Participa de manera autónoma y respetuosa en las distintas propuestas grupales. Logra esperar su turno, escuchar a otras personas y desenvolverse de acuerdo con los acuerdos de convivencia establecidos, favoreciendo un clima positivo de trabajo y participación.`
],
 escucha: [
   `Necesita acompañamiento para sostener la atención durante las propuestas grupales. Con apoyos y estrategias que favorecen su participación, logra involucrarse progresivamente en las actividades y comprender las consignas compartidas con el grupo.`,
  `Responde mejor a las consignas cuando se le brindan de manera individual o con un acompañamiento más cercano. Estas intervenciones favorecen la comprensión de las propuestas y una participación más activa en las actividades escolares.`,
  `Participa de situaciones de escucha compartida, logrando atender a relatos y consignas dirigidas al grupo. Se observa una adecuada disposición para seguir las propuestas y responder a partir de la información recibida.`,
  `Se muestra atento durante las actividades grupales y logra comprender y responder adecuadamente a las consignas propuestas. Sigue las indicaciones con autonomía, participa activamente y sostiene una escucha que favorece su aprendizaje y participación en el grupo.`
],
 conflictos: [
   `Se encuentra aprendiendo formas cada vez más adecuadas de expresar su enojo, frustración o desacuerdo frente a situaciones de conflicto. En algunos momentos puede reaccionar de manera impulsiva, por lo que requiere acompañamiento para identificar lo ocurrido, expresar lo que siente y encontrar alternativas más positivas para resolver la situación.`,
  `Con el acompañamiento de las personas adultas, logra expresar aquello que le molesta o  preocupa cuando surge un conflicto.`,
  `Utiliza el diálogo como principal herramienta para resolver desacuerdos o dificultades con otras personas. Logra expresar su punto de vista, escuchar a los demás y participar en la búsqueda de soluciones, requiriendo solo orientaciones ocasionales en algunas situaciones.`,
  `Resuelve los conflictos cotidianos de manera autónoma y respetuosa. Logra dialogar, escuchar diferentes puntos de vista, llegar a acuerdos y sostener vínculos positivos con sus compañeros, favoreciendo una buena convivencia dentro del grupo.`
],
 desplazamiento: [
 `Necesita acompañamiento cercano para desplazarse por los diferentes espacios de la escuela. El apoyo brindado favorece la orientación, la seguridad y la participación en las distintas actividades que se desarrollan durante la jornada escolar.`,
  `Reconoce los espacios habituales de la escuela y su función dentro de la rutina diaria. Sin embargo, aún necesita recordatorios y orientaciones frecuentes para trasladarse de manera segura y autónoma entre los distintos sectores.`,
  `Se desplaza con seguridad por los espacios que forman parte de su rutina habitual. Requiere únicamente orientaciones ocasionales cuando debe dirigirse a lugares poco frecuentes o cuando se producen cambios en los recorridos habituales.`,
  `Se desplaza de manera autónoma y segura por los diferentes espacios de la escuela. Reconoce los distintos sectores, se orienta adecuadamente y participa de las actividades de la jornada con independencia y confianza.`
],
 juego: [
 `Disfruta explorando los objetos y materiales a través de la observación, manipulación y experimentación. Se interesa por descubrir sus características, construyendo aprendizajes a partir de la exploración directa del entorno.`,
  `Participa en juegos de representación, utilizando objetos y materiales para recrear situaciones de la vida cotidiana.`,
  `Participa de juegos con reglas sencillas, comprendiendo progresivamente las consignas y respetando los turnos de participación. Disfruta de las propuestas compartidas y logra desenvolverse adecuadamente dentro de las dinámicas de juego grupal.`,
  `Participa activamente en juegos con reglas más complejas y suele proponer nuevas ideas para enriquecer las actividades compartidas. Disfruta de los desafíos grupales, colabora con sus compañeros y contribuye a organizar y sostener las propuestas de juego.`
],
 ciencias: [
  `Participa de las propuestas de exploración con acompañamiento cercano para utilizar los materiales y desarrollar las actividades. Muestra interés y curiosidad por diferentes elementos y situaciones, aunque aún necesita apoyo para sostener la observación y la atención durante períodos más prolongados.`,
  `Explora los materiales de interés y participa activamente en las propuestas de observación. A través de orientaciones logra establecer relaciones y ampliar progresivamente su comprensión sobre el entorno que lo rodea.`,
  `Participa con entusiasmo en propuestas de exploración. Se muestra curioso frente a distintas situaciones. Aporta producciones propias durante las actividades.`,
  `Explora e investiga de manera autónoma, demostrando iniciativa para observar, formular preguntas y buscar respuestas sobre distintas situaciones de su entorno. Participa activamente de las propuestas, comparte sus ideas y construye explicaciones propias a partir de lo que observa, experimenta y descubre.`
],
 cuidado: [
`Se encuentra en proceso de incorporar hábitos relacionados con el cuidado de los materiales, los espacios compartidos y el entorno. Requiere acompañamiento frecuente para reconocer la importancia de estas acciones y participar progresivamente en propuestas de cuidado y conservación.`,
  `Reconoce las pautas básicas vinculadas al cuidado de los materiales, los espacios y el medio ambiente. Con recordatorios y acompañamiento, logra poner en práctica estas acciones durante las distintas actividades de la jornada escolar.`,
  `Demuestra compromiso con el cuidado de los materiales, los espacios compartidos y los seres vivos. Habitualmente aplica las pautas trabajadas en la escuela, requiriendo únicamente orientaciones ocasionales en algunas situaciones particulares.`,
  `Participa de manera autónoma y responsable en el cuidado de los materiales, los espacios y el medio ambiente. Demuestra actitudes de respeto hacia los seres vivos y colabora activamente en acciones que favorecen el bienestar y el cuidado del entorno que comparte con otras personas.`
],
 comunicacion: [
  `Se comunica principalmente a través de gestos, expresiones, miradas o sonidos para expresar necesidades e intereses inmediatos. Estas formas de comunicación le permiten interactuar con las personas de su entorno y hacerse entender en situaciones cotidianas.`,
  `Utiliza diferentes recursos para comunicarse, como señas, pictogramas, palabras o expresiones sencillas. Con acompañamiento y apoyos adecuados, logra expresar necesidades, intereses e ideas, participando de manera cada vez más activa en los intercambios con otras personas.`,
  `Participa activamente de los intercambios comunicativos, expresando deseos, necesidades, opiniones e intereses mediante frases breves y comprensibles. Logra comunicar aquello que piensa o siente, favoreciendo la interacción con pares y personas adultas.`,
  `Se comunica con claridad en diferentes situaciones. Utiliza el lenguaje como una herramienta para expresarse y resolver las actividades con seguridad.`
],
 funciones: [
 `Necesita acompañamiento frecuente para sostener la atención en las actividades propuestas. Suele distraerse con facilidad y requiere recordatorios, apoyos y estrategias que favorezcan la concentración y la participación en las tareas.`,
  `Logra concentrarse durante períodos breves de tiempo y seguir consignas sencillas cuando cuenta con acompañamiento y orientación. Las indicaciones claras y secuenciadas favorecen su participación y el desarrollo progresivo de la autonomía en las tareas.`,
  `Sostiene la atención durante el tiempo que requieren las actividades habituales y logra seguir consignas compuestas por dos o más pasos. Se observa una buena disposición para organizar su trabajo y completar las tareas propuestas.`,
  `Demuestra una adecuada capacidad para concentrarse, organizarse y seguir consignas de diferente complejidad de manera autónoma. Logra sostener la atención en las tareas, comprender secuencias de trabajo más extensas y resolver las actividades con seguridad e independencia.`
],
 
 sensorial: [
  `Puede sentirse incómodo o abrumado frente a algunos estímulos del entorno, como ruidos intensos, luces, movimientos o situaciones con mucha actividad. En estos momentos requiere acompañamiento y estrategias que favorezcan la calma y el bienestar para poder retomar las actividades de manera gradual.`,
  `Presenta sensibilidad frente a determinados estímulos del entorno escolar. En algunas situaciones se beneficia de espacios tranquilos, momentos de pausa o apoyos específicos que le permiten recuperar la calma y continuar participando de las actividades de manera más cómoda y segura.`,
  `Logra desenvolverse adecuadamente en los distintos espacios y actividades de la escuela, tolerando los estímulos habituales del entorno.`,
  `Participa con comodidad en diferentes contextos y actividades, incluso en situaciones con mucho movimiento o estímulos variados. Logra adaptarse a las demandas del entorno y mantener una participación activa, utilizando recursos personales que favorecen su bienestar y regulación.`
],
 intereses: [
    `Muestra un marcado interés por determinados objetos, temas o actividades que resultan especialmente significativos. A partir de estas preferencias, se promueve progresivamente la exploración de nuevas propuestas, ampliando experiencias y oportunidades de aprendizaje.`,
  ` Posee intereses y preferencias que favorecen la participación en las distintas actividades. . Estos temas resultan valiosos para despertar la curiosidad, sostener la atención y acompañar nuevos aprendizajes.`,
  `Utiliza sus intereses y temas favoritos como una herramienta para participar activamente en las propuestas escolares y vincularse con otras personas. Estas preferencias favorecen la comunicación, el intercambio y la construcción de experiencias compartidas con sus compañeros.`,
  `Aprovecha sus intereses, fortalezas y habilidades para desenvolverse con seguridad en diferentes situaciones escolares. Logra aplicar estos recursos en nuevos desafíos, mostrando iniciativa, creatividad y confianza para aprender, resolver problemas y participar activamente en la vida escolar.`
],
 apoyos: [
  `Requiere acompañamiento cercano y apoyo constante para participar de las distintas actividades. La presencia y guía de las personas adultas resultan fundamentales para iniciar las tareas, sostener la participación y desenvolverse con seguridad en las propuestas de la jornada escolar.`,
  `Se beneficia del uso de apoyos visuales y materiales concretos que le permiten comprender mejor las actividades, anticipar lo que sucederá y organizarse durante la jornada. Estos recursos favorecen su participación, comprensión y autonomía en las distintas propuestas escolares.`,
  `Se desenvuelve con un buen nivel de autonomía en las actividades habituales. Ante propuestas nuevas, cambios en la rutina o tareas que presentan mayor complejidad, puede requerir orientaciones y apoyos puntuales que le permitan organizarse y avanzar con mayor seguridad.`,
  `Participa de manera autónoma en las distintas actividades escolares y utiliza adecuadamente los recursos disponibles para organizarse y resolver las tareas propuestas. Solo en situaciones muy específicas o frente a desafíos de mayor complejidad puede requerir orientaciones ocasionales para planificar o revisar su trabajo.`
],

 // ==========================================
 // ÁREA LABORAL / CFI 
 // ==========================================
 herramientas_reconocimiento: [
  `Nombre presenta dificultades para identificar las herramientas de trabajo por cuenta propia. Requiere de asistencia y señalamientos para poder seleccionar los elementos necesarios para cada tarea propuesta en el taller. En esta etapa, estamos dandole andamiajes para que pueda conocer qué herramientas existen y para qué sirve cada una.`,
  `Logra identificar las herramientas básicas del taller, apoyándose de manera funcional en referencias visuales o mediante el señalamiento y la guía puntual brindada por la docente. De a poco se va familiarizando con su nombre y uso.`,
  `Identifica y nombra las herramientas de uso frecuente dentro del taller. Reconoce los elementos de trabajo habituales y los selecciona de manera pertinente para las actividades cotidianas. `,
  `Nombre reconoce, diferencia y categoriza de forma autónoma las herramientas. Demuestra un claro entendimiento de la función específica de cada elemento, seleccionando el instrumental más adecuado para cada requerimiento técnico. `
 ],
 herramientas_uso: [
  `Para manipular las herramientas del taller, Nombre requiere de una guía física y acompañamiento de tipo mano-sobre-mano. La intervención adulta es necesaria para garantizar el uso y el aprendizaje del gesto motor seguro.`,
  `Manipula las herramientas. Aplica correctamente las técnicas de uso, demostrando un buen dominio instrumental en sus prácticas. `,
  `Utiliza los elementos y herramientas del taller con autonomía, requiriendo únicamente de una supervisión mínima y esporádica orientada a validar las normas generales de seguridad.`,
  `Manipula las herramientas. Aplica correctamente las técnicas de uso, demostrando un buen dominio instrumental en sus labores prácticas. Manipula las herramientas con seguridad.`
 ],
 produccion_proceso: [
  `Presenta desafíos para seguir la secuencia de pasos en el proceso productivo. Necesita la mediación del adulto en las acciones que componen la tarea.`,
  `Logra llevar a cabo pasos simples del proceso productivo, apoyándose de manera efectiva en soportes visuales, esquemas gráficos o mediante la recepción de instrucciones verbales cortas y precisas.`,
  `Realiza de forma adecuada las diversas tareas productivas, logrando seguir e internalizar las secuencias preestablecidas de trabajo con independencia funcional para la dinámica del taller. `,
  `Es capaz de desarrollar y concretar propuestas abordando el proceso productivo en su totalidad de manera independiente. Planifica, ejecuta y concluye los pasos secuenciales sin requerir asistencia.`
 ],
produccion_calidad: [
  `Requiere que la docente intervenga de manera directa en el desarrollo de sus producciones, para lograr alcanzar los objetivos requeridos en el taller. `,
  `Concreta producciones de manera funcional, aunque precisa de supervisión y acompañamiento frecuente. `, // <--- AGREGAR ESTA COMA
  `Logra plasmar acabados de buena calidad en sus trabajos, evidenciando esmero en la terminación. Únicamente requiere de revisiones esporádicas o sugerencias puntuales para perfeccionar su producción. `,
  `Realiza sus tareas logrando producciones de calidad. Demuestra atención a los detalles.`
 ],
 autonomia_trabajo: [
  `Requiere asistencia para iniciar, estructurar y sostener temporalmente la tarea.`,
  `Logra sostener la atención en la tarea por períodos breves de tiempo. Precisa de recordatorios verbales y motivación por parte del docente para poder retomar y dar continuidad al trabajo.`,
  `Mantiene un ritmo de trabajo sostenido, constante y productivo, requiriendo supervisión intermitente. Demuestra capacidad para regular su actividad operativa de forma funcional.`,
  `Gestiona su propia jornada laboral de con poco apoyo de las docentes. Organiza su trabajo y hace la parte de la producción de forma responsable.`
 ],
 autonomia_seguridad: [
  `Nombre aún no ha internalizado las normas básicas de seguridad e higiene del taller. Requiere de control físico, supervisión y modelado preventivo para evitar situaciones de riesgo en el espacio de trabajo.`,
  `Evidencia conocimiento de las normas básicas de seguridad e higiene, logrando aplicarlas con el recordatorio explícito y la anticipación de la docente justo antes de comenzar sus actividades.`,
  `Respeta y aplica las normativas vigentes de seguridad e higiene. Demuestra cuidado por su propia integridad y mantiene la limpieza durante su desempeño`,
  `Nombre se posiciona como referente dentro del grupo. Cuida de forma proactiva y autónoma tanto su espacio personal de trabajo como el entorno general del taller.`
 ],
 rol_pautas: [
  `Presenta dificultades para ajustarse a las pautas del taller, tendiendo a deambular, salir del espacio áulico o interrumpir frecuentemente el trabajo de sus compañeros. Requiere constante acompañamiento físico para volver a la tarea. `,
  `Logra respetar de forma básica las pautas de convivencia y las normas de funcionamiento, precisando para ello de supervisión externa y señalamientos frecuentes. `,
  `Cumple adecuadamente con las pautas de trabajo, asimilando con responsabilidad los tiempos y las rutinas normativas propias de la dinámica cotidiana del taller. `,
  `Demuestra adecuados niveles de compromiso y respeto hacia las normativas generales de la institución. `
 ],
 rol_equipo: [
  `Cuando puede llevarlas a cabo, tiende a ejecutar sus tareas de manera aislada, centrando su foco únicamente en su propia actividad sin articular su desempeño con su entorno`,
  `Logra participar de manera funcional en tareas compartidas y proyectos asociativos, cuando es el docente quien da la pauta, coordina de forma directa y media la dinámica vincular con el resto del grupo.`,
  `Colabora asertivamente con sus pares en el desarrollo de producciones grupales. Logra sostener la comunicación, respetar su función y acompañar su tarea con la de sus compañeros.`,
  `Asume un rol proactivo y solidario frente a sus compañeros. Constantemente propone nuevas tareas de índole colaborativa, colabora con sus pares ante las dificultades y fomenta un excelente clima de trabajo en equipo. `
 ],
 comprension_proceso: [
  `Ejecuta acciones repetitivas o pasos productivos de manera sistemática. Trabaja en la comprensión del sentido global de la tarea o el resultado final.`,
  `Logra comprender parcialmente ciertas etapas de la secuencia de producción, necesitando de la explicación reiterada y la mediación constante por parte del docente. `,
  `Comprende la secuencia lógica y el encadenamiento del proceso de producción. Identifica con asertividad su lugar funcional dentro del sistema y la importancia de su tarea específica. `,
  `Posee un entendimiento global y detallado del proceso productivo. Identifica, valora y analiza cada intervención para llegar al resultado final.`
 ],
 responsabilidad_rol: [
  `Requiere de estímulos y supervisión directa de manera continua para lograr mantenerse en su lugar de trabajo y de esta forma focalizar su atención sobre la función operativa que le ha sido asignada dentro de la jornada.`,
  `Logra asumir un rol productivo de características simples bajo supervisión general. `,
  `Asume y mantiene su rol y función específica con autonomía y responsabilidad. Se desenvuelve con independencia dentro del grupo de trabajo.`,
  `Demuestra una sobresaliente madurez laboral. Es capaz de identificar por cuenta propia las diferentes necesidades o falencias emergentes del sistema productivo, asumiendo proactivamente nuevas funciones para darles solución. Es tan responsable que si ve que falta hacer algo que no era su tarea, se ofrece a ayudar sin que se lo pidamos.`
 ],
 adaptabilidad: [
  `Manifiesta una notoria rigidez conductual ante cualquier variación introducida en su tarea habitual, en el uso de los materiales o ante posibles y necesarios cambios.`,
  `Logra aceptar de forma transitoria ciertos cambios en su función productiva, siempre y cuando estas modificaciones cuenten previamente con una explicación clara, un encuadre anticipatorio visual y acompañamiento.`,
  `Se adapta de forma flexible a la rotación por diferentes roles o estaciones de trabajo dentro del taller, requiriendo solamente de la guía técnica de inducción frente al nuevo desafío. `,
  `Muestra una extraordinaria versatilidad y plasticidad sociolaboral. Cambia rápidamente de rol, puesto o función operativa basándose pura y exclusivamente en las demandas situacionales y las necesidades del sistema productivo. Es un todoterreno, no tiene problemas en cambiar de tarea mil veces si hace falta y siempre con excelente actitud.`
 ],
 gestion_tiempos: [
  `Trabaja en el registro consciente y funcional del paso del tiempo de trabajo. Requiere indicaciones directas para iniciar su labor, comprender los momentos de receso o finalizar su tarea. `,
  `Ejecuta las consignas de trabajo respetando ritmos mínimos de productividad, contando siempre con la estructuración, el andamiaje y la supervisión externa de su docente. `,
  `Logra regular su ritmo de trabajo de manera equilibrada para cumplir funcionalmente con los objetivos y plazos de entrega. `,
  `Planifica de manera estratégica e independiente todo su tiempo laboral y la disposición de sus recursos técnicos con el fin de optimizar al máximo los niveles y la eficiencia global de la producción del taller. Maneja los tiempos como un profesional, organizándose tan bien que hace que todo el equipo trabaje mejor.`
 ]
};
const FIRMAS_AREAS = {
  plastica: '',
  musica: '',
  musica_brenda: '',
  educacion_fisica: '',
  psicomotricidad: '',
  pedagogico: null, // Sin firma digital, firman a mano
  laboral: null     // Sin firma digital, firman a mano
};
// Añade esto al inicio de tu archivo:
// <script src="https://unpkg.com/docx@8.5.0/build/index.js"></script>


const formatearTextoImpresion = (idIndicador, indiceOpcion, respuestaCorta, firstNameRaw) => {
  if (!respuestaCorta || typeof respuestaCorta !== 'string') return '';

  const nombreReal = firstNameRaw ? firstNameRaw.split(' ')[0] : 'El/la estudiante';

  // 1. Detección de género
  const nom = nombreReal.trim().toLowerCase();
  const excepcionesMasculinas = ['bautista', 'luca', 'noa', 'sasha', 'borja', 'mika', 'andrea', 'jonas'];
  const esMujer = nom.endsWith('a') && !excepcionesMasculinas.includes(nom);

  const gen = {
    el_la: esMujer ? 'La' : 'El',
    lo_la: esMujer ? 'la' : 'lo',
    Lo_La: esMujer ? 'La' : 'Lo',
    solo: esMujer ? 'sola' : 'solo',
    atento: esMujer ? 'atenta' : 'atento',
    integrarlo: esMujer ? 'integrarla' : 'integrarlo',
    seguro: esMujer ? 'segura' : 'seguro',
    animandolo: esMujer ? 'animándola' : 'animándolo',
    acompaniandolo: esMujer ? 'acompañándola' : 'acompañándolo'
  };

  // 2. Obtener texto del diccionario
  let textoFinal = DICCIONARIO[idIndicador]?.[indiceOpcion] || respuestaCorta;

  // 3. Reemplazos controlados
  // Solo reemplaza si existe la palabra "Nombre" (como etiqueta)
  textoFinal = textoFinal
    .replace(/\bNombre\b/g, nombreReal) 
    .replace(/\bsolo\/a\b/gi, gen.solo)
    .replace(/\batento\/a\b/gi, gen.atento)
    .replace(/\bseguro\/a\b/gi, gen.seguro)
    .replace(/\bintegrarlo\/a\b/gi, gen.integrarlo)
    .replace(/\banimándolo\/a\b/gi, gen.animandolo)
    .replace(/\bacompañándolo\/a\b/gi, gen.acompaniandolo)
    .replace(/\b(Lo|La) ayudamos\b/gi, gen.Lo_La + " ayudamos")
    .replace(/\b(lo|la) ayudamos\b/gi, gen.lo_la + " ayudamos")
    .replace(/\b(Lo|La) asistimos\b/gi, gen.Lo_La + " asistimos")
    .replace(/\b(lo|la) asistimos\b/gi, gen.lo_la + " asistimos");

  return textoFinal;
};
const generarHTMLImpresion = (s, report) => {
 // 1. Normalizar el tipo de informe para la lectura de rúbricas e indicadores
 const tipoInformeNormalizado = report.tipoInforme;
 const nivel = tipoInformeNormalizado === 'musica' 
   ? (report.nivelMusica || 'Nivel 1') 
   : (tipoInformeNormalizado === 'musica_brenda' ? 'Inicial' : (s?.level || 'Inicial'));
    
 const indicadores = CONFIG_INDICADORES[tipoInformeNormalizado]?.[nivel] || 
                     CONFIG_INDICADORES[tipoInformeNormalizado]?.['Inicial'] || 
                     CONFIG_INDICADORES[tipoInformeNormalizado]?.['CFI'] || [];

 // 2. Definimos qué áreas usan la Grilla con X y cuáles usan texto redactado
 const materiasConGrilla = ['plastica', 'musica', 'musica_brenda', 'psicomotricidad', 'educacion_fisica'];
 let desarrolloHTML = '';

 // 3. Agregamos Contenidos o Fundamentación antes de la tabla
 if (report.tipoInforme === 'plastica' && report.contenidosPlastica) {
     desarrolloHTML += `
       <div class="mb-4" style="break-inside: avoid;">
         <h3 class="font-black uppercase text-violet-900 text-[10px] tracking-widest mb-1 border-b border-violet-100 pb-1">Contenidos Abordados</h3>
         <p class="text-gray-800 leading-relaxed font-medium text-[11px] mt-2 whitespace-pre-wrap">${report.contenidosPlastica}</p>
       </div>
     `;
 }
   
 if (report.tipoInforme === 'musica') {
     desarrolloHTML += `
       <div class="mb-4" style="break-inside: avoid;">
         <h3 class="font-black uppercase text-violet-900 text-[10px] tracking-widest mb-1 border-b border-violet-100 pb-1">Fundamentación</h3>
         <p class="text-gray-800 leading-relaxed font-medium text-[11px] mt-2 whitespace-pre-wrap">El trabajo rítmico estructurado en formato de círculo favorece la eliminación de jerarquías, promueve el contacto visual continuo y estimula procesos de autorregulación, atención conjunta y empatía a través de la producción de un pulso compartido.</p>
       </div>
     `;
 }

 if (report.tipoInforme === 'musica_brenda') {
     desarrolloHTML += `
       <div class="mb-4" style="break-inside: avoid;">
         <h3 class="font-black uppercase text-violet-900 text-[10px] tracking-widest mb-1 border-b border-violet-100 pb-1">Fundamentación</h3>
         <p class="text-gray-800 leading-relaxed font-medium text-[11px] mt-2 whitespace-pre-wrap">La música cumple un papel fundamental en el desarrollo integral de los niños, ya que estimula el lenguaje, la creatividad y la atención. Favorece la expression emocional, la sociabilidad y mejora la coordinación motriz. Es una herramienta que enriquece su desarrollo integral de manera lúdica significativa.</p>
       </div>
     `;
 }

 if (report.tipoInforme === 'psicomotricidad') {
     desarrolloHTML += `
       <div class="mb-4" style="break-inside: avoid;">
         <h3 class="font-black uppercase text-violet-900 text-[10px] tracking-widest mb-1 border-b border-violet-100 pb-1">Fundamentación</h3>
         <p class="text-gray-800 leading-relaxed font-medium text-[11px] mt-2 whitespace-pre-wrap"> El espacio de Psicomotricidad ofrece propuestas que favorecen el desarrollo integral de los estudiantes a través del movimiento, el juego y la interacción con otros. Mediante experiencias adaptadas a las posibilidades e intereses de cada alumno, se promueve la exploración corporal, la participación activa, la comunicación y la construcción de recursos que contribuyen a una mayor autonomía en los distintos contextos cotidianos. Las actividades propuestas buscan acompañar el fortalecimiento de habilidades motrices, la organización de la acción, la adaptación a diferentes situaciones y el desarrollo de estrategias que favorezcan una participación cada vez más significativa dentro de las experiencias compartidas.</p>
       </div>
     `;
 }
  
 if (report.tipoInforme === 'educacion_fisica') {
     const isCFI = s?.level?.toUpperCase() === 'CFI' || s?.level?.toUpperCase() === 'FINES';
     const fundacionEducacionFisica = isCFI 
       ? "En este ciclo lectivo, la Educación Física se propone como un espacio de encuentro..."
       : "En este ciclo lectivo, la Educación Física se propone como un espacio de encuentro...";

     desarrolloHTML += `
       <div class="mb-4" style="break-inside: avoid;">
         <h3 class="font-black uppercase text-violet-900 text-[10px] tracking-widest mb-1 border-b border-violet-100 pb-1">Fundamentación</h3>
         <p class="text-gray-800 leading-relaxed font-medium text-[11px] mt-2 whitespace-pre-wrap">${fundacionEducacionFisica}</p>
       </div>
     `;
 }

 // 4. Renderizamos la Grilla o el Texto
 if (materiasConGrilla.includes(report.tipoInforme)) {
     desarrolloHTML += `
       <table class="w-full text-left border-collapse mt-4 text-[11px] mb-6" style="break-inside: avoid;">
         <thead>
           <tr class="bg-violet-100 text-violet-900">
             <th class="border border-violet-200 p-2 font-black uppercase">Objetivos / Indicadores</th>
             <th class="border border-violet-200 p-2 font-black uppercase text-center w-20 leading-tight">Realiza con<br/>autonomía</th>
             <th class="border border-violet-200 p-2 font-black uppercase text-center w-20 leading-tight">Realiza con<br/>apoyo</th>
             <th class="border border-violet-200 p-2 font-black uppercase text-center w-20 leading-tight">En<br/>proceso</th>
           </tr>
         </thead>
         <tbody>
     `;
     indicadores.forEach(c => {
       const answer = report.answers?.[c.id];
       if (!answer) return;
       
       const xAutonomia = answer === c.options[0] ? 'X' : '';
       const xApoyo = answer === c.options[1] ? 'X' : '';
       const xProceso = answer === c.options[2] ? 'X' : '';

       desarrolloHTML += `
         <tr>
           <td class="border border-violet-200 p-2 font-medium text-gray-800">${c.label}</td>
           <td class="border border-violet-200 p-2 font-black text-center text-violet-800 text-sm">${xAutonomia}</td>
           <td class="border border-violet-200 p-2 font-black text-center text-violet-800 text-sm">${xApoyo}</td>
           <td class="border border-violet-200 p-2 font-black text-center text-violet-800 text-sm">${xProceso}</td>
         </tr>
       `;
     });
     desarrolloHTML += `</tbody></table>`;
 } else {
     desarrolloHTML += `<div class="space-y-4 border-l-2 border-violet-200 ml-1 pl-4">`;
     indicadores.forEach(c => {
       const answer = report.answers?.[c.id];
       if (!answer) return;
       const optionIndex = c.options.indexOf(answer);
       let textoDescriptivo = optionIndex !== -1 ? formatearTextoImpresion(c.id, optionIndex, answer, s?.firstName) : answer;
       
       if (textoDescriptivo) {
         desarrolloHTML += `
         <div class="text-xs flex flex-col mb-2 pb-3 border-b border-gray-100 last:border-0" style="break-inside: avoid;">
             <span class="font-black text-violet-900 uppercase text-[10px] tracking-widest mb-1">${c.label}</span>
             <span class="text-gray-800 leading-relaxed font-medium text-[11px]">${textoDescriptivo}</span>
         </div>`;
       }
     });
     desarrolloHTML += `</div>`;
 }

 let obsYObjetivosHTML = '';
 if (materiasConGrilla.includes(report.tipoInforme)) {
      const obsEspeciales = report.observacionesPlastica || report.observacionesMusica || report.observacionesPsicomotricidad || report.observacionesEducacionFisica || '';
      if (obsEspeciales) {
        obsYObjetivosHTML = `
        <div class="mt-4 bg-violet-50 p-5 rounded-xl border border-violet-200 shadow-sm" style="break-inside: avoid;">
            <h2 class="font-black uppercase text-violet-900 mb-2 text-[10px] tracking-widest border-b border-violet-200 pb-1">Observaciones del período</h2>
            <p class="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium mt-1">${obsEspeciales}</p>
        </div>`;
      }
 } else {
      // Agregado de las observaciones y los 3 objetivos para informes pedagógicos y laborales
      if (report.obsCuatrimestre1) {
        obsYObjetivosHTML += `
        <div class="mt-4 bg-violet-50 p-5 rounded-xl border border-violet-200 shadow-sm" style="break-inside: avoid;">
            <h2 class="font-black uppercase text-violet-900 mb-2 text-[10px] tracking-widest border-b border-violet-200 pb-1">Observaciones sobre los objetivos planteados en el primer semestre</h2>
            <p class="text-[11px] text-gray-800 whitespace-pre-wrap leading-relaxed font-medium mt-1">${report.obsCuatrimestre1}</p>
        </div>`;
      }
      
      if (report.objConductual || report.objPedagogico || report.objSocioafectivo) {
        obsYObjetivosHTML += `
        <div class="mt-4 bg-violet-50 p-5 rounded-xl border border-violet-200 shadow-sm" style="break-inside: avoid;">
            <h2 class="font-black uppercase text-violet-900 mb-2 text-[10px] tracking-widest border-b border-violet-200 pb-1">Objetivos para el segundo semestre</h2>
            <div class="space-y-2 mt-2">
                ${report.objConductual ? `<div><strong class="text-[10px] font-black uppercase text-violet-800">Objetivo Conductual:</strong> <p class="text-[11px] text-gray-800 inline">${report.objConductual}</p></div>` : ''}
                ${report.objPedagogico ? `<div><strong class="text-[10px] font-black uppercase text-violet-800">Objetivo Pedagógico:</strong> <p class="text-[11px] text-gray-800 inline">${report.objPedagogico}</p></div>` : ''}
                ${report.objSocioafectivo ? `<div><strong class="text-[10px] font-black uppercase text-violet-800">Objetivo Socioafectivo:</strong> <p class="text-[11px] text-gray-800 inline">${report.objSocioafectivo}</p></div>` : ''}
            </div>
        </div>`;
      }
 }

 const subtituloArea = report.tipoInforme === 'musica' 
   ? 'Música (Francisco Jaime)' 
   : (report.tipoInforme === 'musica_brenda' ? 'Música (Brenda Celiz)' : report.tipoInforme);

 const mostrarAuxiliar = !['plastica', 'musica', 'musica_brenda', 'psicomotricidad', 'educacion_fisica'].includes(report.tipoInforme);

 return `
 <div class="pagina w-full bg-white text-black font-sans pb-4">
     <div class="flex flex-col items-center justify-center border-b-2 border-violet-800 pb-4 mb-5 bg-violet-50 p-6 rounded-t-xl">
         <img src={getCachedAppConfig().logoUrl || '/icon-192.png'} alt="Logo Institucional" class="h-16 object-contain mb-3" />
         <h1 class="text-2xl font-black uppercase tracking-widest text-violet-900 mb-1">INFORME ${report.periodo.toUpperCase()} 2026</h1>
         <p class="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 bg-white px-3 py-0.5 rounded-full border border-violet-200 shadow-sm">
             Área: ${subtituloArea}
         </p>
     </div>
     
    <div class="border border-violet-200 rounded-xl p-5 mb-3 bg-white shadow-sm" style="break-inside: avoid;">
         <h2 class="text-sm font-black text-violet-900 uppercase border-b border-violet-100 pb-1 mb-3">Datos del Estudiante</h2>
         <div class="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
             <p><strong class="font-black text-gray-900">Alumno/a:</strong> <span class="text-gray-700">${s.lastName}, ${s.firstName}</span></p>
             <p><strong class="font-black text-gray-900">DNI:</strong> <span class="text-gray-700">${s.dni || '....................................'}</span></p>
             <p><strong class="font-black text-gray-900">Fecha de Nac.:</strong> <span class="text-gray-700">${s.birthDate || s.fechaNac || '....................................'}</span></p>
             <p><strong class="font-black text-gray-900">Grupo:</strong> <span class="text-gray-700 font-bold">${report.grupo}</span></p>
             <p><strong class="font-black text-gray-900">Docente a cargo:</strong> <span class="text-gray-700">${report?.docente || s.teacher || s.docente || '....................................'}</span></p>
             ${mostrarAuxiliar ? `<p><strong class="font-black text-gray-900">Auxiliar/Preceptora:</strong> <span class="text-gray-700">${report?.auxiliar || s.auxiliary || s.auxiliar || '....................................'}</span></p>` : ''}
             <p class="col-span-2"><strong class="font-black text-gray-900">Año de cursada:</strong> <span class="text-gray-700">2026</span></p>
         </div>
     </div>
     
  <div class="mb-3">
   <h2 class="text-sm font-black text-white bg-violet-800 uppercase px-4 py-1.5 rounded-md mb-2 shadow-sm inline-block" style="break-inside: avoid;">
             Desarrollo ${report.tipoInforme === 'musica' || report.tipoInforme === 'musica_brenda' ? 'Música' : report.tipoInforme.replace('_', ' ')}
         </h2>
         ${desarrolloHTML}
     </div>
     
     ${obsYObjetivosHTML}

     <div class="mt-8 mb-2 px-4 text-center" style="break-inside: avoid;">
         <p class="text-xs text-gray-700 italic font-medium">
             Continuaremos abordando, desde la perspectiva constructivista, el aprendizaje subjetivo del alumno, centrándonos en su bienestar y motivación, para avanzar durante el siguiente periodo.
         </p>
     </div>

     <div class="mt-8 pt-4 flex flex-col items-center justify-center border-t border-dashed border-gray-200" style="break-inside: avoid;">
         <img src={getCachedAppConfig().logoUrl || '/icon-192.png'} alt="Sello Institucional ${getInstitutionName()}" class="max-w-[500px] w-full object-contain mb-6 text-center" />
         
         <div class="w-full flex justify-between px-12 mt-12 relative">
             <div class="flex flex-col items-center w-48 relative">
                 ${FIRMAS_AREAS[report.tipoInforme] ? `
                   <div class="absolute bottom-6 flex justify-center items-center w-full pointer-events-none">
                       <img src="${FIRMAS_AREAS[report.tipoInforme]}" alt="Firma del Docente" class="h-14 object-contain" />
                   </div>
                 ` : ''}
                 <div class="w-full border-t-2 border-black mb-2"></div>
                 <span class="text-[10px] font-black uppercase text-gray-900">Firma de Docente</span>
             </div>
             
             <div class="flex flex-col items-center w-48">
                 <div class="w-full border-t-2 border-black mb-2"></div>
                 <span class="text-[10px] font-black uppercase text-gray-900">Firma de Familia</span>
             </div>
         </div>
     </div>
 </div>`;
};

export function InformesView({ user, db, appId }) {
 const [stage, setStage] = useState('main'); 
 const [tipoInforme, setTipoInforme] = useState('pedagogico');
 const [periodoInforme, setPeriodoInforme] = useState('Medio');
 const [selectedStudent, setSelectedStudent] = useState(null);
 const [contenidosPlastica, setContenidosPlastica] = useState('');
  const [observacionesPlastica, setObservacionesPlastica] = useState('');
 const [searchTerm, setSearchTerm] = useState('');
 const [turnoFiltro, setTurnoFiltro] = useState('Todos');
 const [nivelFiltro, setNivelFiltro] = useState('Todos');
 const [grupoFiltro, setGrupoFiltro] = useState('Todos');
 const [reportsImpresos, setReportsImpresos] = useState([]);
 
 const [reportsCorregidos, setReportsCorregidos] = useState([]);
 const [nivelMusica, setNivelMusica] = useState('');
  const [observacionesMusica, setObservacionesMusica] = useState('');
 const [observacionesPsicomotricidad, setObservacionesPsicomotricidad] = useState('');
 const [observacionesEducacionFisica, setObservacionesEducacionFisica] = useState('');
 const [showStatsModal, setShowStatsModal] = useState(false);
 
 const [students, setStudents] = useState([]);
 const [savedReports, setSavedReports] = useState([]);
 const [isSaving, setIsSaving] = useState(false);
 
 const [answers, setAnswers] = useState({});
 const [obsCuatrimestre1, setObsCuatrimestre1] = useState('');
 const [objConductual, setObjConductual] = useState('');
 const [objPedagogico, setObjPedagogico] = useState('');
 const [objSocioafectivo, setObjSocioafectivo] = useState('');
 
 const [docentePrint, setDocentePrint] = useState('');
 const [preceptoraPrint, setPreceptoraPrint] = useState('');

 // Efecto estricto para impresión limpia
 useEffect(() => {
  const originalDisplays = new Map();

  const handleBeforePrint = () => {
   const bodyChildren = Array.from(document.body.children);
   bodyChildren.forEach(child => {
    // Ocultamos TODO excepto el contenedor de impresión, scripts y styles
    if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.id !== 'impresion-masiva') {
     originalDisplays.set(child, child.style.display);
     child.style.display = 'none';
    }
   });
  };
 

  const handleAfterPrint = () => {
   // Destruimos el contenedor fantasma
   const masiva = document.getElementById('impresion-masiva');
   if (masiva) {
    masiva.remove();
   }

   // Restauramos la app normal
   const bodyChildren = Array.from(document.body.children);
   bodyChildren.forEach(child => {
    if (originalDisplays.has(child)) {
     child.style.display = originalDisplays.get(child);
    }
   });
   originalDisplays.clear();
  };

  window.addEventListener('beforeprint', handleBeforePrint);
  window.addEventListener('afterprint', handleAfterPrint);

  return () => {
   window.removeEventListener('beforeprint', handleBeforePrint);
   window.removeEventListener('afterprint', handleAfterPrint);
  };
 }, []); // <-- ACÁ CERRAMOS EL EFECTO CORRECTAMENTE

// =========================================================================
  // PARCHE CORREGIDO: CONTROLES EN TIEMPO REAL (IMPRESOS Y CORREGIDOS)
  // =========================================================================

  // 1. Escuchar reportes IMPRESOS desde Firebase
  useEffect(() => {
    if (!db || !appId || !periodoInforme) return;
    let unsub = () => {};
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'impresiones_control', periodoInforme);
      unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          setReportsImpresos(snap.data().ids || []);
        } else {
          setReportsImpresos([]);
        }
      }, (error) => {
        console.error("Error en impresiones snapshot:", error);
      });
    } catch (e) {
      console.error("Error inicializando referencia de impresión:", e);
    }
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [db, appId, periodoInforme]);

  // 2. Escuchar reportes CORREGIDOS desde Firebase
  useEffect(() => {
    if (!db || !appId || !periodoInforme) return;
    let unsub = () => {};
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'corregidos_control', periodoInforme);
      unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          setReportsCorregidos(snap.data().ids || []);
        } else {
          setReportsCorregidos([]);
        }
      }, (error) => {
        console.error("Error en correcciones snapshot:", error);
      });
    } catch (e) {
      console.error("Error inicializando referencia de corrección:", e);
    }
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [db, appId, periodoInforme]);

  // 3. Función para alternar estado IMPRESO en grupo
  const handleAlternarImpresionGrupo = async (alumnosGrupo, yaImpresos) => {
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'impresiones_control', periodoInforme);
    const idsGrupo = alumnosGrupo.map(s => `${s.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`);
    
    let nuevosIds = [...reportsImpresos];
    if (yaImpresos) {
      nuevosIds = nuevosIds.filter(id => !idsGrupo.includes(id));
    } else {
      nuevosIds = Array.from(new Set([...nuevosIds, ...idsGrupo]));
    }
    await setDoc(docRef, { ids: nuevosIds }, { merge: true });
  };

  // 4. Función para alternar estado CORREGIDO en grupo
  const handleAlternarCorrecionGrupo = async (alumnosGrupo, yaCorregidos) => {
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'corregidos_control', periodoInforme);
    const idsGrupo = alumnosGrupo.map(s => `${s.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`);
    
    let nuevosIds = [...reportsCorregidos];
    if (yaCorregidos) {
      nuevosIds = nuevosIds.filter(id => !idsGrupo.includes(id));
    } else {
      nuevosIds = Array.from(new Set([...nuevosIds, ...idsGrupo]));
    }
    await setDoc(docRef, { ids: nuevosIds }, { merge: true });
  };
 useEffect(() => {
  if (!db || !appId) return;
  const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
  const unsubS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  const qR = collection(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports');
  const unsubR = onSnapshot(qR, (snap) => setSavedReports(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  return () => { unsubS(); unsubR(); };
 }, [db, appId]);

 const estudiantesSede = students.filter(s => !s.modalidad || s.modalidad === 'Sede');
 
const filteredStudents = estudiantesSede.filter(s => {
 const matchSearch = `${s.lastName || ''} ${s.firstName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
 
 // 1. Mantenemos el filtro de turno base
 const matchTurno = turnoFiltro === 'Todos' || (turnoFiltro === 'Mañana' ? s.groupMorning : s.groupAfternoon);
 
 // 2. CORRECCIÓN: Filtramos el grupo respetando estrictamente el turno seleccionado
 let matchGrupo = true;
 if (grupoFiltro !== 'Todos') {
  if (turnoFiltro === 'Mañana') {
   // A la mañana evaluamos su grupo pedagógico de la mañana o su grupo laboral
   matchGrupo = s.groupMorning === grupoFiltro || s.laboralGroup === grupoFiltro;
  } else if (turnoFiltro === 'Tarde') {
   // A la tarde evaluamos estrictamente su grupo pedagógico de la tarde o laboral si correspondiese
   matchGrupo = s.groupAfternoon === grupoFiltro || s.laboralGroup === grupoFiltro;
  } else {
   // Si el turno está en "Todos", buscamos en cualquiera
   matchGrupo = [s.groupMorning, s.groupAfternoon, s.laboralGroup].includes(grupoFiltro);
  }
 }

 // 3. Mantenemos el filtro de nivel
 const matchNivel = grupoFiltro !== 'Todos' || nivelFiltro === 'Todos' || (s.level && s.level.toUpperCase() === nivelFiltro.toUpperCase());
 
 return matchSearch && matchTurno && matchNivel && matchGrupo;
});

const handleEdit = (student, report) => {
  setSelectedStudent(student);
  
  // Mantenemos las respuestas y observaciones previas intactas
  setAnswers(report?.answers || {});
  setObsCuatrimestre1(report?.obsCuatrimestre1 || '');
  setObjConductual(report?.objConductual || '');
  setObjPedagogico(report?.objPedagogico || '');
  setObjSocioafectivo(report?.objSocioafectivo || '');
  setNivelMusica(report?.nivelMusica || '');
  setObservacionesMusica(report?.observacionesMusica || report?.observacionesPsicomotricidad || report?.observacionesEducacionFisica || '');
  setObservacionesPsicomotricidad(report?.observacionesPsicomotricidad || '');
  setObservacionesEducacionFisica(report?.observacionesEducacionFisica || '');
  
  // --- LÓGICA DINÁMICA DE NOMBRES ---
  // Buscamos si hay un informe previo en el grupo para extraer los profes especiales
  const grupoData = savedReports.find(r => r.grupo === student.groupMorning || r.grupo === student.groupAfternoon);
  
  // Prioridad 1: Nombre guardado en el informe (si existe), 
  // Prioridad 2: Nombre especial guardado en el grupo (si existe), 
  // Prioridad 3: Nombre fijo por defecto.
  
  let docenteAsignado = student.teacher || student.docente || '';
  let auxAsignado = student.auxiliary || student.auxiliar || student.preceptora || '';

  if (tipoInforme === 'musica') {
    docenteAsignado = report?.docente || grupoData?.profeMusica || 'Francisco Jaime';
  } else if (tipoInforme === 'musica_brenda') {
    docenteAsignado = report?.docente || 'Brenda Celiz';
  } else if (tipoInforme === 'plastica') {
    docenteAsignado = report?.docente || grupoData?.profePlastica || 'Rosario Cozzarín';
  } else if (tipoInforme === 'educacion_fisica') {
    docenteAsignado = report?.docente || grupoData?.profeEF || 'Juan Cruz Ricchi';
  } else if (tipoInforme === 'psicomotricidad') {
    docenteAsignado = report?.docente || grupoData?.profePsico || 'Pablo Pagliuca';
  }
  
  setDocentePrint(docenteAsignado);
  setPreceptoraPrint(report?.auxiliar || auxAsignado);
  
  // Contenidos Plástica
  let defaultPlastica = '';
  const lvl = student?.level?.toUpperCase() || '';
  if (lvl.includes('1° CICLO')) {
     defaultPlastica = '- El espacio, aprovechamiento y utilización consciente del plano.\n- El color.\n- Textura visual y táctil.';
  } else if (lvl.includes('2° CICLO')) {
     defaultPlastica = 'Organización dentro del plano.\n- Textura visual y táctil.\n- El color.';
  } else if (lvl.includes('CFI')) {
     defaultPlastica = 'Espacio plástico bidimensional. El marco. Límite de la obra.\n- Texturas. Textura visual y táctil.\n- El color. Mezclas.\n- La composición.';
  }
  setContenidosPlastica(report?.contenidosPlastica || defaultPlastica);
  setObservacionesPlastica(report?.observacionesPlastica || '');
  
  setStage('form');
};

const handleSaveInforme = async () => {
  if (grupoFiltro === 'Todos') { alert("Por favor, seleccioná un grupo específico para guardar."); return; }
  setIsSaving(true);
  
  // Forzamos a que el ID único use el nuevo identificador para mantener limpia la base
  const idUnico = `${selectedStudent.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`; 
  
  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports', idUnico), {
    studentId: selectedStudent.id,
    studentName: `${selectedStudent.lastName}, ${selectedStudent.firstName}`,
    grupo: grupoFiltro,
    tipoInforme, // Se guardará como musica o musica_brenda según corresponda
    periodo: periodoInforme,
    observacionesPsicomotricidad,
    observacionesEducacionFisica,
    answers,
    nivelMusica,
    observacionesMusica,
    obsCuatrimestre1,
    objConductual,
    objPedagogico,
    objSocioafectivo,
    contenidosPlastica,
    observacionesPlastica,
    docente: docentePrint,
    auxiliar: preceptoraPrint,
    updatedAt: serverTimestamp()
  }, { merge: true });
  
  setStage('main');
  setIsSaving(false);
};
 

// REEMPLAZAR EL BLOQUE DE nivelActual E indicadoresActuales POR ESTE:
const lvlUpper = selectedStudent?.level?.toUpperCase() || '';
const grupoUpper = grupoFiltro?.toUpperCase() || '';

// Validamos si el nivel O el grupo que estamos viendo pertenecen a Inicial o 1° Ciclo
const esNivelValidoBrenda = 
  lvlUpper.includes('INICIAL') || 
  lvlUpper.includes('1° CICLO') ||
  grupoUpper.includes('INICIAL') || 
  grupoUpper.includes('1° CICLO');

const nivelActual = tipoInforme === 'musica' 
  ? (nivelMusica || 'Nivel 1') 
  : (tipoInforme === 'musica_brenda' ? 'Inicial' : (selectedStudent?.level || 'Inicial'));

// ¡ESTA ES LA VARIABLE QUE LA CONSOLA DICE QUE FALTA!
const indicadoresActuales = (tipoInforme === 'musica_brenda' && !esNivelValidoBrenda)
  ? []
  : (CONFIG_INDICADORES[tipoInforme]?.[nivelActual] || CONFIG_INDICADORES[tipoInforme]?.['Inicial'] || CONFIG_INDICADORES[tipoInforme]?.['CFI'] || []);

const nivelesDisponibles = tipoInforme === 'laboral' 
  ? ['2° Ciclo', 'CFI'] 
  : ['Inicial', '1° Ciclo', '2° Ciclo', 'CFI'];

return (
  <div className="max-w-4xl mx-auto p-4 pb-20 animate-in fade-in relative">
   
  {/* MAGIA CSS PARA IMPRESIÓN (Con márgenes dinámicos según el tipo de informe) */}
<style dangerouslySetInnerHTML={{ __html: `
 @media screen {
   #impresion-masiva { display: none !important; }
 }
 @media print {
   body > *:not(#impresion-masiva):not(script):not(style) {
     display: none !important;
   }
   #impresion-masiva {
     display: block !important;
     visibility: visible !important;
     position: relative; 
     width: 100%;
   }
   .pagina { 
     page-break-after: always; 
     page-break-inside: avoid;
     padding-bottom: 0 !important;
   }
   body { 
     background: white; 
     margin: 0; 
     padding: 0; 
   }

   /* --- CONFIGURACIÓN DE MÁRGENES DINÁMICOS (AIRE) --- */
   /* Si es Pedagógico o Laboral: Margen amplio y elegante */
   .con-aire @page { 
     margin: 1.2cm 1.4cm !important; 
   }
   .con-aire .pagina {
     padding-left: 0.5cm !important;
     padding-right: 0.5cm !important;
   }

   /* Si es Materia Especial con Grilla: Margen compacto para asegurar hoja única */
   .compacto @page { 
     margin: 0.4cm 0.8cm !important; 
   }

   /* --- Reducción para el Encabezado en formato Grilla --- */
   .bg-violet-50.p-6.rounded-t-xl {
     padding: 0.6rem !important;
     margin-bottom: 0.5rem !important;
   }
   .bg-violet-50.p-6.rounded-t-xl img {
     height: 2.1rem !important;
     margin-bottom: 0.25rem !important;
   }
   .bg-violet-50.p-6.rounded-t-xl h1 {
     font-size: 1.1rem !important;
     margin-bottom: 0px !important;
   }
   .bg-violet-50.p-6.rounded-t-xl p {
     font-size: 9px !important;
     padding: 0.1rem 0.5rem !important;
   }

   /* --- Compactación del bloque de Datos del Estudiante --- */
   .border-violet-200.rounded-xl.p-5.mb-3 {
     padding: 0.5rem 0.75rem !important;
     margin-bottom: 0.4rem !important;
   }
   .border-violet-200.rounded-xl.p-5.mb-3 h2 {
     margin-bottom: 0.3rem !important;
     font-size: 11px !important;
   }
   .border-violet-200.rounded-xl.p-5.mb-3 .grid {
     grid-gap: 0.25rem 0.75rem !important;
   }

   /* --- Ajustes generales de Contenedores y Tablas --- */
   .mb-4 { margin-bottom: 0.35rem !important; }
   .mb-3 { margin-bottom: 0.35rem !important; }
   .mt-8 { margin-top: 0.35rem !important; }
   .mt-12 { margin-top: 1rem !important; }
   .p-5  { padding: 0.5rem !important; }
   
   table {
     margin-top: 4px !important;
     margin-bottom: 4px !important;
   }
   th, td {
     padding: 3px 5px !important;
     line-height: 1.1 !important;
     font-size: 10px !important;
   }

   .mt-12.relative {
     margin-top: 1.5rem !important;
   }
 }
`}} />

   {/* ========================================================================= */}
   {/* VISTA PRINCIPAL DE ALUMNOS                                                */}
   {/* ========================================================================= */}
   <div className={`${stage === 'main' ? 'block' : 'hidden'} print:hidden`}>
    <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-6 md:p-8 rounded-[30px] md:rounded-[40px] shadow-xl text-white mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
     <div className="w-full md:w-auto text-center md:text-left">
      <h2 className="text-xl md:text-2xl font-black mb-2 flex items-center justify-center md:justify-start gap-3">
       <BookOpen size={24} className="md:w-[28px] md:h-[28px]" /> Gestión de Informes
      </h2>
      <p className="text-violet-100 text-xs md:text-sm">Mostrando: {filteredStudents.length} alumnos en la base Sede.</p>
     </div>

  <div className="w-full md:w-auto bg-white/10 p-3 rounded-2xl border border-white/20 flex flex-col md:flex-row items-end gap-3">
      <div className="w-full md:w-auto">
       <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-violet-200 block mb-1 px-1 text-center md:text-left">
        Período del Informe:
       </label>
       <select 
        className="w-full bg-white text-violet-900 font-black text-sm md:text-base py-2 px-3 md:p-3 rounded-xl outline-none" 
        value={periodoInforme} 
        onChange={e => setPeriodoInforme(e.target.value)}
       >
        <option value="Inicial" disabled>Informe Inicial (Cerrado)</option>
        <option value="Medio">Informe Medio 2026</option>
        <option value="Final" disabled>Informe Final (Pronto)</option>
       </select>
      </div>
      <button 
        onClick={() => setShowStatsModal(true)} 
        className="w-full md:w-auto bg-white text-violet-900 hover:bg-violet-50 font-black py-2.5 px-4 md:p-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
      >
        <PieChart size={20} /> <span className="md:inline">Estadísticas</span>
      </button>
     </div>
    </div>

 <div className="flex flex-wrap gap-2 p-2 bg-white rounded-2xl border mb-6">
          {[
            { id: 'pedagogico', label: 'Pedagógico' },
            { id: 'laboral', label: 'Laboral' },
            { id: 'psicomotricidad', label: 'Psicomotricidad' },
            { id: 'plastica', label: 'Plástica' },
            { id: 'musica', label: 'Música Fran' },
   { id: 'musica_brenda', label: 'Música Brenda' },
            { id: 'educacion_fisica', label: 'Ed. Física' }
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => { setTipoInforme(t.id); setNivelFiltro('Todos'); setGrupoFiltro('Todos'); }} 
              className={`flex-auto min-w-fit whitespace-nowrap px-3 py-2 md:p-3 text-xs md:text-sm rounded-xl font-black transition-all ${tipoInforme === t.id ? 'bg-violet-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

    
      {/* AVISO PARA EL DOCENTE */}
      {grupoFiltro === 'Todos' && !searchTerm && (
  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-3 mb-6">
         <span className="text-xl">👉</span>
         <p className="text-sm text-indigo-900 font-medium">Por favor, <strong>seleccioná el Turno, Nivel y Grupo</strong> (o utilizá el buscador) para ver a los alumnos y empezar a cargar sus informes.</p>
       </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        
        
        <select className="p-4 rounded-2xl border bg-white text-sm font-bold" value={turnoFiltro} onChange={e => {setTurnoFiltro(e.target.value); setNivelFiltro('Todos'); setGrupoFiltro('Todos');}}>
         <option value="Todos">Turno: Todos</option>
         <option value="Mañana">Mañana</option>
         <option value="Tarde">Tarde</option>
        </select>

        {turnoFiltro !== 'Todos' && (
         <select className="p-4 rounded-2xl border bg-white text-sm font-bold" value={nivelFiltro} onChange={e => {setNivelFiltro(e.target.value); setGrupoFiltro('Todos');}}>
           <option value="Todos">Nivel: Todos</option>
           {nivelesDisponibles.map(n => <option key={n} value={n}>{n}</option>)}
         </select>
        )}

       {nivelFiltro !== 'Todos' && (
 <select className="p-4 rounded-2xl border bg-white text-sm font-bold w-full" value={grupoFiltro} onChange={e => setGrupoFiltro(e.target.value)}>
   <option value="Todos">Grupo: Todos</option>
   {students
    .filter(s => {
     // Mostramos los grupos que correspondan al turno activo para no saturar la lista
     return turnoFiltro === 'Todos' || (turnoFiltro === 'Mañana' ? s.groupMorning : s.groupAfternoon);
    })
    .flatMap(s => [s.groupMorning, s.groupAfternoon, s.laboralGroup].filter(Boolean))
    .filter((v, i, a) => a.indexOf(v) === i)
    .filter(g => {
      // Mantiene tu lógica existente de separar talleres y pedagógicos
      const isTaller = g.toUpperCase().includes('TALLER') || g.toUpperCase().includes('PRE TALLER') || g.toUpperCase().includes('PRETALLER');
      if (tipoInforme === 'laboral') return isTaller; 
      if (tipoInforme === 'pedagogico') return !isTaller; 
      return true;
    })
    .map(g => <option key={g} value={g}>{g}</option>)}
 </select>
)}
      </div>

      {/* CONDICIONAL: Solo mostrar alumnos si hay un grupo elegido o si están buscando por nombre */}
      {grupoFiltro === 'Todos' && !searchTerm ? (
        <div className="bg-white rounded-3xl shadow-sm border p-12 text-center border-dashed border-gray-300">
          <p className="text-gray-400 font-bold text-lg">Esperando selección de grupo...</p>
          <p className="text-gray-400 text-sm mt-2">Utilizá los filtros de arriba para empezar a editar.</p>
        </div>
      ) : (
        <>
          {/* CONTROL DE ACCIONES GRUPALES */}
          {grupoFiltro !== 'Todos' && filteredStudents.length > 0 && (
            <div className="space-y-3 mb-6">
              {/* BOTÓN IMPRESIÓN GRUPAL */}
              <button 
                onClick={() => {
                  let contenedor = document.getElementById('impresion-masiva');
                  if (!contenedor) {
                    contenedor = document.createElement('div');
                    contenedor.id = 'impresion-masiva';
                    document.body.appendChild(contenedor);
                  }
                  
                  const esMateriaEspecial = ['plastica', 'musica', 'musica_brenda', 'psicomotricidad', 'educacion_fisica'].includes(tipoInforme);
                  contenedor.className = esMateriaEspecial ? 'print:block compacto' : 'print:block con-aire';
                  
                  let htmlMasivo = '';
                  filteredStudents.forEach(s => {
                    const report = savedReports.find(r => r.studentId === s.id && r.tipoInforme === tipoInforme && r.grupo === grupoFiltro && r.periodo === periodoInforme);
                    if (report) {
                      htmlMasivo += generarHTMLImpresion(s, report);
                    }
                  });
                  
                  if (!htmlMasivo) {
                    alert("No hay informes guardados en este grupo para imprimir.");
                    return;
                  }

                  contenedor.innerHTML = htmlMasivo;
                  
                  setTimeout(() => {
                    window.print();
                  }, 500);
                }}
                className="w-full mt-4 bg-emerald-600 text-white p-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition"
              >
                <Printer size={20} /> Imprimir todos los informes del grupo ({
                  filteredStudents.filter(s => 
                    savedReports.some(r => r.studentId === s.id && r.tipoInforme === tipoInforme && r.grupo === grupoFiltro && r.periodo === periodoInforme)
                  ).length
                })
              </button>

              {/* BOTONES AUXILIARES GRUPALES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* BOTÓN IMPRESO */}
                <button
                  onClick={() => {
                    const reportesCargadosGrupo = filteredStudents
                      .map(s => `${s.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`)
                      .filter(id => savedReports.some(r => r.id === id));
                    
                    const todosImpresos = reportesCargadosGrupo.length > 0 && 
                      reportesCargadosGrupo.every(id => reportsImpresos.includes(id));
                      
                    handleAlternarImpresionGrupo(filteredStudents, todosImpresos);
                  }}
                  disabled={!filteredStudents.some(s => savedReports.some(r => r.id === `${s.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`))}
                  className={`w-full p-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all border-2 flex items-center justify-center gap-2 ${
                    filteredStudents.length > 0 && filteredStudents.map(s => `${s.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`).every(id => reportsImpresos.includes(id) || !savedReports.some(r => r.id === id)) && filteredStudents.some(s => savedReports.some(r => r.id === `${s.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`))
                      ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50'
                  }`}
                >
                  {filteredStudents.length > 0 && 
                   filteredStudents.map(s => `${s.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`).every(id => !savedReports.some(r => r.id === id) || reportsImpresos.includes(id))
                    ? '✅ Grupo Impreso (Desmarcar)' 
                    : '🖨️ Marcar grupo como IMPRESO'}
                </button>

                {/* BOTÓN DE CORREGIDO X EQUIPO TÉCNICO */}
                <button
                  onClick={() => {
                    const reportesCargadosGrupo = filteredStudents
                      .map(s => `${s.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`)
                      .filter(id => savedReports.some(r => r.id === id));
                    
                    const todosCorregidos = reportesCargadosGrupo.length > 0 && 
                      reportesCargadosGrupo.every(id => reportsCorregidos.includes(id));
                      
                    handleAlternarCorrecionGrupo(filteredStudents, todosCorregidos);
                  }}
                  disabled={!filteredStudents.some(s => savedReports.some(r => r.id === `${s.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`))}
                  className={`w-full p-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all border-2 flex items-center justify-center gap-2 ${
                    filteredStudents.length > 0 && filteredStudents.map(s => `${s.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`).every(id => reportsCorregidos.includes(id) || !savedReports.some(r => r.id === id)) && filteredStudents.some(s => savedReports.some(r => r.id === `${s.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`))
                      ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50'
                  }`}
                >
                  {filteredStudents.length > 0 && 
                   filteredStudents.map(s => `${s.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`).every(id => !savedReports.some(r => r.id === id) || reportsCorregidos.includes(id))
                    ? '⚖️ Corregido por ET (Desmarcar)' 
                    : '📝 Marcar grupo como CORREGIDO por ET'}
                </button>
              </div>
            </div>
          )}
          
          {/* LISTA DE ALUMNOS */}
          <div className="bg-white rounded-3xl shadow-sm border divide-y">
            {filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-medium">No se encontraron estudiantes para este filtro.</div>
            ) : (
              filteredStudents.map(s => {
                const rActual = savedReports.find(r => 
                  r.studentId === s.id && 
                  (r.tipoInforme === tipoInforme || (tipoInforme === 'musica' && r.tipoInforme === 'musica')) && 
                  r.grupo === grupoFiltro && 
                  r.periodo === periodoInforme
                );
                
                const yaImpreso = reportsImpresos.includes(`${s.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`);
                const yaCorregido = reportsCorregidos.includes(`${s.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`);

                return (
                  <div 
                    key={`${s.id}-${grupoFiltro}`} 
                    className={`p-5 flex justify-between items-center transition-colors ${
                      yaImpreso 
                        ? 'bg-blue-50/70 border-l-4 border-blue-500' 
                        : yaCorregido
                          ? 'bg-purple-50 border-l-4 border-purple-400'
                          : rActual 
                            ? 'bg-emerald-50' 
                            : 'hover:bg-violet-50/50'
                    }`}
                  >
                    <div>
                      <p className={`font-bold ${yaImpreso ? 'text-blue-900' : yaCorregido ? 'text-purple-900' : rActual ? 'text-emerald-900' : 'text-gray-900'}`}>
                        {s.lastName}, {s.firstName}
                      </p>
                      <p className={`text-[10px] font-bold uppercase ${yaImpreso ? 'text-blue-600' : yaCorregido ? 'text-purple-600' : rActual ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {s.level} | {yaImpreso ? 'Impreso' : rActual ? `Cargado (${periodoInforme})` : 'Pendiente'} {yaCorregido && ' | ⚖️ Corregido ET'}
                      </p>
                    </div>
                    
                    {grupoFiltro !== 'Todos' && (
                      <div className="flex items-center gap-2">
                        {rActual && (
                          <button 
                            onClick={() => {
                              let contenedor = document.getElementById('impresion-masiva');
                              if (!contenedor) {
                                contenedor = document.createElement('div');
                                contenedor.id = 'impresion-masiva';
                                document.body.appendChild(contenedor);
                              }
                              const esMateriaEspecial = ['plastica', 'musica', 'musica_brenda', 'psicomotricidad', 'educacion_fisica'].includes(tipoInforme);
                              contenedor.className = esMateriaEspecial ? 'print:block compacto' : 'print:block con-aire';
                              
                              contenedor.innerHTML = generarHTMLImpresion(s, rActual);
                              setTimeout(() => { window.print(); }, 500);
                            }} 
                            className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                            title="Imprimir informe individual"
                          >
                            <Printer size={16}/>
                          </button>
                        )}
                             <button 
                          onClick={() => handleEdit(s, rActual)} 
                          className={`p-2 rounded-lg transition-colors ${rActual ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-violet-600 text-white hover:bg-violet-700'}`}
                        >
                          {rActual ? <Edit3 size={16}/> : <Plus size={16}/>}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
   </div> {/* <=== ¡¡ESTE ES EL DIV QUE FALTABA!! Cierra la Vista Principal. */}


{/* ========================================================================= */}
    {/* MODAL DE ESTADÍSTICAS                                                     */}
    {/* ========================================================================= */}
    {showStatsModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-[30px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-6 bg-violet-800 text-white flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black flex items-center gap-2"><PieChart size={24} /> Progreso de Carga</h2>
              <p className="text-violet-200 text-sm">Informes del período: {periodoInforme}</p>
            </div>
            <button onClick={() => setShowStatsModal(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 overflow-y-auto space-y-6 bg-gray-50">
            {(() => {
              const listaAreas = [
                { id: 'pedagogico', label: 'Pedagógico' },
                { id: 'laboral', label: 'Laboral' },
                { id: 'psicomotricidad', label: 'Psicomotricidad' },
                { id: 'plastica', label: 'Plástica' },
                { id: 'musica', label: 'Música Fran' },
                { id: 'musica_brenda', label: 'Música Brenda' },
                { id: 'educacion_fisica', label: 'Ed. Física' }
              ];

              const filtradosPorPeriodo = savedReports.filter(r => r.periodo === periodoInforme);

              const desglosadoEstadisticas = listaAreas.map(area => {
                let expected = 0;
                let completed = 0;

                estudiantesSede.forEach(s => {
                  const lvl = s.level ? s.level.toUpperCase() : '';
                  let expects = false;
                  
                  const groups = [s.groupMorning, s.groupAfternoon, s.laboralGroup].filter(Boolean).map(g => g.toUpperCase());
                  const hasTaller = groups.some(g => g.includes('TALLER') || g.includes('PRE TALLER') || g.includes('PRETALLER'));
                  const hasPedagogico = groups.some(g => !g.includes('TALLER') && !g.includes('PRE TALLER') && !g.includes('PRETALLER'));

                  if (area.id === 'pedagogico' && hasPedagogico) expects = true;
                  if (area.id === 'laboral' && hasTaller) expects = true;
                  if (area.id === 'psicomotricidad') expects = true;
                  if (area.id === 'musica') expects = true;
                  if (area.id === 'musica_brenda') expects = true;
                  if (area.id === 'plastica' && lvl !== 'INICIAL') expects = true;
                  if (area.id === 'educacion_fisica' && lvl !== 'INICIAL' && !lvl.includes('1° CICLO')) expects = true;

                  if (expects) {
                    expected++;
                    if (filtradosPorPeriodo.some(r => r.studentId === s.id && r.tipoInforme === area.id)) {
                      completed++;
                    }
                  }
                });

                const percentage = expected === 0 ? 0 : Math.round((completed / expected) * 100);
                return { ...area, expected, completed, percentage };
              });

              const totalExpected = desglosadoEstadisticas.reduce((acc, curr) => acc + curr.expected, 0);
              const totalCompleted = desglosadoEstadisticas.reduce((acc, curr) => acc + curr.completed, 0);
              const totalPercentage = totalExpected === 0 ? 0 : Math.round((totalCompleted / totalExpected) * 100);

              const totalImpresos = filtradosPorPeriodo.filter(r => reportsImpresos.includes(r.id)).length;
              const impresosPercentage = totalCompleted === 0 ? 0 : Math.round((totalImpresos / totalCompleted) * 100);

              const totalCorregidos = filtradosPorPeriodo.filter(r => reportsCorregidos.includes(r.id)).length;
              const corregidosPercentage = totalCompleted === 0 ? 0 : Math.round((totalCorregidos / totalCompleted) * 100);

              return (
                <>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
                    <div className="text-center border-b pb-4">
                      <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Progreso Global Carga</p>
                      <div className="flex items-end justify-center gap-2 mb-2">
                        <span className="text-5xl font-black text-violet-700">{totalPercentage}%</span>
                        <span className="text-gray-400 font-medium pb-1">({totalCompleted} de {totalExpected})</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className="bg-violet-600 h-3 rounded-full transition-all duration-1000" style={{ width: `${totalPercentage}%` }}></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="text-center md:border-r md:pr-4">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Total Impreso / Listo</p>
                        <div className="flex items-end justify-center gap-1 mb-2">
                          <span className="text-3xl font-black text-blue-600">{impresosPercentage}%</span>
                          <span className="text-gray-400 text-xs font-bold pb-0.5">({totalImpresos} de {totalCompleted})</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${impresosPercentage}%` }}></div>
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Corregido por Eq. Técnico</p>
                        <div className="flex items-end justify-center gap-1 mb-2">
                          <span className="text-3xl font-black text-purple-600">{corregidosPercentage}%</span>
                          <span className="text-gray-400 text-xs font-bold pb-0.5">({totalCorregidos} de {totalCompleted})</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-purple-500 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${corregidosPercentage}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest px-2">Desglose por Área</h3>
                    {desglosadoEstadisticas.map(stat => (
                      <div key={stat.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-800">{stat.label}</span>
                          <span className="text-xs font-black px-2 py-1 bg-gray-100 rounded-md text-gray-600">
                            {stat.completed} / {stat.expected} listos
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className={`h-2.5 rounded-full transition-all duration-1000 ${stat.percentage === 100 ? 'bg-emerald-500' : stat.percentage > 40 ? 'bg-indigo-500' : 'bg-amber-500'}`} 
                              style={{ width: `${stat.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-black w-10 text-right text-gray-700">{stat.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    )}

    {/* ========================================================================= */}
    {/* INTERFAZ DE EDICIÓN EN PANTALLA (FORMULARIO)                              */}
    {/* ========================================================================= */}
    {stage === 'form' && selectedStudent && (
      <div className="bg-white p-8 rounded-[40px] shadow-lg border space-y-6 print:hidden animate-in fade-in">
        
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setStage('main')} className="bg-gray-100 p-3 rounded-full hover:bg-gray-200">
            <X size={20}/>
          </button>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <span>Guardado automático</span>
          </div>
        </div>
        
        <div className="bg-violet-50 p-6 rounded-3xl mb-6 border border-violet-100">
          <h3 className="font-black text-2xl text-violet-900">{selectedStudent.lastName}, {selectedStudent.firstName}</h3>
          <p className="text-sm font-bold text-violet-600 uppercase mb-4">GRUPO: {grupoFiltro} | INFORME: {tipoInforme} {periodoInforme}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase text-violet-800">Docente a cargo</label>
              <input type="text" className="w-full p-3 rounded-xl bg-white border border-violet-200 text-sm font-bold text-gray-700" value={docentePrint} onChange={e => setDocentePrint(e.target.value)} placeholder="Ej. Alejandra..." />
            </div>
            {!['plastica', 'musica', 'musica_brenda', 'psicomotricidad', 'educacion_fisica'].includes(tipoInforme) && (
              <div>
                <label className="text-[10px] font-black uppercase text-violet-800">Auxiliar / Preceptora</label>
                <input type="text" className="w-full p-3 rounded-xl bg-white border border-violet-200 text-sm font-bold text-gray-700" value={preceptoraPrint} onChange={e => setPreceptoraPrint(e.target.value)} placeholder="Ej. Andrea..." />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* BLOQUEOS DE SEGURIDAD SEGÚN NIVEL */}
         {((tipoInforme === 'plastica' && selectedStudent?.level?.toUpperCase() === 'INICIAL') || 
           
            (tipoInforme === 'musica_brenda' && !esNivelValidoBrenda)) ? (
            
            <div className="bg-amber-50 border border-amber-200 p-8 rounded-3xl text-center">
              <span className="text-4xl block mb-2">⚠️</span>
              <p className="text-amber-900 font-black text-lg">
                El nivel {selectedStudent?.level} no posee informe de {tipoInforme === 'musica_brenda' ? 'Música Brenda' : tipoInforme.replace('_', ' ')}.
              </p>
              <p className="text-amber-700 text-sm mt-1">Este espacio está habilitado exclusivamente para Inicial y 1° Ciclo.</p>
            </div>

          ) : (

            /* RENDERIZADO NORMAL DEL FORMULARIO */
            <>
              {/* 1. ESPACIO DE CONTENIDOS (SOLO PARA PLÁSTICA) */}
              {tipoInforme === 'plastica' && (
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mb-6">
                  <label className="text-xs font-black uppercase text-indigo-800 block mb-2">Contenidos Abordados</label>
                  <textarea 
                    className="w-full p-4 bg-white rounded-xl text-sm border border-indigo-200" 
                    placeholder="Ej: El espacio, aprovechamiento y utilización consciente del plano. El color..." 
                    value={contenidosPlastica} 
                    onChange={e => setContenidosPlastica(e.target.value)} 
                    rows={3}
                  />
                </div>
              )}

              {/* SELECTOR DE NIVEL PARA MÚSICA */}
              {tipoInforme === 'musica' && (
                <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mb-6 text-center">
                  <h3 className="text-sm font-black text-indigo-900 uppercase mb-4">Seleccione el Nivel de Música a evaluar</h3>
                  <div className="flex gap-4 max-w-md mx-auto">
                    <button 
                      onClick={() => setNivelMusica('Nivel 1')} 
                      className={`flex-1 p-4 rounded-xl font-black uppercase text-sm transition-all ${nivelMusica === 'Nivel 1' ? 'bg-violet-600 text-white shadow-md scale-105' : 'bg-white border-2 border-indigo-100 hover:border-violet-400 text-gray-600'}`}
                    >
                      Nivel 1
                    </button>
                    <button 
                      onClick={() => setNivelMusica('Nivel 2')} 
                      className={`flex-1 p-4 rounded-xl font-black uppercase text-sm transition-all ${nivelMusica === 'Nivel 2' ? 'bg-violet-600 text-white shadow-md scale-105' : 'bg-white border-2 border-indigo-100 hover:border-violet-400 text-gray-600'}`}
                    >
                      Nivel 2
                    </button>
                  </div>
                </div>
              )}

              {/* COMPORTAMIENTO FORMULARIO ACTIVO SEGÚN FILTRO DE MÚSICA */}
              {!(tipoInforme === 'musica' && !nivelMusica) ? (
                <>
                  {/* FUNDAMENTACIONES */}
                  {tipoInforme === 'musica' && (
                    <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 mb-6">
                      <h3 className="text-sm font-black text-indigo-900 uppercase mb-2">Fundamentación</h3>
                      <p className="text-xs text-indigo-800 font-medium leading-relaxed whitespace-pre-wrap">
                        El trabajo rítmico estructurado en formato de círculo favorece la eliminación de jerarquías, promueve el contacto visual continuo y estimula procesos de autorregulación, atención conjunta y empatía a través de la producción de un pulso compartido.
                      </p>
                    </div>
                  )}

                  {tipoInforme === 'musica_brenda' && (
                    <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 mb-6">
                      <h3 className="text-sm font-black text-indigo-900 uppercase mb-2">Fundamentación</h3>
                      <p className="text-xs text-indigo-800 font-medium leading-relaxed whitespace-pre-wrap">
                        La música cumple un papel fundamental en el desarrollo integral de los niños, ya que estimula el lenguaje, la creatividad y la atención. Favorece la expresión emocional, la sociabilidad y mejora la coordinación motriz. Es una herramienta que enriquece su desarrollo integral de manera lúdica significativa.
                      </p>
                    </div>
                  )}

                  {tipoInforme === 'psicomotricidad' && (
                    <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 mb-6">
                      <h3 className="text-sm font-black text-indigo-900 uppercase mb-2">Fundamentación</h3>
                      <p className="text-xs text-indigo-800 font-medium leading-relaxed whitespace-pre-wrap">
                        El espacio de Psicomotricidad ofrece propuestas que favorecen el desarrollo integral de los estudiantes a través del movimiento, el juego y la interacción con otros. Mediante experiencias adaptadas a las posibilidades e intereses de cada alumno, se promueve la exploración corporal, la participación activa, la comunicación y la construcción de recursos que contribuyen a una mayor autonomía en los distintos contextos cotidianos. Las actividades propuestas buscan acompañar el fortalecimiento de habilidades motrices, la organización de la acción, la adaptación a diferentes situaciones y el desarrollo de estrategias que favorezcan una participación cada vez más significativa dentro de las experiencias compartidas.
                      </p>
                    </div>
                  )}

                  {tipoInforme === 'educacion_fisica' && (
                    <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 mb-6">
                      <h3 className="text-sm font-black text-indigo-900 uppercase mb-2">Fundamentación</h3>
                      <p className="text-xs text-indigo-800 font-medium leading-relaxed whitespace-pre-wrap">
                        {['CFI', 'FINES'].includes(selectedStudent?.level?.toUpperCase()) ? 
                         "En este ciclo lectivo, la Educación Física se propone como un espacio de encuentro, disfrute y aprendizaje a través del cuerpo. Desde una mirada inclusiva, priorizamos el desarrollo de la autonomía, la confianza y las habilidades motrices de cada alumno, respetando sus tiempos y singularidades. A través del juego cooperativo y la introducción a los deportes adaptados, buscamos que la clase sea un lugar de participación plena para todos, donde las reglas y materiales se transforman para que la diversidad enriquezca la convivencia y el aprendizaje compartido." :
                         "En este ciclo lectivo, la Educación Física se propone como un espacio de encuentro, disfrute y aprendizaje a través del cuerpo. Desde una mirada inclusiva, priorizamos el desarrollo de la autonomía, la confianza y las habilidades motrices de cada alumno, respetando sus tiempos y singularidades. A través del juego cooperativo, buscamos que la clase sea un lugar de participación plena para todos, donde las reglas y materiales se transforman para que la diversidad enriquezca la convivencia y el aprendizaje compartido."
                        }
                      </p>
                    </div>
                  )}

                  {/* 2. RÚBRICA DE INDICADORES (PARA TODOS) */}
                  {indicadoresActuales.map(c => (
                    <div key={c.id} className="space-y-2 mb-4 p-4 bg-gray-50 rounded-2xl">
                      <label className="text-xs font-black uppercase text-gray-700">{c.label}</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {c.options.map(opt => {
                          const isSelected = answers[c.id] === opt;
                          return (
                            <button 
                              key={opt} 
                              onClick={() => setAnswers(p => ({...p, [c.id]: opt}))} 
                              className={"p-3 rounded-xl font-bold text-[10px] uppercase border-2 text-center transition-all " + (isSelected ? "bg-violet-600 text-white border-violet-700 shadow-md" : "bg-white border-gray-200 hover:border-violet-300")}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {/* Campo personalizado para áreas pedagógica y laboral */}
                      {!['plastica', 'musica', 'musica_brenda', 'psicomotricidad', 'educacion_fisica'].includes(tipoInforme) && (
                        <div className="mt-3/2">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">O escribir una opción personalizada:</label>
                          <textarea
                            className="w-full p-3 bg-white rounded-xl text-xs border border-gray-200 font-medium text-gray-700 placeholder-gray-400"
                            placeholder="Escribí acá un texto a medida para este indicador..."
                            value={answers[c.id] || ''}
                            onChange={e => setAnswers(p => ({...p, [c.id]: e.target.value}))}
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 3. ESPACIO DE OBSERVACIONES (MATERIAS ESPECIALES) */}
                  {tipoInforme === 'plastica' && (
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mt-6">
                      <label className="text-xs font-black uppercase text-indigo-800 block mb-2">Observaciones del período</label>
                      <textarea className="w-full p-4 bg-white rounded-xl text-sm border border-indigo-200" value={observacionesPlastica} onChange={e => setObservacionesPlastica(e.target.value)} rows={4} />
                    </div>
                  )}
                  {tipoInforme === 'psicomotricidad' && (
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mt-6">
                      <label className="text-xs font-black uppercase text-indigo-800 block mb-2">Observaciones del período</label>
                      <textarea className="w-full p-4 bg-white rounded-xl text-sm border border-indigo-200" value={observacionesPsicomotricidad} onChange={e => setObservacionesPsicomotricidad(e.target.value)} rows={4} />
                    </div>
                  )}
                  {(tipoInforme === 'musica' || tipoInforme === 'musica_brenda') && (
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mt-6">
                      <label className="text-xs font-black uppercase text-indigo-800 block mb-2">Observaciones del período</label>
                      <textarea 
                        className="w-full p-4 bg-white rounded-xl text-sm border border-indigo-200" 
                        placeholder="Escriba aquí las observaciones finales de música (opcional)..." 
                        value={observacionesMusica} 
                        onChange={e => setObservacionesMusica(e.target.value)} 
                        rows={4}
                      />
                    </div>
                  )}
                  {tipoInforme === 'educacion_fisica' && (
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mt-6">
                      <label className="text-xs font-black uppercase text-indigo-800 block mb-2">Observaciones del período</label>
                      <textarea className="w-full p-4 bg-white rounded-xl text-sm border border-indigo-200" value={observacionesEducacionFisica} onChange={e => setObservacionesEducacionFisica(e.target.value)} rows={4} />
                    </div>
                  )}

                  {/* 4. OBJETIVOS Y OBS. CUATRIMESTRE 1 (OCULTOS EN MATERIAS ESPECIALES) */}
                  {!['plastica', 'musica', 'musica_brenda', 'psicomotricidad', 'educacion_fisica'].includes(tipoInforme) && (
                    <div className="mt-8 space-y-4">
                      <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100">
                        <label className="text-xs font-black uppercase text-violet-800 block mb-2">Observaciones sobre los objetivos planteados para el primer semestre</label>
                        <textarea className="w-full p-4 bg-white rounded-xl text-sm border border-violet-200" placeholder="Escriba aquí las observaciones..." value={obsCuatrimestre1} onChange={e => setObsCuatrimestre1(e.target.value)} rows={4} />
                      </div>
                      <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100 space-y-4">
                        <h3 className="text-sm font-black uppercase text-violet-900 border-b border-violet-200 pb-2">Objetivos para el segundo semestre</h3>
                        <div>
                          <label className="text-xs font-black uppercase text-violet-800 block mb-2">Objetivo Conductual</label>
                          <textarea className="w-full p-4 bg-white rounded-xl text-sm border border-violet-200" value={objConductual} onChange={e => setObjConductual(e.target.value)} rows={2} />
                        </div>
                        <div>
                          <label className="text-xs font-black uppercase text-violet-800 block mb-2">Objetivo Pedagógico</label>
                          <textarea className="w-full p-4 bg-white rounded-xl text-sm border border-violet-200" value={objPedagogico} onChange={e => setObjPedagogico(e.target.value)} rows={2} />
                        </div>
                        <div>
                          <label className="text-xs font-black uppercase text-violet-800 block mb-2">Objetivo Socioafectivo</label>
                          <textarea className="w-full p-4 bg-white rounded-xl text-sm border border-violet-200" value={objSocioafectivo} onChange={e => setObjSocioafectivo(e.target.value)} rows={2} />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-3xl mb-8">
                  👆 Por favor, seleccioná Nivel 1 o Nivel 2 arriba para desplegar la rúbrica correspondiente.
                </div>
              )}
            </>
          )}
        </div>

        {/* BOTÓN GENERAL DE GUARDADO AL FINAL DEL FORMULARIO */}
        <button onClick={handleSaveInforme} disabled={isSaving} className="w-full py-4 mt-6 bg-violet-800 hover:bg-violet-900 text-white font-black rounded-2xl transition-colors">
          {isSaving ? 'Guardando...' : 'Guardar Informe'}
        </button>

        {/* DOCUMENTO DE IMPRESIÓN OCULTO DENTRO DEL MISMO STAGE PARA EVITAR ERRORES */}
        <div id="informe-imprimir" className="hidden">
          {selectedStudent && (() => {
            const currentReport = savedReports.find(r => 
              r.studentId === selectedStudent.id && 
              r.tipoInforme === tipoInforme && 
              r.grupo === grupoFiltro && 
              r.periodo === periodoInforme
            );

            return (
              <div className="pagina w-full bg-white text-black font-sans pb-4">
                <div className="flex flex-col items-center justify-center border-b-2 border-violet-800 pb-4 mb-5 bg-violet-50 p-6 rounded-t-xl">
                  <img src="${getCachedAppConfig().logoUrl || '/icon-192.png'}" alt="Logo Institucional" className="h-16 object-contain mb-3" />
                  <h1 className="text-2xl font-black uppercase tracking-widest text-violet-900 mb-1">INFORME {periodoInforme.toUpperCase()} 2026</h1>
                  <p className="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 bg-white px-3 py-0.5 rounded-full border border-violet-200 shadow-sm">
                    Área: {tipoInforme === 'musica' ? 'Música (Francisco Jaime)' : tipoInforme === 'musica_brenda' ? 'Música (Brenda Celiz)' : tipoInforme}
                  </p>
                </div>
                
                <div className="border border-violet-200 rounded-xl p-5 mb-3 bg-white shadow-sm" style={{ breakInside: 'avoid' }}>
                  <h2 className="text-sm font-black text-violet-900 uppercase border-b border-violet-100 pb-1 mb-3">Datos del Estudiante</h2>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
                    <p><strong className="font-black text-gray-900">Alumno/a:</strong> <span className="text-gray-700">{selectedStudent.lastName}, {selectedStudent.firstName}</span></p>
                    <p><strong className="font-black text-gray-900">DNI:</strong> <span className="text-gray-700">{selectedStudent.dni || '....................................'}</span></p>
                    <p><strong className="font-black text-gray-900">Fecha de Nac.:</strong> <span className="text-gray-700">{selectedStudent.birthDate || selectedStudent.fechaNac || '....................................'}</span></p>
                    <p><strong className="font-black text-gray-900">Grupo:</strong> <span className="text-gray-700 font-bold">{grupoFiltro}</span></p>
                    <p>
                      <strong className="font-black text-gray-900">Docente a cargo:</strong>{" "}
                      <span className="text-gray-700">{docentePrint || currentReport?.docente || selectedStudent.teacher || '....................................'}</span>
                    </p>
                    {!['plastica', 'musica', 'musica_brenda', 'psicomotricidad', 'educacion_fisica'].includes(tipoInforme) && (
                      <p>
                        <strong className="font-black text-gray-900">Auxiliar/Preceptora:</strong>{" "}
                        <span className="text-gray-700">{preceptoraPrint || currentReport?.auxiliar || selectedStudent.auxiliary || '....................................'}</span>
                      </p>
                    )}
                    <p className="col-span-2"><strong className="font-black text-gray-900">Año de cursada:</strong> <span className="text-gray-700">2026</span></p>
                  </div>
                </div>

                <div className="mb-3">
                  <h2 className="text-sm font-black text-white bg-violet-800 uppercase px-4 py-1.5 rounded-md mb-2 shadow-sm inline-block" style={{ breakInside: 'avoid' }}>
                    Desarrollo {tipoInforme === 'musica' || tipoInforme === 'musica_brenda' ? 'Música' : tipoInforme}
                  </h2>
                  
                  {['plastica', 'musica', 'musica_brenda', 'psicomotricidad', 'educacion_fisica'].includes(tipoInforme) ? (
                    <table className="w-full text-left border-collapse mt-4 text-[11px] mb-6" style={{ breakInside: 'avoid' }}>
                      <thead>
                        <tr className="bg-violet-100 text-violet-900">
                          <th className="border border-violet-200 p-2 font-black uppercase">Objetivos / Indicadores</th>
                          <th className="border border-violet-200 p-2 font-black uppercase text-center w-20 leading-tight">Realiza con<br/>autonomía</th>
                          <th className="border border-violet-200 p-2 font-black uppercase text-center w-20 leading-tight">Realiza con<br/>apoyo</th>
                          <th className="border border-violet-200 p-2 font-black uppercase text-center w-20 leading-tight">En<br/>proceso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {indicadoresActuales.map(c => {
                          const answer = answers[c.id];
                          if (!answer) return null;
                          return (
                            <tr key={c.id}>
                              <td className="border border-violet-200 p-2 font-medium text-gray-800">{c.label}</td>
                              <td className="border border-violet-200 p-2 font-black text-center text-violet-800 text-sm">{answer === c.options[0] ? 'X' : ''}</td>
                              <td className="border border-violet-200 p-2 font-black text-center text-violet-800 text-sm">{answer === c.options[1] ? 'X' : ''}</td>
                              <td className="border border-violet-200 p-2 font-black text-center text-violet-800 text-sm">{answer === c.options[2] ? 'X' : ''}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="space-y-4 border-l-2 border-violet-200 ml-1 pl-4">
                      {indicadoresActuales.map(c => {
                        const answer = answers[c.id];
                        if (!answer) return null; 
                        const optionIndex = c.options.indexOf(answer);
                        let textoDescriptivo = optionIndex !== -1 ? formatearTextoImpresion(c.id, optionIndex, answer, selectedStudent?.firstName) : answer;
                        if (!textoDescriptivo) return null;
                        return (
                          <div key={c.id} className="text-xs flex flex-col mb-2 pb-3 border-b border-gray-100 last:border-0" style={{ breakInside: 'avoid' }}>
                            <span className="font-black text-violet-900 uppercase text-[10px] tracking-widest mb-1">{c.label}</span>
                            <span className="text-gray-800 leading-relaxed font-medium text-[11px]">{textoDescriptivo}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-4 flex flex-col items-center justify-center border-t border-dashed border-gray-200" style={{ breakInside: 'avoid' }}>
                  <img src={getCachedAppConfig().logoUrl || '/icon-192.png'} alt="Sello Institucional" className="max-w-[500px] w-full object-contain mb-6 text-center" />
                  <div className="w-full flex justify-between px-12 mt-12 relative">
                    <div className="flex flex-col items-center w-48 relative">
                      {FIRMAS_AREAS[tipoInforme] && (
                        <div className="absolute bottom-6 flex justify-center items-center w-full pointer-events-none">
                          <img src={FIRMAS_AREAS[tipoInforme]} alt="Firma Docente" className="h-14 object-contain" />
                        </div>
                      )}
                      <div className="w-full border-t-2 border-black mb-2"></div>
                      <span className="text-[10px] font-black uppercase text-gray-900">Firma de Docente</span>
                    </div>
                    <div className="flex flex-col items-center w-48">
                      <div className="w-full border-t-2 border-black mb-2"></div>
                      <span className="text-[10px] font-black uppercase text-gray-900">Firma de Familia</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    )}
  </div>
 );
}
