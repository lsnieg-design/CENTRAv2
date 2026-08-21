import { getInstitutionName, getCachedAppConfig } from '../config';
import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, CheckSquare, Settings, User, FileText, CheckCircle, 
  Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, 
  Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Camera, MapPin, 
  Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, Zap,
  AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, 
  Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Trophy,
  Folder, MessageSquare, Globe, BookOpen, Lightbulb, ChevronDown, PlusCircle, Printer,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Phone, CheckCircle2, Clock3, UserCheck,
  ChevronUp
} from 'lucide-react';

import { 
  collection, query, orderBy, onSnapshot, doc, 
  updateDoc, addDoc, deleteDoc, serverTimestamp, 
  arrayUnion, arrayRemove, getDocs 
} from 'firebase/firestore';

// -------------------------------------------------------------
// DICCIONARIOS E INDICADORES (MANTENER INTACTOS)
// -------------------------------------------------------------
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
      { id: 'pedido_ayuda', label: 'Pedido de ayuda', options: ['Ante la dificultad, se bloquea y espera la intervención externa.', 'Solicita ayuda mediante mediación o sugerencia del docente.', 'Identifica cuando necesita ayuda y la solicita ante la duda.', 'Es proactivo; ante un obstáculo busca soluciones antes de pedir ayuda.'] },
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
    `Nombre se encuentra en la etapa presilábica, explorando la escritura a través de dibujos y trazos sin valor sonoro convencional. Este proceso exploratorio constituye la base inicial para la futura adquisición del sistema de escritura, permitiendo la familiarización con las herramientas gráficas y la direccionalidad del trazo. En esta etapa, el alumno está aprendiendo a usar el lápiz y a entender que lo que dibuja o marca puede representar ideas, aunque todavía no use letras.`,
    `Nombre se encuentra en la etapa silábica. En sus producciones, comienza a asignar valor sonoro a las letras, utilizando principalmente las vocales para representar sílabas. Esto evidencia el inicio de la correspondencia fonema-grafema, estableciendo una relación directa entre la pauta sonora de la palabra y su representación escrita. Es decir, ya empieza a entender que los sonidos de las palabras se pueden escribir con letras.`,
    `Nombre se encuentra en la etapa silábico-alfabética de transición. Sus producciones combinan sílabas completas con letras aisladas, evidenciando un análisis progresivo y más detallado de la composición interna de las palabras, superando la correspondencia estricta de una grafía por sílaba. Esto significa que está dejando atrás la etapa anterior y empezando a armar palabras más completas, analizando mejor cómo suenan.`,
    `Nombre se encuentra en la etapa alfabética, escribiendo de manera autónoma. Representa los fonemas con coherencia y sentido, produciendo textos comprensibles y evidenciando una apropiación funcional del sistema de escritura que le permite estructurar mensajes claros y de mayor complejidad sintáctica. Ya puede escribir solo/a y sus textos se entienden perfectamente porque usa las letras adecuadas para cada sonido.`
  ],
  escritura: [
    `Nombre requiere guía física constante (modalidad mano-sobre-mano) para la realización de grafismos y el manejo de los útiles. El acompañamiento docente se centra en guiar el movimiento motor para favorecer el desarrollo visomotor, la prensión adecuada y la seguridad en el trazado continuo. Lo acompañamos físicamente para que gane confianza y seguridad al mover la mano en el papel.`,
    `Nombre escribe mediante copia fiel del pizarrón o dictado fonético sencillo, requiriendo apoyo directo. La intervención del adulto permite orientar la atención en la tarea, organizar adecuadamente el espacio gráfico en la hoja y despejar dudas fonológicas durante la producción del texto. Lo ayudamos a ordenar su hoja y a revisar qué letras usar para escribir lo que quiere decir.`,
    `Nombre escribe frases cortas mediante dictado fonético bajo supervisión frecuente. El acompañamiento docente asiste en la estructuración lógica de la oración, la segmentación léxica (separación de palabras) y la resolución de dudas fonológicas u ortográficas específicas. Lo asistimos para que separe las palabras y para que sus oraciones sean claras y organizadas.`,
    `Nombre escribe de forma autónoma, produciendo textos con sentido completo. Organiza el lenguaje escrito adecuadamente para transmitir mensajes claros, estructurando sus ideas con coherencia y cohesión, sin requerir de intervención directa ni supervisión organizativa. Ya puede escribir solo/a, organizando sus propias ideas sin que necesitemos ayudarlo/a paso a paso.`
  ],
  comprension: [
    `Nombre no logra aún atribuir significado al texto escrito, limitándose a la identificación y descripción de imágenes. Las intervenciones actuales se centran en favorecer el acercamiento progresivo al formato material de los textos y a las letras como elementos portadores de sentido y narratividad. Por ahora se guía por los dibujos; estamos trabajando para que vea que las letras también tienen un mensaje.`,
    `Nombre comprende textos breves y sencillos a través de la dinámica de lectura compartida o mediada por el docente. Esta intervención externa facilita el análisis del relato, la anticipación de secuencias y la construcción conjunta de significados a partir del material de lectura presentado. Leemos juntos para que él/ella pueda seguir la historia y entenderla mejor.`,
    `Nombre comprende el sentido global de textos breves de manera guiada. Logra identificar la idea principal, secuenciar hechos y extraer la información más relevante contando con la orientación del docente mediante preguntas focalizadas que guían su interpretación. Lo guiamos con preguntas clave para que identifique lo más importante de lo que leyó.`,
    `Nombre realiza una lectura autónoma fluida y comprende el sentido global de textos diversos. Extrae ideas principales, realiza inferencias e interpreta funcionalmente los materiales escritos, logrando procesar la información de manera eficiente sin requerir mediación del adulto. Ya puede leer solo/a y entender el mensaje sin ayuda.`
  ],
  reconocimiento: [
    `Nombre identifica visualmente su propio nombre de manera global entre otras palabras escritas. Las intervenciones pedagógicas actuales apuntan a utilizar esta base significativa para ampliar progresivamente el reconocimiento de nuevas letras y palabras frecuentes del entorno áulico. Su nombre es su primer referente para empezar a reconocer otras palabras en el salón.`,
    `Nombre reconoce su nombre propio y el de sus pares con facilidad y rapidez visual. Logra identificar globalmente palabras significativas y recurrentes dentro del contexto de su grupo de pertenencia, utilizándolas como referentes para futuras producciones escritas. Ya identifica los nombres de sus amigos y eso le sirve de guía para leer y escribir otras cosas.`,
    `Nombre reconoce palabras de uso frecuente y frases cortas de manera autónoma. Identifica conceptos habituales en el entorno áulico y de cartelería, logrando conectar de manera funcional la decodificación del texto con situaciones prácticas y cotidianas. Ya puede leer palabras de los carteles del aula y relacionarlas con su día a día.`,
    `Nombre lee palabras y frases con sentido completo de forma autónoma y fluida. Interpreta los mensajes escritos dándoles un significado real en su contexto de uso, demostrando una consolidación de la vía léxica que le permite acceder al significado sin requerir de asistencia externa. Ya interpreta mensajes escritos por cuenta propia sin ayuda.`
  ],
  serie_numerica: [
    `Nombre realiza el conteo numérico hasta el 10 utilizando apoyo con material concreto. El uso de elementos tangibles facilita la correspondencia término a término, la visualización de la secuencia y la cuantificación durante la resolución de consignas matemáticas iniciales. Contar objetos físicos le permite entender mejor qué significa cada número.`,
    `Nombre realiza el conteo numérico secuenciado hasta el 20 y reconoce la representación escrita de estos números en contextos cotidianos. El trabajo áulico actual se orienta a la consolidación progresiva de este rango numérico y al afianzamiento del recitado oral sin omisiones. Está practicando el recitado y el reconocimiento de los números que ve en su vida diaria.`,
    `Nombre maneja series numéricas amplias y reconoce la estructura y regularidades de las familias de números. Se desenvuelve con soltura al trabajar con cantidades de mayor magnitud, logrando establecer relaciones de anterior, posterior y ordenamientos funcionales. Ya cuenta y ordena cantidades grandes con mayor seguridad y soltura.`,
    `Nombre domina series numéricas complejas con total autonomía. Comprende de forma independiente la lógica posicional del sistema decimal, lo que le permite operar y organizar números de gran magnitud de forma precisa, ágil y sistemática. Ya entiende cómo se forman los números grandes y los usa con total independencia.`
  ],
  operaciones: [
    `Nombre identifica cantidades en diversas situaciones prácticas, aunque no realiza operaciones matemáticas formales o escritas. El enfoque de trabajo aborda el reconocimiento perceptual de los números y el establecimiento de relaciones de equivalencia simples con cantidades reales manipulables. Trabajamos para que relacione los números con lo que significan en cantidad.`,
    `Nombre resuelve operaciones de sumas y restas simples utilizando material didáctico de apoyo. El uso de elementos concretos facilita la visualización espacial de la operación (agregar o quitar) y permite una comprensión inicial de la lógica procedimental del cálculo. Usar objetos le ayuda a ver cómo se agregan o quitan elementos al calcular.`,
    `Nombre resuelve sumas y restas de mayor complejidad requiriendo únicamente apoyo o revisión esporádica. Evidencia capacidad de análisis en la ejecución del algoritmo matemático, necesitando orientación mínima para verificar los resultados o despejar dudas puntuales. Ya tiene confianza para calcular y solo nos consulta para confirmar si el resultado está bien.`,
    `Nombre resuelve problemas cotidianos mediante el uso de operaciones complejas de manera totalmente autónoma. Aplica las herramientas matemáticas adquiridas para el planteo lógico, la selección del cálculo pertinente y la resolución eficaz de situaciones problemáticas de la vida diaria. Ya sabe usar la matemática para resolver problemas reales sin ayuda.`
  ],
  figuras: [
    `Nombre identifica visualmente figuras geométricas básicas, requiriendo mediación directa para proceder a su clasificación u ordenamiento. Las propuestas se centran en el entrenamiento perceptivo visual para reconocer atributos básicos, contornos, y establecer diferencias notorias. Trabajamos para que note las diferencias entre formas o colores.`,
    `Nombre clasifica elementos aplicando criterios de forma, tamaño o color, contando con la supervisión y validación del docente. Demuestra capacidad para agrupar, seriar y organizar objetos a partir de propiedades específicas de manera sistemática y estructurada. Ya puede ordenar objetos siguiendo una pauta clara que le damos.`,
    `Nombre resuelve problemas simples vinculados a la lógica matemática y la comparación de elementos. Analiza las situaciones presentadas, reconoce los datos útiles y aplica estrategias pertinentes para alcanzar resoluciones funcionales de forma progresivamente más independiente. Ya sabe comparar objetos y resolver situaciones lógicas sencillas solo/a.`,
    `Nombre resuelve situaciones y problemas de lógica de alta complejidad de forma autónoma. Aborda los desafíos identificando múltiples variables intervinientes y desarrollando procedimientos de resolución ordenados, evidenciando un alto grado de pensamiento crítico y abstracto. Tiene gran capacidad para pensar cómo solucionar problemas difíciles sin ayuda externa.`
  ],
  rutinas: [
    `Nombre requiere asistencia total y acompañamiento directo, continuo y paso a paso durante las rutinas escolares, de higiene y de cuidado personal. Se le provee de sostén físico y verbal, junto con anticipación estructurada, para garantizar su desenvolvimiento seguro en la dinámica diaria. Lo ayudamos en todo momento para que se sienta seguro/a en sus actividades.`,
    `Nombre realiza las rutinas básicas con supervisión constante y apoyo puntual de un adulto en momentos de transición. Logra ejecutar los pasos necesarios para su cuidado personal guiado por indicaciones externas secuenciadas que le permiten ordenar y sistematizar su accionar. Ya conoce los pasos de la rutina, pero le recordamos qué sigue después.`,
    `Nombre desarrolla las rutinas diarias institucionales con una supervisión mínima y de carácter esporádico. Evidencia una consolidación en su capacidad de organización temporal y niveles de autogestión progresivos y estables en la realización de sus tareas de cuidado e higiene. Es mucho más independiente y solo nos necesita para verificar que terminó bien.`,
    `Nombre se desenvuelve de forma totalmente autónoma y segura en la ejecución de sus rutinas escolares y pautas de cuidado personal. Gestionan de manera independiente sus tiempos, tareas y necesidades durante la jornada, sin requerir mediación del equipo de apoyo y supervisión. Hace todo solo/a sin que tengamos que estar presentes.`
  ],
  organizacion: [
    `Nombre requiere que un adulto estructure y organice permanentemente sus materiales de trabajo y el espacio físico. La intervención externa le brinda el encuadre organizativo necesario y exclusivo previo al inicio y durante el desarrollo de las diversas propuestas áulicas. Necesita que organicemos todo para que pueda empezar a trabajar.`,
    `Nombre organiza sus materiales de trabajo contando con el recordatorio explícito y la supervisión del docente. El estudiante inicia la consolidación del hábito de preparación y orden de los elementos requeridos a través de la mediación verbal y el soporte visual constante. Ya sabe que debe preparar sus útiles si se lo recordamos antes de empezar.`,
    `Nombre mantiene sus materiales y elementos de trabajo organizados de forma independiente a lo largo de la jornada escolar. Evidencia un manejo funcional de su propio espacio y un registro adecuado de sus pertenencias personales e institucionales. Ya incorporó el hábito de orden y mantiene sus cosas organizadas solo/a.`,
    `Nombre anticipa y organiza proactivamente todos los materiales necesarios antes de iniciar la actividad escolar asignada. Planifica de forma autónoma la disposición del espacio de trabajo y selecciona los recursos pertinentes, optimizando su desenvolvimiento integral en la tarea. Es muy responsable y se prepara solo/a sin que tengamos que decirle nada.`
  ],
  pedido_ayuda: [
    `Nombre tiende a presentar bloqueos conductuales o cognitivos ante la dificultad de una consigna, requiriendo intervención externa, directa e inmediata para destrabar la situación. Se implementan estrategias de sostén constante para favorecer la tolerancia a la frustración y la continuidad de la propuesta. Se queda paralizado ante dificultades y nos necesita para continuar.`,
    `Nombre solicita ayuda frente a los obstáculos operativos apoyándose en la mediación o sugerencia del docente a cargo. Logra identificar la situación desafiante y busca de manera activa el soporte, la guía o la explicación necesaria para poder avanzar en la resolución de la actividad. Identifica cuando algo no le sale y nos busca para que lo guiemos.`,
    `Nombre identifica con claridad en qué momento de la tarea requiere apoyo y toma la iniciativa de solicitar asistencia pertinente ante la duda. Reconoce los límites de la propia resolución y utiliza el intercambio pedagógico con el docente como herramienta compensatoria de manera totalmente funcional. Sabe cuándo necesita ayuda y nos pregunta para seguir avanzando.`,
    `Nombre se muestra proactivo ante los obstáculos cognitivos o procedimentales, intentando implementar soluciones y estrategias de ensayo y error propias de manera independiente. Evalúa alternativas y desarrolla herramientas propias antes de recurrir a la ayuda externa o a la guía docente directa. Intenta resolverlo solo/a y nos consulta si no encuentra la salida.`
  ],
  vinculo_pares: [
    `Nombre presenta una modalidad de juego y participación predominantemente paralela o solitaria, centrada en sus propios intereses. Las intervenciones docentes apuntan a propiciar acercamientos graduales, mediados y estructurados para fomentar el inicio del vínculo social y el reconocimiento de sus pares. Juega solo/a o al lado de otros, así que lo acercamos de a poco al grupo.`,
    `Nombre interactúa con sus compañeros de manera funcional, fundamentalmente en el marco de propuestas lúdicas o pedagógicas guiadas e iniciadas por el adulto, logrando sostener intercambios positivos y ajustados al contexto en dinámicas pautadas, grupales y bajo supervisión. Juega con otros si nosotros intervenimos para que la comunicación fluya.`,
    `Nombre se integra de manera espontánea y activa a dinámicas de juego cooperativo y propuestas de trabajo grupal con sus pares. Logra compartir el espacio, negociar el uso de los materiales y sostener la interacción de forma armónica sin requerir de intervención ni mediación adulta constante. Se suma solo/a a los juegos y disfruta compartir con sus amigos.`,
    `Nombre se posiciona desde un rol activo y propositivo, generando dinámicas y liderando actividades conjuntas de manera funcional. Evidencia capacidad organizativa, habilidades sociales asertivas para incentivar la participación conjunta y aptitud sostenida para coordinar acciones dentro del grupo de pares. Ayuda a organizar juegos y a integrar a sus amigos.`
  ],
  vinculo_adulto: [
    `Nombre presenta dependencia total del adulto para iniciar, sostener y finalizar cualquier tipo de tarea escolar. Requiere de contención afectiva, guía externa constante y señalamientos continuos y direccionales para poder desenvolverse con seguridad en el abanico de las propuestas áulicas. Nos necesita siempre cerca para poder hacer sus tareas.`,
    `Nombre busca el apoyo y la validación constante de las figuras docentes. Requiere de aprobación verbal o supervisión externa frecuente durante el desarrollo del proceso de aprendizaje para reasegurar sus acciones, validar sus producciones y afianzar su desenvolvimiento en el aula. Necesita saber que estamos cerca para sentirse seguro/a.`,
    `Nombre evidencia autonomía sostenida en la resolución de sus actividades habituales. Recurre a las figuras docentes de manera puntual frente a dudas concretas de la tarea asignada o cuando se presentan situaciones novedades, imprevistas o que le resultan altamente desafiantes. Trabaja solo/a y solo nos busca si tiene una duda difícil.`,
    `Nombre establece un vínculo saludable, asimétrico y de referencia funcional con el equipo docente. Actúa con total seguridad, organizándose y resolviendo demandas u obstáculos de forma independiente dentro del encuadre normativo y la dinámica de trabajo estructurada por la institución. Confía en nosotros, pero hace sus tareas de forma independiente sin depender de nuestra ayuda.`
  ],
  emocional: [
    `Nombre reacciona con impulsividad o exteriorizaciones físicas ante situaciones de frustración, exigencia o malestar agudo. El abordaje actual provee estrategias externas de contención, tiempos de pausa y regulación emocional asistida ante las instancias de desborde conductual o tensión. Expresa su frustración físicamente y lo ayudamos a calmarse para contar qué le pasa.`,
    `Nombre logra expresar la causa de su malestar de forma verbal a través de la mediación directa del adulto referente. Requiere de asistencia, andamiaje e interrogación guiada para canalizar sus emociones incipientes y comunicar de manera más adaptativa lo que experimenta internamente. Nos cuenta qué le molesta si lo ayudamos a ponerlo en palabras.`,
    `Nombre reconoce y expresa sus sentimientos, necesidades e incomodidades de manera verbal, clara y asertiva. Identifica sus estados emocionales primarios y logra comunicarlos al entorno general de forma funcional, operando sin requerir asistencia externa o interpretación de terceros. Sabe expresar qué le gusta y qué le molesta sin que tengamos que ayudarlo/a.`,
    `Nombre posee adecuadas y consolidadas capacidades de autorregulación psíquica. Identifica sus propios estados de ánimo y gestiona sus emociones de manera constructiva, equilibrada y autónoma ante las frustraciones, las contingencias operativas y las exigencias propias del contexto escolar. Gestiona sus emociones solo/a y sabe cómo calmarse.`
  ],
  pautas: [
    `Nombre presenta marcadas dificultades para el seguimiento autónomo de las pautas grupales de convivencia y el respeto de los turnos de habla. Las intervenciones se dirigen a fomentar de forma reiterada, constante y directiva la internalización progresiva de las normativas básicas del espacio. Estamos trabajando para que entienda que debe esperar su turno y escuchar.`,
    `Nombre respeta las normas de convivencia y el sostenimiento de los turnos de intercambio social, siempre que cuenta de manera contextual con el recordatorio explícito, el anticipo visual o el señalamiento normativo frecuente por parte del docente a cargo de la dinámica. Sigue las reglas si le recordamos seguido qué debe hacer.`,
    `Nombre respeta las pautas operativas de trabajo, los tiempos de espera grupales y los turnos de habla con requerimientos de intervenciones o señalamientos externos mínimos. Demuestra un registro adecuado del encuadre pedagógico y de la necesidad organizativa de la dinámica compartida. Participa bien en el grupo y respeta las reglas con muy poca ayuda.`,
    `Nombre respeta los turnos, horarios institucionales y acuerdos de convivencia preestablecidos de forma completamente autónoma. Adecúa su conducta motora y verbal a las normativas, rutinas de trabajo y exigencias generales del espacio áulico sin requerir ningún tipo de monitoreo continuo. Sigue las reglas solo/a sin que tengamos que decirle nada.`
  ],
  escucha: [
    `Nombre suele mostrarse desconectado/a o disperso/a frente a las consignas impartidas a nivel general en el aula. Se implementan apoyos visuales y directivas individualizadas de cercanía para lograr captar su atención, focalizar su percepción e integrarlo/a operativamente en el inicio de la propuesta. Está disperso/a y buscamos captar su interés para que atienda a lo que hacemos.`,
    `Nombre responde al requerimiento de escucha activa únicamente cuando el docente se aproxima físicamente y lo/la interpela de manera individual y sostenida durante el desarrollo de la actividad, requiriendo este anclaje interpersonal para decodificar operativamente la demanda solicitada. Nos atiende si le hablamos directamente, pero no si la consigna es para todo el grupo.`,
    `Nombre evidencia participación activa y adecuados niveles de atención sostenida en instancias de escucha de relatos grupales o al recibir directivas y propuestas presentadas de manera abierta, oral y simultánea a la totalidad de los alumnos presentes en el espacio áulico. Ya puede atender cuando hablamos a todo el grupo y seguir lo que pedimos.`,
    `Nombre atiende, decodifica, comprende y responde de manera precisa a las consignas grupales de forma totalmente autónoma. Evidencia un óptimo registro auditivo y de procesamiento superior de las indicaciones dadas de forma general, aplicándolas de manera inmediata y asertiva en su propia tarea. Sigue las consignas del grupo perfectamente sin que tengamos que repetirle.`
  ],
  conflictos: [
    `Nombre tiende a reaccionar de manera impulsiva, disruptiva o con conductas físicas directas frente a conflictos vinculares, frustraciones operativas o desacuerdos. Las intervenciones docentes operan de manera inmediata para desactivar la situación, garantizar la seguridad y promover abordajes más funcionales. Reacciona físicamente ante los problemas, así que intervenimos para que encuentre otra forma de actuar.`,
    `Nombre logra expresar de manera inteligible la causa de su malestar ante un conflicto interaccional, pero requiriendo de mediación docente directa para articular la problemática de forma clara, regular la intensidad de su respuesta e intentar facilitar un intercambio orientado hacia la resolución pacífica. Nos cuenta qué le molesta, pero nos necesita cerca para encontrar una solución.`,
    `Nombre emplea el diálogo y el intercambio verbal organizado como herramienta principal para el manejo de conflictos interpersonales. Logra exponer sus posturas, argumentar y buscar acuerdos viables y concretos, requiriendo intervenciones o guiaturas mínimas y puntuales por parte del adulto referente. Ya usa el diálogo y solo nos necesita para dar el visto bueno al acuerdo.`,
    `Nombre resuelve de manera autónoma, madura y asertiva los conflictos y diferencias emergentes con sus pares. Demuestra flexibilidad cognitiva para escuchar posturas diversas, implementa habilidades de negociación efectivas y acepta pautas conciliatorias reales en favor de la preservación del buen clima grupal. Resuelve sus problemas con los demás solo/a de forma madura.`
  ],
  desplazamiento: [
    `Nombre requiere guía física directa, asistencia motriz y/o supervisión visual permanente para realizar desplazamientos a lo largo de los diferentes espacios generales de la institución. Precisa referentes de orientación constantes para garantizar su contención, su seguridad física y su movilidad operativa. Lo guiamos todo el tiempo por la escuela para que se sienta seguro/a.`,
    `Nombre reconoce funcionalmente el uso y la distribución de los diversos sectores escolares habituales. Sin embargo, requiere de indicaciones verbales, señalamientos directivos y recordatorios constantes de parte del adulto para orientarse en el trayecto y trasladarse de un espacio físico a otro de manera estructurada y ordenada. Conoce dónde están los lugares, pero le recordamos cómo llegar.`,
    `Nombre se desplaza por los espacios institucionales con un adecuado y consolidado sentido de orientación espacial. Necesita únicamente de recordatorios verbales de carácter esporádico o preventivo para guiarse funcionalmente hacia nuevos sectores, modificar su recorrido habitual o adaptarse a desvíos eventuales. Ya conoce los caminos y solo le recordamos cómo llegar si vamos a un lugar nuevo.`,
    `Nombre se desplaza de manera autónoma, fluida y completamente segura por la totalidad de las instalaciones y sectores de la institución. Evidencia un claro reconocimiento topográfico y un dominio funcional del espacio, apropiándose del entorno físico escolar y de sus rutinas de traslado de manera independiente. Se mueve solo/a por toda la escuela sin ayuda de nadie.`
  ],
  juego: [
    `Nombre presenta una modalidad lúdica centrada fundamentalmente en componentes de tipo exploratorio, motor y sensorial. Su interacción focalizada con el medio y los objetos se orienta al contacto directo, repetitivo, táctil o de escrutinio visual, abordando el material a través de la manipulación simple de sus cualidades físicas. Su forma de jugar es descubriendo objetos tocándolos.`,
    `Nombre desarrolla secuencias incipientes y sostenidas de juego de carácter simbólico. Utiliza los diversos elementos del entorno dotándolos de imaginación interpretativa para representar funcionalmente acciones concretas de la vida cotidiana, estructurar lúdicamente diferentes roles y construir escenarios ficticios simples. Ya juega a 'hacer de cuenta' que los objetos son cosas distintas.`,
    `Nombre se incluye y participa de manera funcional en dinámicas de juego con reglas simples y objetivos preestablecidos. Comprende el formato estructural de la actividad pautada, ajustando y adecuando su conducta de manera pertinente para tolerar la espera grupal y respetar asertivamente los turnos correspondientes. Participa bien en juegos con reglas y entiende que debe esperar su turno.`,
    `Nombre propone, organiza y participa de forma plenamente sostenida en juegos reglados de mayor complejidad tanto normativa como cognitiva. Aporta al desarrollo lúdico demostrando estructuración estratégica de las reglas, anticipación táctica e interactuando de forma asociativa, recíproca y altamente colaborativa con su grupo. Organiza juegos, crea estrategias y ayuda al grupo a seguir las normas.`
  ],
  ciencias: [
    `Nombre precisa de modelado físico e instigación externa de carácter constante para el uso correcto y guiado de materiales en experiencias de indagación o manipulación. Manifiesta curiosidad de orden puntual y perceptiva, presentando marcadas dificultades para sostener la observación prolongada o la atención en el fenómeno. Le da curiosidad, pero le cuesta prestar atención a lo que hacemos.`,
    `Nombre se vincula con los materiales didácticos o los elementos naturales demostrando clara intencionalidad exploratoria. Requiere, no obstante, de la formulación estructurada de interrogantes por parte del docente y de guía directiva continua para sostener temporalmente y dar sentido al proceso de indagación y observación. Explora si le hacemos preguntas que lo guíen a descubrir cosas nuevas.`,
    `Nombre manifiesta un nivel de curiosidad constante y desarrolla producciones exploratorias con genuina intencionalidad de descubrimiento. Se involucra de manera activa y metódica en las actividades e investigaciones de diversos fenómenos para la recolección de datos y la búsqueda estructurada de respuestas comprobables. Participa mucho y busca entender cómo funcionan las cosas.`,
    `Nombre investiga los fenómenos del entorno natural, químico y social de manera profundamente independiente y analítica. Posee iniciativa propia para formular sus propios interrogantes de investigación, elaborando sistemáticamente hipótesis explicativas coherentes y estructurando los recursos empíricos con total autonomía. Investiga solo/a, hace preguntas, intenta explicar lo que sucede y tiene mucha iniciativa.`
  ],
  cuidado: [
    `Nombre no evidencia un registro consciente ni duradero del impacto de sus acciones directas sobre el entorno, ni logra aplicar normativas autónomas de cuidado o preservación de los espacios físicos. Se requiere de abordaje presencial y corrección correctiva directa para fomentar la paulatina incorporación de hábitos mínimos. No registra que debe cuidar el espacio y trabajamos en que aprenda hábitos básicos.`,
    `Nombre identifica cognitivamente las normativas básicas e institucionales vinculadas al cuidado del entorno físico, del medio natural y de los materiales de uso compartido. No obstante, requiere de supervisión externa constante y señalamientos de tipo in situ para asegurar su efectiva y sostenida aplicación en la práctica diaria. Sabe que debe cuidar el material, pero le recordamos seguido que lo haga.`,
    `Nombre identifica, reconoce e internaliza de manera operativa las pautas institucionales de cuidado ambiental, de preservación comunitaria de los elementos y del respeto genuino por los seres vivos. Evidencia una aplicación práctica funcional, estable y recurrente que demanda niveles de señalamientos o correcciones sumamente mínimos. Ya cuida el material y el espacio sin que se lo recordemos.`,
    `Nombre se desenvuelve de manera completamente responsable, proactiva y plenamente autónoma en lo que respecta al mantenimiento higiénico de los espacios físicos, el trato adecuado e intencionado hacia el medio ambiente y la preservación minuciosa de todo el material, el equipamiento y el mobiliario institucional. Es muy responsable y cuida todo solo/a.`
  ],
  comunicacion: [
    `Nombre emplea una modalidad comunicativa predominantemente de carácter reactivo y situacional. Se vale en primera instancia de manifestaciones fisiológicas, alteraciones conductuales o de la utilización de gestos básicos (señalamientos o vocalizaciones inespecíficas) para dar cuenta de necesidades perentorias e inmediatas del contexto presente. Se comunica con gestos o sonidos cuando necesita algo urgente.`,
    `Nombre sostiene una comunicación intencional y de uso funcional mediante la utilización sistemática de señas, apoyos pictográficos concretos (sistemas aumentativos/alternativos) y/o vocalizaciones simples asociadas. Requiere de andamiaje permanente, estructuración y anticipación contextual para lograr sostener el intercambio con su interlocutor. Usa señas, dibujos o palabras simples para comunicarse con ayuda nuestra.`,
    `Nombre evidencia un rol de comunicación social de carácter indudablemente activo y propositivo. Transmite deseos, demandas, necesidades específicas u opiniones personales e interactúa socialmente mediante la estructuración oral de frases breves, dotadas de una adecuada coherencia lógica y funcionalmente comprensibles para su entorno inmediato. Ya puede decir claramente lo que piensa o necesita usando frases cortas.`,
    `Nombre posee un nivel de comunicación y un desarrollo integral del lenguaje de carácter complejo. Comprende con facilidad consignas abstractas, relata eventos pasados de manera cronológica, estructura narrativas sumamente detalladas con vocabulario pertinente y sostiene de forma fluida, dinámica y asertiva intercambios conversacionales extendidos y coherentes. Habla muy bien, cuenta lo que vivió y conversa sin ninguna traba.`
  ],
  funciones: [
    `Nombre presenta niveles de atención altamente dispersa, fatigabilidad o labilidad atencional sumamente significativa. Requiere indispensablemente de la implementación de estímulos visuales o verbales focalizados, y de la constante reconducción directiva de su conducta, para lograr sostenerse mínimamente en la actividad operativa de referencia planteada. Se dispersa y necesita mucha ayuda nuestra para concentrarse.`,
    `Nombre logra sostener los dispositivos de atención de manera ciertamente funcional pero limitándose de manera estricta a períodos breves de tiempo. Accede con éxito a la ejecución práctica de instrucciones sencillas conformadas por un solo paso o comando operativo explícito, contando siempre con la mediación y el control estructurado del docente. Se concentra en tareas cortas si le damos una consigna clara, con nuestra guía.`,
    `Nombre evidencia una adecuada e integrada capacidad de atención sostenida durante el lapso temporal que comúnmente implican las tareas escolares habituales. Demuestra la habilidad cognitiva y la memoria de trabajo requeridas para retener, procesar y ejecutar de forma ordenada consignas formadas por secuencias de dos o más pasos encadenados. Ya puede prestar atención toda la tarea y seguir dos pasos seguidos solo/a.`,
    `Nombre presenta un desarrollo óptimo, estructurado y sumamente maduro de sus funciones ejecutivas superiores. Evidencia una atención focalizada de muy alta calidad y ejecuta con total grado de autonomía instrucciones globales constituidas por secuencias cognitivas altamente complejas, o conformadas por múltiples pasos integrados y de realización simultánea. Tiene una gran concentración y hace tareas difíciles solo/a.`
  ],
  flexibilidad: [
    `Nombre presenta una marcada rigidez cognitiva y conductual frente a las variaciones en la dinámica habitual de trabajo o ante la incertidumbre. Experimenta una notoria dificultad adaptativa y exterioriza posibles signos de desregulación conductual y emocional inmediata frente a imprevistos, transiciones de espacio o alteraciones de su cronograma de rutina. Se molesta si las cosas cambian de golpe y necesita estabilidad.`,
    `Nombre logra aceptar de manera paulatina y asimilar paulatinamente diversas alteraciones o variaciones estructurales en el cronograma escolar. Esto es posible siempre y cuando las mismas se presenten con la debida anticipación temporal, mediante mediación verbal concreta y apoyándose eficazmente en la estructura y previsibilidad brindada por los recursos o agendas visuales. Acepta cambios si se los contamos antes y usamos agendas.`,
    `Nombre adapta y moldea su esquema de respuesta conductual de manera altamente funcional y operativa frente a modificaciones de carácter moderado en el desarrollo previsto de la jornada diaria. Requiere para asimilar y flexibilizar cognitivamente frente al cambio transitorio tan solo de intervenciones de apoyo, confirmaciones o señalamientos verbales verdaderamente mínimos. Se adapta rápido a cambios del día con mínima ayuda.`,
    `Nombre evidencia en su desenvolvimiento altos, sólidos y consolidados niveles de flexibilidad cognitiva y de adaptación plena al contexto. Ajusta de forma rápida, eficiente y sumamente operativa su respuesta de acción ante modificaciones repentinas del entorno o frente a cambios estructurales de la rutina general, sosteniendo plenamente y en todo momento su nivel de autorregulación conductual. Es muy flexible ante cualquier cambio y se adapta rápido aunque las cosas salgan distinto a lo planeado.`
  ],
  sensorial: [
    `Nombre presenta respuestas manifiestas de muy alta labilidad, sobrecarga sensitiva y posible desregulación conductual frente a la incidencia de múltiples estímulos sensoriales ambientales de moderada o alta intensidad (tales como pueden ser el ruido áulico fluctuante, el nivel de estimulación visual global acumulado en el aula o la aglomeración física). Le molestan ruidos o luces; lo ayudamos dándole calma para que no se sientado abrumado/a.`,
    `Nombre evidencia un nivel de reactividad o sensibilidad moderada frente al caudal sensorial normal del entorno general escolar. Requiere de manera recurrente u ocasional del apartamiento estratégico, el uso de diversas herramientas de bloqueo sensorial o de la necesaria reubicación en espacios tranquilos y de bajo estímulo para lograr procesar la información y recobrar su eje de autorregulación. A veces el ruido lo/la afecta y necesita un lugar tranquilo.`,
    `Nombre procesa de forma sumamente integrada y globalmente adaptativa los diversos estímulos convergentes del ambiente áulico, logrando desarrollar procesos de habituación exitosa. Esto le permite que la incidencia de factores ambientales regulares (movimiento de pares, bullicio moderado, cambios lumínicos) no perturbe el normal desarrollo de sus tareas prácticas o altere de forma significativa sus procesos formales de aprendizaje. Tolera bien el ruido y el movimiento y trabaja sin problemas.`,
    `Nombre posee un muy alto y consolidado grado de tolerancia, modulación neurológica y un óptimo y destacable nivel de integración global para el procesamiento sensorial de todo el flujo continuo de información ambiental escolar. Participa de manera plenamente y activamente operativa, y mantiene inalterable su eje de autorregulación interna aún desenvolviéndose en entornos de estímulos altamente múltiples, dinámicos o sumamente activos. Está muy tranquilo/a aunque haya mucho movimiento a su alrededor.`
  ],
  intereses: [
    `Nombre evidencia un patrón perfilado de intereses altamente focalizado o de carácter eminentemente restringido. Tiende a centrar su motivación, atención y exploración de forma reiterativa, y a menudo estereotipada, en la manipulación de objetos o en el abordaje de temáticas de características singulares. No presenta, por el momento analizado, una apertura genuina y consistente a la incorporación de novedosas o variadas alternativas lúdicas o pedagógicas espontáneas propiciadas por el entorno. Le interesan siempre los mismos objetos, así que sumamos otros de a poco.`,
    `Nombre presenta áreas de interés fuertemente delimitables, sumamente claras y altamente predecibles para la estructuración de su entorno cotidiano. La inclusión de tipo pedagógica explícita y planificada de estas preferencias específicas y de estos tópicos articulares, resulta un recurso metodológico estructurante e indispensable que opera como el motor, el anclaje o el incentivo principal y fundamental en el desarrollo de la inmensa mayoría de las situaciones que exigen un nivel de trabajo sostenido o instancias de aprendizaje prolongado. Tiene gustos definidos que usamos para motivarlo/a en todas las tareas.`,
    `Nombre recurre frecuentemente a sus preferencias temáticas o áreas de interés personalizadas como un recurso de tipo cognitivo y social plenamente funcional e integrativo. Las emplea y las pone en práctica no solo para afianzar el sostenimiento del disfrute y potenciar su involucramiento directo en las múltiples y diversas actividades áulicas propuestas, sino también que estas logran operar de manera sumamente natural como una base temática totalmente efectiva, concreta y motivacional para lograr iniciar, extender y sostener un intercambio de orden social y comunicativo con sus diversos pares. Usa lo que le gusta para compartir y vincularse con sus amigos.`,
    `Nombre logra extrapolar de manera absolutamente funcional la totalidad de su campo de intereses primarios y aplica metódicamente todas sus fortalezas intrínsecas y sus habilidades cognitivas destacadas para lograr resolver de forma sumamente operativa las diversas y variadas consignas escolares planteadas. Emplea de manera recurrente estos valiosos y consolidados recursos intrínsecos para poder enfrentar de forma totalmente autónoma, sumamente analítica y altamente creativa variados y desafiantes retos que pueden presentar un carácter pedagógico, organizativo o de propia dinámica vincular. Aplica lo que más le gusta en todo lo que hace, usando sus habilidades para resolver desafíos solo/a.`
  ],
  apoyos: [
    `Nombre requiere sin excepción el suministro directo y de tipo constante de un conjunto de configuraciones de apoyo materializadas exclusivamente en intervenciones físicas, guía manual orientada (modelado continuo) y un contacto de orden presencial extremadamente cercano. Depende íntegramente de un soporte de encuadre altamente directivo y de altísima y recurrentes intensidad provisto por parte de la totalidad de los profesionales responsables del espacio para poder garantizar la estructuración organizativa, el propiciar y dar inicio a la tarea, y lograr finalmente un sostenimiento en el curso general del abanico de todas y cada una de las actividades. Necesita nuestra presencia física para todo y lo guiamos constantemente para que se sienta seguro/a al trabajar.`,
    `Nombre precisa la disposición integral y el uso continuo e invariable de diferentes y complementarias herramientas de formato instrumental, estructuradas de manera primordialmente externa. El estudiante logra sostenerse de una forma funcional a partir de la provisión y el diseño de elementos clave, tales como agendas visuales de rutina, estructurados sistemas visuales de anticipación paso a paso de los eventos, y puntuales soportes referenciales de carácter eminentemente e innegablemente concreto. Todo este conjunto le permite llegar a organizar temporal y secuencialmente las pautas básicas de la estructura total de todo su desempeño áulico e institucional. Usa apoyos visuales y soportes concretos para organizarse y entender qué sigue.`,
    `Nombre cuenta y evidencia de manera observable con niveles de autonomía intermedios y de carácter sumamente funcional para su desempeño. Recurre ocasionalmente al lógico y natural requerimiento de la disposición presencial de ciertos apoyos pedagógicos sumamente puntuales, breves orientaciones directivas de tipo verbal y limitadas en el tiempo, o a eventuales configuraciones de marco organizativo únicamente, y de forma casi exclusiva, cuando el estudiante debe necesariamente afrontar y estructurar el abordaje general de tareas que le resultan plenamente no familiares, transiciones de eventos consideradas atípicas para su rutina, o bien ante propuestas académicas de una notoria, evidente y comprobable complejidad de tipo cognitiva o procesual. Es bastante autónomo/a y solo nos busca para que lo guiemos en tareas nuevas o muy difíciles.`,
    `Nombre presenta un destacado y consolidado perfil de independencia absolutamente operativa, de carácter sustained, sumamente constante e ininterrumpido en todas sus esferas dentro de la dinámica normal del aula escolar. Se desenvuelve acudiendo de forma totalmente excepcional o en la mayoría de los casos de forma directamente nula, a cualquier tipo de andamiajes de soporte estructural y orientaciones o directrices de baja intensidad. La necesidad de estos soportes mínimos, si es que logra presentarse en algún momento del ciclo, se asocia de forma exclusiva y puramente ocasional al estricto abordaje analítico, reflexivo y estratégico de complejas consignas u órdenes de trabajo que demandan y requieren estrictamente un nivel funcional de procesamiento cognitivo, de estructuración organizacional, o de un nivel de razonamiento de orden analítico marcadamente avanzado y plenamente superior. Es totalmente independiente y casi no necesita ayuda nuestra; se gestiona solo/a.`
  ],

  // ==========================================
  // ÁREA LABORAL / CFI 
  // ==========================================
  herramientas_reconocimiento: [
    `Nombre presenta dificultades para identificar las herramientas de trabajo por cuenta propia. Requiere de asistencia constante y señalamientos directos para poder seleccionar los elementos necesarios para cada tarea propuesta en el taller. En esta etapa, estamos ayudándole de cerca a conocer qué herramientas existen y para qué sirve cada una.`,
    `Nombre logra identificar las herramientas básicas del taller, apoyándose de manera funcional en referencias visuales o mediante el señalamiento y la guía puntual brindada por el docente a cargo. Ya empezó a reconocer las herramientas y de a poco se va familiarizando con su nombre y utilidad.`,
    `Nombre identifica y nombra de manera autónoma las herramientas de uso frecuente dentro del taller. Reconoce los elementos de trabajo habituales y los selecciona de manera pertinente para las actividades cotidianas. Ya conoce muy bien las herramientas de todos los días y sabe buscarlas solito/a cuando las necesita.`,
    `Nombre reconoce, diferencia y categoriza de forma autónoma una amplia y variada gama de herramientas. Demuestra un claro entendimiento de la función específica de cada elemento, seleccionando el instrumental más adecuado para cada requerimiento técnico. Conoce todas las herramientas a la perfección y siempre sabe elegir la correcta para el trabajo que tiene que hacer.`
  ],
  herramientas_uso: [
    `Para manipular las diversas herramientas del taller, Nombre requiere de una guía física total y acompañamiento de tipo mano-sobre-mano. La intervención adulta es indispensable para garantizar el uso y el aprendizaje del gesto motor seguro. Lo acompañamos guiando sus manos para que aprenda a usarlas sin lastimarse y gane mucha confianza.`,
    `Nombre manipula las herramientas de trabajo requiriendo supervisión constante por parte del equipo docente. Se le asiste en las pautas de seguridad y en el control del uso de los elementos para afianzar paulatinamente el dominio técnico. Las usa con cuidado mientras estamos a su lado para asegurarnos de que todo salga bien y sin ningún riesgo.`,
    `Nombre utiliza los elementos y herramientas del taller con un grado de autonomía funcional, requiriendo únicamente de una supervisión mínima y esporádica orientada a validar las normas generales de seguridad. Ya maneja las herramientas casi sin ayuda, solo lo miramos un poquito de lejos para confirmar que trabaje seguro.`,
    `Nombre manipula todo tipo de herramientas con notoria destreza, absoluta seguridad y total autonomía. Aplica correctamente las técnicas de uso, demostrando un excelente dominio instrumental en sus labores prácticas. Es un experto/a usando las herramientas, trabaja con muchísima habilidad y sin necesitar que lo supervisemos.`
  ],
  produccion_proceso: [
    `Nombre presenta un importante desafío para seguir la secuencia de pasos en el proceso productivo. Necesita de la mediación directa y estructurada del adulto en cada una de las acciones que componen la tarea para poder avanzar. Estamos trabajando cerquita suyo, ayudándole paso a paso para que empiece a entender cómo se hace el producto.`,
    `Nombre logra llevar a cabo pasos simples del proceso productivo, apoyándose de manera efectiva en soportes visuales, esquemas gráficos o mediante la recepción de instrucciones verbales cortas y precisas. Con alguna imagen de ayuda o explicándole cortito, ya puede hacer varios pasos del trabajo muy bien.`,
    `Nombre realiza de forma adecuada las diversas tareas productivas, logrando seguir e internalizar las secuencias preestablecidas de trabajo con un grado de independencia sumamente funcional para la dinámica del taller. Trabaja súper bien siguiendo las indicaciones y ya hace gran parte del producto por su propia cuenta.`,
    `Nombre es capaz de desarrollar y concretar productos terminados abordando el proceso productivo en su totalidad de manera plenamente independiente. Planifica, ejecuta y concluye los pasos secuenciales sin requerir ningún tipo de asistencia. Sabe exactamente qué tiene que hacer desde que empieza hasta que termina el producto, sin que le digamos nada.`
  ],
  produccion_calidad: [
    `En cuanto a la calidad de terminación, Nombre requiere que el docente intervenga de manera directa para corregir, ajustar o finalizar sus producciones y así lograr alcanzar los estándares mínimos requeridos en el taller. Por ahora lo ayudamos a terminar y emprolijar las cosas para que el resultado final quede muy lindo.`,
    `Nombre concreta producciones de manera funcional, aunque precisa de la supervisión frecuente y la corrección externa de los detalles y acabados para optimizar el nivel de calidad del producto final. Trabaja muy lindo, solo le damos una manito al final para corregir pequeños detalles de prolijidad.`,
    `Nombre logra plasmar acabados de muy buena calidad en sus trabajos, evidenciando esmero en la terminación. Únicamente requiere de revisiones esporádicas o sugerencias puntuales para perfeccionar su producción. Hace trabajos hermosos y muy prolijos, casi no hace falta que le corrijamos nada.`,
    `Nombre realiza sus tareas logrando producciones de altísima calidad. Demuestra una minuciosa y excelente atención a los detalles, entregando productos con acabados sobresalientes y de nivel plenamente profesional. Los productos que hace son impecables, trabaja con muchísimo cuidado y amor por los detalles.`
  ],
  autonomia_trabajo: [
    `Nombre manifiesta una dependencia absoluta hacia la figura del adulto para lograr iniciar, estructurar y sostener temporalmente cualquier tipo de tarea laboral. Requiere instigación permanente para mantenerse activo/a en su puesto. Necesita que estemos muy presentes animándolo/a para que empiece y sostenga sus ganas de trabajar.`,
    `Nombre logra sostener la atención y el esfuerzo en la tarea por períodos breves de tiempo. Precisa de recordatorios verbales y estímulos constantes por parte del docente para poder retomar y dar continuidad al trabajo. Trabaja un ratito por su cuenta, pero necesita que le recordemos seguir adelante para no distraerse.`,
    `Nombre mantiene un ritmo de trabajo sostenido, constante y productivo, requiriendo tan solo de una supervisión de carácter intermitente. Demuestra capacidad para autorregular su actividad operativa de forma funcional. Trabaja re bien a su propio ritmo y casi no necesita que le digamos qué hacer a continuación.`,
    `Nombre trabaja con un nivel de autonomía sumamente destacado, organizando de manera personal sus tiempos, prioridades y tareas operativas. Gestiona su propia jornada laboral de forma plenamente independiente y responsable. Organiza todo su día de trabajo de manera increíble, hace sus tareas solo/a y con muchísima responsabilidad.`
  ],
  autonomia_seguridad: [
    `Nombre aún no ha internalizado las normas básicas de seguridad e higiene del taller. Requiere de control físico, supervisión constante y modelado preventivo para evitar situaciones de riesgo en el espacio de trabajo. Le estamos enseñando a cuidarse y a cuidar a los demás mientras trabaja, acompañándolo/a en todo momento.`,
    `Nombre evidencia conocimiento teórico de las normas básicas de seguridad e higiene, logrando aplicarlas si cuenta con el recordatorio explícito y la anticipación verbal del docente justo antes de comenzar sus actividades. Conoce las reglas para no lastimarse, solo se las recordamos un poquito antes de empezar a trabajar.`,
    `Nombre respeta y aplica de forma metódica y consistente las normativas vigentes de seguridad e higiene industrial. Demuestra cuidado por su propia integridad y mantiene los estándares de limpieza durante su desempeño. Es muy cuidadoso/a, sabe qué cosas son peligrosas y mantiene su lugar siempre limpio y seguro.`,
    `Nombre se posiciona como un verdadero referente dentro del grupo en materia de normas de seguridad e higiene. Cuida de forma proactiva y autónoma tanto su espacio personal de trabajo como el entorno general del taller. Nos da muchísimo orgullo ver cómo se cuida y ayuda a que todo el grupo trabaje seguro. Es un gran ejemplo.`
  ],
  rol_pautas: [
    `Nombre presenta notorias dificultades para ajustarse a las pautas del taller, tendiendo a la deambulación o interrumpiendo frecuentemente el trabajo de sus compañeros. Requiere constante reconducción a su puesto y tarea. Le está costando un poquito quedarse en su lugar de trabajo y seguir el ritmo, así que lo acompañamos con mucha paciencia.`,
    `Nombre logra respetar de forma básica las pautas de convivencia, las normas de funcionamiento y los horarios establecidos del entorno laboral, precisando para ello de supervisión externa y señalamientos frecuentes. Va aprendiendo muy bien las reglas de convivencia del grupo con un poco de guía nuestra.`,
    `Nombre cumple adecuadamente con las pautas estructurales de trabajo, asimilando con responsabilidad los tiempos, los cronogramas y las rutinas normativas propias de la dinámica cotidiana del taller pre-profesional. Entendió perfecto cómo funcionamos en el taller y respeta súper bien los horarios y las normas.`,
    `Nombre demuestra un nivel de compromiso, puntualidad y sentido de responsabilidad laboral absolutamente intachables. Sostiene una actitud sumamente madura y respetuosa hacia las normativas generales de la institución. Es súper responsable y respetuoso/a con todas las reglas, da gusto ver el compromiso que tiene con su trabajo.`
  ],
  rol_equipo: [
    `Nombre tiende a ejecutar sus tareas de manera totalmente aislada, centrando su foco únicamente en su propia actividad sin considerar, registrar o articular su desempeño con el resto del entorno productivo y humano. Estamos incentivándolo/a para que empiece a notar el trabajo de sus compañeros y de a poquito comparta con ellos.`,
    `Nombre logra participar de manera funcional en tareas de tipo compartido y proyectos asociativos únicamente cuando es el docente quien pauta, coordina de forma directa y media la dinámica vincular con el resto del grupo. Comparte muy bien el trabajo con sus compañeros cuando nosotros organizamos la actividad y lo acompañamos.`,
    `Nombre colabora asertivamente con sus pares en el desarrollo de producciones grupales. Logra sostener una comunicación técnica fluida, respetando su función y engranando su tarea con la de sus compañeros de manera natural. Trabaja hermoso en grupo, charla, comparte y hace su parte para que el trabajo entre todos salga bárbaro.`,
    `Nombre asume un rol proactivo y solidario frente a sus compañeros. Constantemente propone nuevas tareas de índole colaborativa, asiste a sus pares ante las dificultades y fomenta un excelente clima de trabajo en equipo. Es un compañero/a de oro, siempre ayuda a los demás y tira para adelante con todo el grupo.`
  ],
  comprension_proceso: [
    `Nombre se limita a ejecutar acciones repetitivas o pasos productivos de manera aislada y descontextualizada, sin lograr aún comprender el sentido global de la tarea o el resultado final del producto que se está elaborando. Está aprendiendo recién a hacer una partecita del trabajo, pero todavía le falta entender para qué sirve lo que estamos fabricando.`,
    `Nombre logra comprender parcialmente ciertas etapas de la secuencia de producción, necesitando de la explicación reiterada y la mediación conceptual constante por parte del docente para otorgarle sentido a su trabajo. Va entendiendo de a poco qué es lo que hacemos, y le explicamos para qué sirve su enorme esfuerzo.`,
    `Nombre comprende claramente la secuencia lógica y el encadenamiento integral del proceso productivo. Identifica con asertividad su lugar funcional dentro del sistema y la importancia de su tarea específica. Sabe muy bien qué lugar ocupa en el taller y por qué su ayuda es tan importante para terminar el producto.`,
    `Nombre posee un entendimiento absolutamente global y detallado del proceso productivo integral de la institución. Identifica, valora y analiza de manera crítica cómo cada mínima intervención propia aporta al éxito del resultado final. Entiende a la perfección todo lo que hacemos en el taller y sabe que su trabajo es súper valioso para que todo quede excelente.`
  ],
  responsabilidad_rol: [
    `Nombre requiere de estímulos y supervisión directiva de manera continua para lograr mantenerse físicamente en su puesto de trabajo y focalizado/a en la función operativa que le ha sido asignada dentro de la jornada. Necesita que lo/la animemos mucho para que no deje su tarea y entienda qué tiene que hacer.`,
    `Nombre logra asumir un rol productivo de características simples bajo supervisión general. Cumple de manera obediente y operativa con las tareas directas que le son explícitamente asignadas y demandadas por el docente. Hace muy bien las tareas que le pedimos, siempre con un poquito de guía nuestra para no perderse.`,
    `Nombre asume, respeta y mantiene su rol laboral y su función específica con total autonomía y responsabilidad. Se desenvuelve con soltura e independencia dentro del andamiaje general del grupo de trabajo. Es súper responsable con lo que le toca hacer y se maneja solo/a sin que tengamos que estar encima.`,
    `Nombre demuestra una sobresaliente madurez laboral. Es capaz de identificar por cuenta propia las diferentes necesidades o falencias emergentes del sistema productivo, asumiendo proactivamente nuevas funciones para darles solución. Es tan responsable que si ve que falta hacer algo que no era su tarea, se ofrece a ayudar sin que se lo pidamos.`
  ],
  adaptabilidad: [
    `Nombre manifiesta una notoria rigidez de tipo conductual ante cualquier mínima variación introducida en su tarea habitual, en el uso de los materiales o ante posibles y necesarios cambios de su puesto físico de trabajo. Le cuestan mucho los cambios repentinos, así que tratamos de mantener su rutina para que se sienta seguro/a.`,
    `Nombre logra aceptar de forma transitoria ciertos cambios en su función productiva, siempre y cuando estas modificaciones cuenten previamente con una explicación clara, un encuadre anticipatorio visual y un acompañamiento empático. Acepta probar cosas nuevas o cambiar de tarea si se lo explicamos con tiempo y mucha tranquilidad.`,
    `Nombre se adapta de forma sumamente flexible y operativa a la rotación por diferentes roles o estaciones de trabajo dentro del taller, requiriendo tan solo de una guía técnica de inducción mínima frente al nuevo desafío. Se adapta rapidísimo si un día le toca hacer una tarea distinta o trabajar con otro compañero.`,
    `Nombre exhibe una extraordinaria versatilidad y plasticidad sociolaboral. Cambia rápidamente de rol, puesto o función operativa basándose pura y exclusivamente en las demandas situacionales y las necesidades del sistema productivo. Es un todoterreno, no tiene problemas en cambiar de tarea mil veces si hace falta y siempre con excelente actitud.`
  ],
  gestion_tiempos: [
    `Nombre no evidencia un registro consciente, funcional ni autónomo del paso del tiempo laboral. Depende imperativamente de directivas externas para iniciar su labor, comprender los momentos de receso o finalizar su tarea. Le estamos enseñando a darse cuenta de cuándo es momento de trabajar y cuándo es momento de descansar.`,
    `Nombre ejecuta las consignas de trabajo respetando ciertos márgenes y ritmos mínimos de productividad, contando siempre con la estructuración, el andamiaje y la pautación de tiempos controlada por la supervisión externa. Sigue bien los tiempos si nosotros le avisamos cuándo empezar y cuándo frenar a tomar algo o descansar.`,
    `Nombre logra autorregular su propio ritmo, velocidad y nivel de exigencia en el trabajo. Gestiona sus tiempos de descanso y actividad de manera equilibrada para cumplir funcionalmente con los objetivos y plazos de entrega. Sabe organizarse perfecto: trabaja a buen ritmo y frena a descansar lo justo y necesario.`,
    `Nombre planifica de manera estratégica e independiente todo su tiempo laboral y la disposición de sus recursos técnicos con el fin de optimizar al máximo los niveles y la eficiencia global de la producción del taller. Maneja los tiempos como un profesional, organizándose tan bien que hace que todo el equipo trabaje mejor.`
  ]
};

const formatearTextoImpresion = (idIndicador, indiceOpcion, respuestaCorta, firstNameRaw) => {
  if (!respuestaCorta || typeof respuestaCorta !== 'string') return '';

  const nombreReal = firstNameRaw ? firstNameRaw.split(' ')[0] : 'El/la estudiante';

  const obtenerSujeto = () => {
    const nom = nombreReal.trim().toLowerCase();
    const excepcionesMasculinas = ['bautista', 'luca', 'noa', 'sasha', 'borja', 'mika', 'andrea'];
    let esMujer = false;
    if (nom.endsWith('a') && !excepcionesMasculinas.includes(nom)) {
      esMujer = true;
    }
    const articuloEstudiante = esMujer ? 'La estudiante' : 'El estudiante';
    const articuloAlumno = esMujer ? 'Nuestra alumna' : 'Nuestro alumno';

    const opciones = [nombreReal, articuloEstudiante, articuloAlumno, nombreReal];
    return opciones[Math.floor(Math.random() * opciones.length)];
  };

  let textoFinal = '';
  if (DICCIONARIO[idIndicador] && DICCIONARIO[idIndicador][indiceOpcion]) {
    textoFinal = DICCIONARIO[idIndicador][indiceOpcion];
  } else {
    let textoMinuscula = respuestaCorta.charAt(0).toLowerCase() + respuestaCorta.slice(1);
    textoFinal = `Se observa que Nombre ${textoMinuscula}`;
  }

  const sujetoDinamico = obtenerSujeto();
  textoFinal = textoFinal.replace('Nombre', sujetoDinamico);
  textoFinal = textoFinal.replace(/Nombre/g, nombreReal);

  return textoFinal;
};

const generarHTMLImpresion = (s, report) => {
  const nivel = s?.level || 'Inicial';
  const indicadores = CONFIG_INDICADORES[report.tipoInforme]?.[nivel] || CONFIG_INDICADORES[report.tipoInforme]?.['Inicial'] || [];
  
  let indicadoresHTML = '';
  indicadores.forEach(c => {
    const answer = report.answers?.[c.id];
    if (!answer) return;
    const optionIndex = c.options.indexOf(answer);
    let textoDescriptivo = optionIndex !== -1 ? formatearTextoImpresion(c.id, optionIndex, answer, s?.firstName) : answer;
    
    if (textoDescriptivo) {
      indicadoresHTML += `
      <div class="text-xs flex flex-col mb-2 pb-3 border-b border-gray-100 last:border-0" style="break-inside: avoid;">
          <span class="font-black text-violet-900 uppercase text-[10px] tracking-widest mb-1">${c.label}</span>
          <span class="text-gray-800 leading-relaxed font-medium text-[11px]">${textoDescriptivo}</span>
      </div>`;
    }
  });

  const obsObjetivosHTML = (report.objConductual || report.objPedagogico || report.objSocioafectivo) ? `
      <div class="mt-4 bg-violet-50 p-5 rounded-xl border border-violet-200 shadow-sm" style="break-inside: avoid;">
          <h2 class="font-black uppercase text-violet-900 mb-2 text-sm border-b border-violet-200 pb-1">Objetivos para el segundo cuatrimestre</h2>
          ${report.objConductual ? `<div class="mb-2"><strong class="text-xs font-black text-violet-800">Objetivo Conductual:</strong><p class="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium mt-1">${report.objConductual}</p></div>` : ''}
          ${report.objPedagogico ? `<div class="mb-2"><strong class="text-xs font-black text-violet-800">Objetivo Pedagógico:</strong><p class="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium mt-1">${report.objPedagogico}</p></div>` : ''}
          ${report.objSocioafectivo ? `<div class="mb-2"><strong class="text-xs font-black text-violet-800">Objetivo Socioafectivo:</strong><p class="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium mt-1">${report.objSocioafectivo}</p></div>` : ''}
      </div>` : '';

  return `
  <div class="pagina w-full bg-white text-black font-sans pb-4">
      <div class="flex flex-col items-center justify-center border-b-2 border-violet-800 pb-4 mb-5 bg-violet-50 p-6 rounded-t-xl">
          <img src="/logo.png" alt="Logo Institucional" class="h-16 object-contain mb-3" />
          <h1 class="text-2xl font-black uppercase tracking-widest text-violet-900 mb-1">INFORME ${report.periodo.toUpperCase()} 2026</h1>
          <p class="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 bg-white px-3 py-0.5 rounded-full border border-violet-200 shadow-sm">
              Área: ${report.tipoInforme}
          </p>
      </div>
      <div class="border border-violet-200 rounded-xl p-5 mb-6 bg-white shadow-sm" style="break-inside: avoid;">
          <h2 class="text-sm font-black text-violet-900 uppercase border-b border-violet-100 pb-1 mb-3">Datos del Estudiante</h2>
          <div class="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
              <p><strong class="font-black text-gray-900">Alumno/a:</strong> <span class="text-gray-700">${s.lastName}, ${s.firstName}</span></p>
              <p><strong class="font-black text-gray-900">DNI:</strong> <span class="text-gray-700">${s.dni || '....................................'}</span></p>
              <p><strong class="font-black text-gray-900">Fecha de Nac.:</strong> <span class="text-gray-700">${s.birthDate || s.fechaNac || '....................................'}</span></p>
              <p><strong class="font-black text-gray-900">Grupo:</strong> <span class="text-gray-700 font-bold">${report.grupo}</span></p>
              <p><strong class="font-black text-gray-900">Docente a cargo:</strong> <span class="text-gray-700">${s.teacher || s.docente || '....................................'}</span></p>
              <p><strong class="font-black text-gray-900">Auxiliar/Preceptora:</strong> <span class="text-gray-700">${s.auxiliary || s.auxiliar || s.preceptora || '....................................'}</span></p>
              <p class="col-span-2"><strong class="font-black text-gray-900">Año de cursada:</strong> <span class="text-gray-700">2026</span></p>
          </div>
      </div>
      <div class="mb-6">
          <h2 class="text-sm font-black text-white bg-violet-800 uppercase px-4 py-1.5 rounded-md mb-4 shadow-sm inline-block" style="break-inside: avoid;">
              Desarrollo ${report.tipoInforme}
          </h2>
          <div class="space-y-4 border-l-2 border-violet-200 ml-1 pl-4">
              ${indicadoresHTML}
          </div>
      </div>
      ${report.obsCuatrimestre1 ? `
      <div class="mt-6 bg-violet-50 p-5 rounded-xl border border-violet-200 shadow-sm" style="break-inside: avoid;">
          <h2 class="font-black uppercase text-violet-900 mb-2 text-sm border-b border-violet-200 pb-1">Observaciones sobre los objetivos planteados para este primer cuatrimestre</h2>
          <p class="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">${report.obsCuatrimestre1}</p>
      </div>` : ''}
      ${obsObjetivosHTML}

      <div class="mt-8 mb-2 px-4 text-center" style="break-inside: avoid;">
          <p class="text-xs text-gray-700 italic font-medium">
              Continuaremos abordando, desde la perspectiva constructivista, el aprendizaje subjetivo del alumno, centrándonos en su bienestar y motivación, para avanzar durante el siguiente periodo.
          </p>
      </div>

      <div class="mt-10 pt-6 flex flex-col items-center justify-center border-t border-dashed border-gray-300" style="break-inside: avoid;">
          <img src={getCachedAppConfig().logoUrl || '/icon-192.png'} alt="Firmas y Logo Institucional" class="max-w-[300px] w-full object-contain mb-10" />
          <div class="w-full flex justify-between px-12 mt-12">
              <div class="flex flex-col items-center w-48">
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

export function MatriculaView({ user, db, appId, initStudentId }) { 
  const [students, setStudents] = useState([]);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [savingIncident, setSavingIncident] = useState(false);
  const [usersList, setUsersList] = useState([]); 
  const [showQuickFix, setShowQuickFix] = useState(false);
  const [fixingField, setFixingField] = useState('gender'); // 'gender' o 'dx'
  const [socialCases, setSocialCases] = useState([])
  const [generating, setGenerating] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Estados de visualización y edición
  
  const [editingStudent, setEditingStudent] = useState(null);
  const [duplicates, setDuplicates] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('info'); // 'info', 'history', 'reports'
  
  // Informes del Estudiante (Nuevo)
  const [studentReports, setStudentReports] = useState([]);
  const [reportPeriodFilter, setReportPeriodFilter] = useState('Todos');
  const [reportYearFilter, setReportYearFilter] = useState('2026');

  // Filtros
  const [filterText, setFilterText] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [formModalidad, setFormModalidad] = useState('Sede');
  const [filters, setFilters] = useState({ 
      modality: 'all', 
      level: 'all', 
      group: 'all', 
      turn: 'all', 
      teacher: 'all', 
      dx: 'all', 
      gender: 'all', 
      journey: 'all', 
      os: 'all' 
  });
  const handleQuickUpdate = async (id, field, value) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id), { [field]: value });
    } catch (e) { console.error("Error actualizando:", e); }
  };
 const [statFilters, setStatFilters] = useState({ 
      modality: [], 
      level: [], 
      gender: 'all', 
      dx: 'all',
      turn: 'all',
      journey: 'all'
  });
const [statOnlyPreTaller, setStatOnlyPreTaller] = useState(false);
  // Estados de Bitácora
  const [newNote, setNewNote] = useState("");
  const [isWriting, setIsWriting] = useState(false);

  // Estados de Modales
  const [showStats, setShowStats] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [unassignedList, setUnassignedList] = useState([]);
  
  // Estados de Procesos (Carga, Fotos, Importación)
  const [photoPreview, setPhotoPreview] = useState(null);
  const [importJson, setImportJson] = useState('');
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Constantes y Roles
  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin' || user.role === 'Equipo Directivo' || user.role === 'Dirección Inclusión';
  const canSearchDrive = isSuperAdmin || user.role === 'Administración'; 
  const LOGO_URL = getCachedAppConfig().logoUrl || '/icon-192.png'; 

  const INCIDENT_TYPES = [
      { label: "Trabajó Muy Bien", emoji: "🌟", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
      { label: "Ayudó a un amigo", emoji: "🤝", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
      { label: "Logro de Aprendizaje", emoji: "🚀", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
      { label: "Buena Conducta", emoji: "😇", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
      { label: "Crisis Llanto", emoji: "😭", severity: "medium", color: "bg-orange-100 border-orange-300 text-orange-800" },
      { label: "Higiene / Esfínter", emoji: "💩", severity: "medium", color: "bg-blue-100 border-blue-300 text-blue-800" }, 
      { label: "No trabajó", emoji: "💤", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
      { label: "Llegada Tarde", emoji: "🕑", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
      { label: "No comió", emoji: "🍽️", severity: "low", color: "bg-blue-50 border-blue-200 text-blue-700" }, 
      { label: "Agresión / Violencia", emoji: "👊", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
      { label: "Brote / Gritos", emoji: "🤬", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
      { label: "Fuga / Intento", emoji: "🏃", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
      { label: "Convulsión / Salud", emoji: "🚑", severity: "high", color: "bg-indigo-100 border-indigo-300 text-indigo-800" }, 
  ];
  const checkCudStatus = (cudDate) => {
    if (!cudDate || cudDate === "") return { status: 'none', text: 'Sin fecha' };
    
    const today = new Date();
    const exp = new Date(cudDate + 'T00:00:00');
    const diffTime = exp - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'expired', text: 'Vencido' };
    if (diffDays <= 90) return { status: 'warning', text: `Vence en ${diffDays} días` }; // Alerta 3 meses
    
    return { status: 'ok', text: 'Vigente' };
  };

  // ==========================================
  // 2. CARGA DE DATOS (FIREBASE)
  // ==========================================
  useEffect(() => {
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    const uS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qU = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc'));
    const uU = onSnapshot(qU, (snap) => setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qSocial = query(collection(db, 'artifacts', appId, 'public', 'data', 'social_cases'));
    const uSocial = onSnapshot(qSocial, (snap) => {
        setSocialCases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    // CARGAR INFORMES PARA VISTA DE ESTUDIANTE
    const qR = collection(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports');
    const uR = onSnapshot(qR, (snap) => {
        setStudentReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

   return () => { 
        uS(); 
        uU(); 
        if (typeof uSocial === 'function') uSocial(); 
        uR();
    };
  }, [appId]);

  useEffect(() => {
    if (initStudentId && students.length > 0) {
      const target = students.find(s => s.id === initStudentId);
      if (target) {
        const timer = setTimeout(() => {
          setViewingStudent(target);
          setActiveModalTab('info');
          setFilterText(''); 
          setShowArchived(false);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [initStudentId, students]);
  
  // Listas auxiliares para selects
  const staffSede = (usersList||[]).filter(u => ['Docente', 'Auxiliar/Preceptor', 'Equipo Técnico'].includes(u.role));
  const staffInclusion = (usersList||[]).filter(u => ['DAI', 'Equipo Técnico Inclusión', 'Inclusión'].includes(u.role));
  const uniqueGroups = [...new Set([...students.map(s => s.groupMorning), ...students.map(s => s.groupAfternoon)].filter(Boolean))].sort();
  const staffAll = usersList || [];

  // ==========================================
  // 3. LÓGICA DE FILTRADO
  // ==========================================
const filteredStudents = students.filter(s => {
      const isStudentActive = s.isActive !== false;
      if (showArchived && isStudentActive) return false;
      if (!showArchived && !isStudentActive) return false;

      const textToSearch = `${s.lastName || ''} ${s.firstName || ''} ${s.dni || ''}`.toLowerCase();
      const searchTxt = (filterText || '').toLowerCase();
      if (searchTxt && !textToSearch.includes(searchTxt)) return false;

      if (!showArchived && filters) {
          if (filters.modality && filters.modality !== 'all') {
              const mod = s.modality || 'Sede';
              if (mod !== filters.modality) return false;
          }
          if (filters.level && filters.level !== 'all' && s.level !== filters.level) return false;
          if (filters.dx && filters.dx !== 'all' && s.dx !== filters.dx) return false;
          if (filters.gender && filters.gender !== 'all' && s.gender !== filters.gender) return false;
          if (filters.journey && filters.journey !== 'all' && s.journey !== filters.journey) return false;
      }

      return true;
  });
  const toggleStatFilter = (category, value) => { setStatFilters(prev => { const currentList = prev[category]; if (currentList.includes(value)) return { ...prev, [category]: currentList.filter(item => item !== value) }; else return { ...prev, [category]: [...currentList, value] }; }); };

  // ==========================================
  // 4. HELPERS Y UTILIDADES
  // ==========================================
  const getSeverityColor = (severity) => { 
      if(severity === 'positive') return 'bg-emerald-50 border-emerald-200'; 
      if(severity === 'high') return 'bg-red-50 border-red-200'; 
      if(severity === 'medium') return 'bg-orange-50 border-orange-200'; 
      return 'bg-gray-50 border-gray-100'; 
  };
  const getSafeDate = (d) => { if(!d) return ''; try { return d.includes('T') ? d.split('T')[0] : d; } catch(e) { return ''; } };
  const calculateAge = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };
  const getAlertStatus = (inc) => { if(!inc || !inc.length) return {status:'ok', count:0}; const d = new Date(); d.setDate(d.getDate()-15); const r = inc.filter(x => (x.severity==='high'||x.severity==='medium') && new Date(x.date)>=d); return { status: r.length>=5?'danger':r.length>=3?'warning':'ok', count: r.length }; };

// ==========================================
  // 5. ACCIONES Y MANEJADORES
  // ==========================================
  const openNew = () => { setEditingStudent(null); setPhotoPreview(null); setFormModalidad('Sede'); setShowForm(true); };
  const openEdit = (s) => { setEditingStudent(s); setPhotoPreview(s.photoUrl); setFormModalidad(s.modality || 'Sede'); setShowForm(true); };
  
  const handlePhotoChange = async (e) => { 
      const f = e.target.files[0]; if(!f) return; 
      setUploading(true); 
      try { 
          const reader = new FileReader(); 
          reader.onload=(ev)=>{
              const img=new Image(); 
              img.onload=()=>{
                  const c=document.createElement('canvas'); 
                  const s=300/img.width; c.width=300; c.height=img.height*s; 
                  const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,c.width,c.height); 
                  setPhotoPreview(c.toDataURL('image/jpeg',0.7)); 
                  setUploading(false);
              }; 
              img.src=ev.target.result;
          }; 
          reader.readAsDataURL(f); 
      } catch(e){ setUploading(false); } 
  };

  const handleSave = async (e) => { 
      e.preventDefault(); 
      const fd = new FormData(e.target); 
      const d = Object.fromEntries(fd.entries()); 
      
      d.isActive = d.isActive === 'true'; 
      d.photoUrl = photoPreview || editingStudent?.photoUrl || ''; 
      d.modality = formModalidad; 
      
      const getStaffName = (id) => usersList.find(u => u.id === id)?.fullName || "";

     if (formModalidad === 'Sede') {
          // Guardamos los grupos ingresados en los inputs de texto
          d.groupMorning = d.groupMorning || "";
          d.groupAfternoon = d.groupAfternoon || "";

          // Sincronizamos los nombres de los docentes y auxiliares seleccionados
          d.teacherMorning = getStaffName(d.teacherIdMorning);
          d.teacherAfternoon = getStaffName(d.teacherIdAfternoon);
          d.auxMorning = getStaffName(d.auxIdMorning);
          d.auxAfternoon = getStaffName(d.auxIdAfternoon);
      }
      
      try { 
          if (editingStudent) { 
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), d);
              if (viewingStudent?.id === editingStudent.id) {
                  setViewingStudent({ ...editingStudent, ...d });
              }
          } else { 
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { 
                ...d, 
                isActive: true, 
                createdAt: serverTimestamp(), 
                incidents: [] 
              }); 
          } 
          setShowForm(false); 
          setEditingStudent(null); 
          setPhotoPreview(null); 
      } catch (err) { alert("Error: " + err.message); } 
  };
  
  const handleDelete = async (id) => { 
      if(confirm("⚠️ ¿Eliminar definitivamente?")) { 
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id)); 
          setShowForm(false); 
          setEditingStudent(null); 
      } 
  };
  
  // --- FIX BITÁCORA (BOTONES Y TEXTO) ---
  const handleSaveIncident = async (type, text = "", severity = "medium") => {
    const student = viewingStudent;
    
    if (!student || !student.id) {
        alert("❌ Error: No se pudo identificar al alumno.");
        return;
    }

    setSavingIncident(true);

    const incidentData = { 
        date: new Date().toISOString(), 
        type: text ? "Nota" : type, 
        severity: severity, 
        text: text || type, 
        author: user.fullName || user.firstName,
        authorId: user.id 
    }; 

    try { 
        const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id); 
        await updateDoc(studentRef, { incidents: arrayUnion(incidentData) });

        setStudents(prev => prev.map(s => s.id === student.id ? {...s, incidents: [...(s.incidents||[]), incidentData]} : s)); 
        setViewingStudent(prev => ({...prev, incidents: [...(prev.incidents||[]), incidentData]}));

        setNewNote(""); 
        setIsWriting(false); 
        alert("✅ Bitácora guardada correctamente."); 
    } catch (e) { 
        console.error("Error al guardar:", e);
        alert("❌ Error de conexión."); 
   } finally {
        setSavingIncident(false);
    }
  };
  
  const deleteIncident = async (sid, inc) => { 
      if(confirm("¿Borrar evento?")) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', sid), { incidents: arrayRemove(inc) }); 
  }; 
  
  const markAsInactive = async (s) => { 
      if(!confirm(`¿Dar de baja a ${s.firstName}?`)) return; 
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), { isActive: false }); 
      setUnassignedList(p=>p.filter(x=>x.id!==s.id)); 
  };
  
  const abrirLegajoDigital = (student) => { 
      const clean = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, ""); 
      const query = `name contains '${clean(student.lastName).split(' ')[0]}' and name contains '${clean(student.firstName).split(' ')[0]}' and trashed = false`; 
      window.open(`https://drive.google.com/drive/search?q=${encodeURIComponent(query)}`, '_blank'); 
  };

  // ==========================================
  // IMPRESIÓN IFRAME Y DESCARGAS GLOBALES 
  // ==========================================
  const checkUnassigned = () => {
    const found = students.filter(s => {
      if (s.isActive === false) return false; // Ignorar inactivos
      
      if (s.modality === 'Inclusión') {
        return !s.daiMorning && !s.daiAfternoon;
      } else {
        return !s.groupMorning && !s.groupAfternoon;
      }
    });
    setUnassignedList(found);
    setShowDataManagement(false);
    setShowUnassigned(true);
  };
  
  const descargarBackup = () => { 
      if(!confirm("¿Descargar Backup?")) return; 
      const blob = new Blob([JSON.stringify(students, null, 2)], { type: "application/json" }); 
      const link = document.createElement('a'); 
      link.href = URL.createObjectURL(blob); 
      link.download = "BACKUP_MATRICULA.json"; 
      document.body.appendChild(link); link.click(); document.body.removeChild(link); 
  };
  
  const handleBulkImport = async () => {
    const rawJson = prompt("Pega aquí el contenido JSON del backup de estudiantes:");
    if (!rawJson) return;

    setProcessing(true);
    try {
      const data = JSON.parse(rawJson);
      if (!Array.isArray(data)) throw new Error("El formato no es un array válido.");

      const snapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
      const alumnosActuales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      let agregados = 0;
      let actualizados = 0;

      const promises = data.map(async (item) => {
        const { id, ...cleanData } = item;
        
        const existe = alumnosActuales.find(s => 
           (cleanData.dni && s.dni === cleanData.dni) || 
           (s.firstName === cleanData.firstName && s.lastName === cleanData.lastName)
        );

        if (existe) {
          actualizados++;
          return updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', existe.id), {
            ...cleanData,
            updatedAt: serverTimestamp()
          });
        } else {
          agregados++;
          return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), {
            ...cleanData,
            isActive: true,
            createdAt: serverTimestamp(),
            incidents: cleanData.incidents || []
          });
        }
      });

      await Promise.all(promises);
      alert(`✅ ¡Importación lista!\n\nSe agregaron: ${agregados} alumnos nuevos.\nSe actualizaron: ${actualizados} alumnos existentes.`);
      setShowDataManagement(false);
    } catch (e) {
      alert("❌ Error al procesar: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleAutoAssignGenders = async () => {
    if(!confirm("🤖 ¿Asignar género automáticamente basado en el nombre?\n(Nombres terminados en 'a' serán F, resto M)")) return;
    setProcessing(true);
    try {
        const updates = students.map(s => {
            if(s.gender) return null; 
            const name = (s.firstName || "").toLowerCase().trim();
            const gender = name.endsWith('a') ? 'F' : 'M';
            return updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), { gender });
        }).filter(p => p !== null);
        await Promise.all(updates);
        alert(`✅ Géneros asignados a ${updates.length} alumnos.`);
    } catch(e) { alert(e.message); }
    setProcessing(false);
  };

 const imprimirBitacora = (student, incidents) => {
      let h = `<html><head><title>Bitácora - ${student.lastName}</title>
      <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
          body { font-family: 'Roboto', sans-serif; padding: 20px; color: #333; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #7c3aed; padding-bottom: 15px; margin-bottom: 20px; }
          .header-info { display: flex; flex-direction: column; }
          .header-info h1 { margin: 0; color: #4c1d95; font-size: 20px; text-transform: uppercase; }
          .header-info p { margin: 4px 0 0; font-size: 12px; color: #666; font-weight: bold; }
          .photo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #7c3aed; }
          .incident { border-left: 5px solid #ccc; padding: 12px 15px; margin-bottom: 15px; background: #f9fafb; border-radius: 0 8px 8px 0; page-break-inside: avoid; }
          .incident.high { border-left-color: #ef4444; background: #fef2f2; }
          .incident.medium { border-left-color: #f97316; background: #fff7ed; }
          .incident.positive { border-left-color: #10b981; background: #ecfdf5; }
          .inc-header { display: flex; justify-content: space-between; font-size: 10px; font-weight: 900; color: #888; text-transform: uppercase; margin-bottom: 8px; }
          .inc-body { font-size: 13px; font-weight: 700; color: #333; line-height: 1.4; }
          .inc-footer { font-size: 9px; font-weight: bold; color: #999; margin-top: 8px; text-transform: uppercase; border-top: 1px solid #eee; padding-top: 5px; }
          .print-footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 30px; border-top: 1px dashed #ccc; padding-top: 10px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>`;

      h += `
      <div class="header">
          <div class="header-info">
              <h1>BITÁCORA EXPRÉS: ${student.lastName}, ${student.firstName}</h1>
              <p>DNI: ${student.dni || '-'} | Edad: ${calculateAge(student.birthDate)} años | Modalidad: ${student.modality || 'Sede'}</p>
              <p>Grupo/Asignación: ${student.groupMorning || student.groupAfternoon || student.daiMorning || student.daiAfternoon || 'Sin asignar'}</p>
          </div>
          ${student.photoUrl ? `<img class="photo" src="${student.photoUrl}" />` : ''}
      </div>`;

      if (!incidents || incidents.length === 0) {
          h += `<p style="text-align:center; color:#999; font-style:italic;">No hay registros cargados en la bitácora.</p>`;
      } else {
          incidents.forEach(inc => {
              const dateObj = new Date(inc.date);
              const dateStr = dateObj.toLocaleDateString('es-AR') + ' ' + dateObj.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
              const isClosedStyle = inc.isClosed ? 'text-decoration: line-through; color: #888;' : '';
              h += `
              <div class="incident ${inc.severity || ''}">
                  <div class="inc-header">
                      <span>${dateStr}</span>
                      <span>ORIGEN: ${inc.source === 'social' ? 'GABINETE' : 'AULA'}</span>
                  </div>
                  <div class="inc-body" style="${isClosedStyle}">
                      ${inc.text || inc.type}
                  </div>
                  <div class="inc-footer">
                      Registrado por: ${inc.author || 'Anónimo'}
                  </div>
              </div>`;
          });
      }

      h += `<div class="print-footer">Documento generado el ${new Date().toLocaleDateString('es-AR')} - ${getInstitutionName()}</div>`;
      h += `</body></html>`;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(h);
      doc.close();
      
      setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => { document.body.removeChild(iframe); }, 5000);
      }, 500);
  };
  
  const imprimirListado = (list) => { 
      let h = `<html><head><title>Fichas de Estudiantes</title>
      <style>@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');body{font-family:'Roboto',sans-serif;padding:20px;}.page{border:1px solid #eee;padding:30px;margin-bottom:20px;border-radius:8px;page-break-after:always;max-width:800px;margin:0 auto 20px auto;border-top:10px solid #7c3aed;}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #ddd;padding-bottom:20px;margin-bottom:20px;}.header-text h1{color:#4c1d95;font-size:24px;margin:0;text-transform:uppercase;}.header-text p{color:#666;font-size:14px;margin:5px 0 0 0;}.photo-box{width:80px;height:80px;background:#eee;border-radius:50%;overflow:hidden;border:3px solid #7c3aed;}.photo-box img{width:100%;height:100%;object-fit:cover;}.section-title{background:#f3f4f6;color:#4c1d95;padding:8px 15px;font-weight:900;text-transform:uppercase;font-size:12px;border-radius:6px;margin-bottom:10px;border-left:5px solid #7c3aed;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;}.field{margin-bottom:5px;}.label{display:block;font-size:9px;color:#888;text-transform:uppercase;font-weight:bold;}.value{font-size:12px;font-weight:bold;color:#333;}.footer{text-align:center;font-size:9px;color:#aaa;margin-top:30px;border-top:1px solid #eee;padding-top:10px;}</style></head><body>`;
      
      list.forEach(s => { 
          h += `<div class="page"><div class="header"><div class="header-text"><h1>${s.lastName}, ${s.firstName}</h1><p>DNI: ${s.dni || '-'} | Edad: ${calculateAge(s.birthDate)} años</p></div><div class="photo-box">${s.photoUrl ? `<img src="${s.photoUrl}"/>` : ''}</div></div><div class="section-title">Datos Personales y Salud</div><div class="grid"><div class="field"><span class="label">Fecha Nacimiento</span><span class="value">${getSafeDate(s.birthDate)}</span></div><div class="field"><span class="label">Diagnóstico</span><span class="value">${s.dx || '-'}</span></div><div class="field"><span class="label">Obra Social</span><span class="value">${s.healthInsurance || 'NO DECLARA'}</span></div><div class="field"><span class="label">Vencimiento CUD</span><span class="value">${getSafeDate(s.cudExpiration)}</span></div></div><div class="section-title">Escolaridad (${s.modality || 'Sede'})</div><div class="grid"><div class="field"><span class="label">Nivel</span><span class="value">${s.level || '-'}</span></div>${s.modality === 'Inclusión' ? `<div class="field"><span class="label">Escuela Origen</span><span class="value">${s.originSchool} (${s.originGrade})</span></div><div class="field"><span class="label">DAI Asignada</span><span class="value">${s.daiMorning || s.daiAfternoon || '-'}</span></div>` : `<div class="field"><span class="label">Turno Mañana</span><span class="value">Grupo: ${s.groupMorning || '-'} (Doc: ${s.teacherMorning || '-'})</span></div><div class="field"><span class="label">Turno Tarde</span><span class="value">Grupo: ${s.groupAfternoon || '-'} (Doc: ${s.teacherAfternoon || '-'})</span></div>`}</div><div class="section-title">Familia y Contacto</div><div class="field" style="margin-bottom:10px;"><span class="label">Dirección</span><span class="value">${s.address || '-'}</span></div><div class="grid"><div class="field"><span class="label">Madre / Tutor 1</span><span class="value">${s.motherName || '-'}</span><br><span style="font-size:11px;color:#666">${s.motherContact || '-'}</span></div><div class="field"><span class="label">Padre / Tutor 2</span><span class="value">${s.fatherName || '-'}</span><br><span style="font-size:11px;color:#666">${s.fatherContact || '-'}</span></div></div><div class="field" style="margin-top:10px;background:#f9fafb;padding:10px;border-radius:5px;"><span class="label">PERSONAS AUTORIZADAS A RETIRAR</span><span class="value">${s.pickupInfo || 'Sin datos cargados.'}</span></div><div class="footer">${getInstitutionName()} - Legajo Digital generado el ${new Date().toLocaleDateString()}</div></div>`; 
      }); 
      h += '</body></html>'; 

      const iframe = document.createElement('iframe'); iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; document.body.appendChild(iframe); const doc = iframe.contentWindow.document; doc.open(); doc.write(h); doc.close(); setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); }, 5000); }, 500);
  };

  const exportFiltered = () => { if (filteredStudents.length === 0) return alert("Sin datos"); const headers = ["Apellido", "Nombre", "DNI", "Nivel", "Modalidad"]; const csv = [headers.join(';'), ...filteredStudents.map(s => [`"${s.lastName}"`, `"${s.firstName}"`, `"${s.dni}"`, `"${s.level}"`, `"${s.modality||'Sede'}"`].join(';'))].join('\n'); const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = "Matricula.csv"; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  
  const findDuplicates = () => {
    const dniMap = {};
    const nameMap = {};
    const dupes = [];

    students.forEach(s => {
      if (s.dni && s.dni.trim().length > 4) {
        if (dniMap[s.dni]) dupes.push({ type: 'DNI', s1: dniMap[s.dni], s2: s });
        else dniMap[s.dni] = s;
      }
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase().trim();
      if (fullName.length > 3) {
        if (nameMap[fullName]) {
          if (!dupes.find(d => d.s2.id === s.id)) {
            dupes.push({ type: 'Nombre', s1: nameMap[fullName], s2: s });
          }
        } else nameMap[fullName] = s;
      }
    });

    if (dupes.length === 0) {
      alert("✅ ¡Excelente! La base está limpia. No hay alumnos duplicados.");
    } else {
      setDuplicates(dupes);
      setShowDataManagement(false); 
    }
  };

  const statsResults = students.filter(s => {
      if (s.isActive === false) return false;
      if (statFilters.level.length > 0 && !statFilters.level.includes(s.level)) return false;
      if (statFilters.modality.length > 0 && !statFilters.modality.includes(s.modality || 'Sede')) return false;
      if (statFilters.dx !== 'all' && s.dx !== statFilters.dx) return false;
      if (statFilters.gender !== 'all') {
          if (s.gender !== statFilters.gender) return false;
      }
      if (statOnlyPreTaller) {
          const nombreTM = (s.groupMorning || "").toUpperCase();
          const nombreTT = (s.groupAfternoon || "").toUpperCase();
          if (!nombreTM.includes("PRE TALLER") && !nombreTT.includes("PRE TALLER")) return false;
      }
      if (statFilters.journey !== 'all' && s.journey !== statFilters.journey) return false;
      if (statFilters.turn !== 'all') {
          if (statFilters.turn === 'Mañana' && !s.groupMorning && !s.daiMorning && s.turn !== 'Mañana') return false;
          if (statFilters.turn === 'Tarde' && !s.groupAfternoon && !s.daiAfternoon && s.turn !== 'Tarde') return false;
      }
      return true;
  });

  const descargarTodasLasFotos = () => {
    const confirmacion = confirm("Se van a descargar las fotos de todos los alumnos activos. ¿Continuar?");
    if (!confirmacion) return;

    students.forEach(s => {
        if (s.photoUrl && s.photoUrl.startsWith('data:image')) {
            const link = document.createElement('a');
            link.href = s.photoUrl;
            link.download = `${s.lastName}_${s.firstName}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });
    alert("Proceso de descarga finalizado.");
  };

  const descargarFotosEnZip = async () => {
    const confirmacion = confirm("Se va a generar un archivo ZIP con las fotos. Esto puede tardar un minuto según tu internet. ¿Continuar?");
    if (!confirmacion) return;

    setGenerating(true); 

    try {
        if (!window.JSZip) {
            const script = document.createElement('script');
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
            document.head.appendChild(script);
            await new Promise(resolve => script.onload = resolve);
        }

        const zip = new window.JSZip();
        const folder = zip.folder("Fotos_Estudiantes");
        let contador = 0;

        students.forEach(s => {
            if (s.photoUrl && s.photoUrl.startsWith('data:image')) {
                const base64Data = s.photoUrl.split(',')[1];
                const nombreArchivo = `${s.lastName}_${s.firstName}.jpg`.replace(/\s+/g, '_');
                folder.file(nombreArchivo, base64Data, {base64: true});
                contador++;
            }
        });

        if (contador === 0) {
            alert("No se encontraron fotos para descargar.");
            setGenerating(false);
            return;
        }

        const content = await zip.generateAsync({type: "blob"});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `Fotos_Estudiantes_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert(`¡Listo! Se empaquetaron ${contador} fotos en el ZIP.`);
    } catch (error) {
        console.error(error);
        alert("Hubo un error al generar el ZIP: " + error.message);
    } finally {
        setGenerating(false);
    }
  };

  // Efecto para imprimir ocultando la UI
  useEffect(() => {
    const originalDisplays = new Map();

    const handleBeforePrint = () => {
      const bodyChildren = Array.from(document.body.children);
      bodyChildren.forEach(child => {
        if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.id !== 'impresion-masiva') {
          originalDisplays.set(child, child.style.display);
          child.style.display = 'none';
        }
      });
    };

    const handleAfterPrint = () => {
      const masiva = document.getElementById('impresion-masiva');
      if (masiva) masiva.remove();

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
  }, []);

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================
  return (
    <div className="animate-in fade-in pb-20">
      
      <style>{`
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
          .pagina { page-break-after: always; }
          @page { margin: 1cm; }
          body { background: white; margin: 0; padding: 0; }
        }
      `}</style>

      {/* HEADER DE FILTROS */}
      <div className={`p-6 rounded-3xl shadow-lg text-white mb-6 transition-colors ${showArchived?'bg-gray-600':'bg-gradient-to-r from-blue-600 to-cyan-500'}`}>
         <div className="flex justify-between items-center gap-4 mb-4">
             <div><h2 className="text-3xl font-bold flex gap-2 items-center"><GraduationCap/> {showArchived?'Archivo':'Legajos 2026'}</h2><p className="opacity-80 text-sm mt-1">{filteredStudents.length} alumnos encontrados</p></div>
             <div className="flex gap-2">
                 <button onClick={()=>setShowArchived(!showArchived)} className="px-3 py-2 border border-white/30 rounded-xl text-xs font-bold uppercase hover:bg-white/10 flex items-center gap-1">{showArchived? 'Ver Activos' : 'Ver Bajas'}</button>
                 {isSuperAdmin && <button onClick={()=>setShowDataManagement(true)} className="p-2 border border-white/30 rounded-xl hover:bg-white/10" title="Gestión (Nube)"><UploadCloud size={18}/></button>}
                 {isSuperAdmin && <button onClick={()=>setShowStats(true)} className="p-2 border border-white/30 rounded-xl hover:bg-white/10" title="Estadísticas"><PieChart size={18}/></button>}
                 <button onClick={() => imprimirListado(filteredStudents)} className="px-3 py-2 bg-white text-blue-600 rounded-xl text-xs font-black uppercase shadow hover:bg-blue-50 flex gap-2 items-center"><FileText size={14}/> Imprimir</button>
                 <button onClick={descargarFotosEnZip} disabled={generating} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md flex items-center gap-2 hover:bg-emerald-700 transition disabled:opacity-50">
                   {generating ? <RefreshCw className="animate-spin" size={14}/> : <><Download size={16}/> Descargar Todo (.ZIP)</>}
                 </button>
                 <button onClick={descargarTodasLasFotos} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-md flex items-center gap-2 hover:bg-emerald-700 transition">
                   <Download size={14}/> Descargar Fotos
                 </button>
                 <button onClick={exportFiltered} className="p-2 border border-white/30 rounded-xl hover:bg-white/10" title="Excel"><Download size={18}/></button>
                 {!showArchived && <button onClick={openNew} className="px-4 py-2 bg-white text-blue-600 rounded-xl shadow hover:bg-blue-50 font-bold"><Plus size={20}/></button>}
             </div>
         </div>
         {!showArchived && (
            <div className="mt-4 space-y-2">
                <div className="bg-white/20 p-2 rounded-xl flex items-center"><Search className="ml-2 opacity-70"/><input value={filterText} onChange={e=>setFilterText(e.target.value)} placeholder="Buscar alumno..." className="bg-transparent border-none outline-none text-white w-full font-bold placeholder-white/60 ml-2"/>{filterText && <button onClick={()=>setFilterText('')}><X/></button>}</div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <select value={filters.modality} onChange={e=>setFilters({...filters, modality:e.target.value})} className="bg-orange-100 text-orange-800 text-xs p-2 rounded-lg font-bold min-w-[100px] border border-orange-200"><option value="all">Modalidad: Todas</option><option value="Sede">Sede</option><option value="Inclusión">Inclusión</option></select>
                    <select value={filters.group} onChange={e=>setFilters({...filters, group:e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Grupo: Todos</option>{uniqueGroups.map(g=><option key={g} value={g}>{g}</option>)}</select>
                    <select value={filters.level} onChange={e => setFilters({...filters, level: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Nivel: Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select>
                    <select value={filters.teacher} onChange={e => setFilters({...filters, teacher: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Docente: Todos</option>{staffAll.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select>
                    <select value={filters.turn} onChange={e => setFilters({...filters, turn: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Turno: Todos</option><option value="Mañana">Mañana</option><option value="Tarde">Tarde</option></select>
                    <select value={filters.dx} onChange={e => setFilters({...filters, dx: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">DX: Todos</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select>
                    <select value={filters.gender} onChange={e => setFilters({...filters, gender: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Género: Todos</option><option value="M">Varón</option><option value="F">Mujer</option></select>
                    <select value={filters.journey} onChange={e => setFilters({...filters, journey: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Jornada: Todas</option><option value="Simple Mañana">Simple Mañana</option><option value="Simple Tarde">Simple Tarde</option><option value="Doble">Doble</option></select>
                </div>
            </div>
         )}
      </div>
      
     {/* LISTA DE TARJETAS DE ALUMNOS */}
      <div className="space-y-3">
        {filteredStudents.map(s => { 
          const cudInfo = checkCudStatus(s.cudExpiration); 
          const incidentAlert = getAlertStatus(s.incidents); 
          const hasCriticalAlert = cudInfo.status === 'expired' || cudInfo.status === 'warning' || incidentAlert.status === 'danger';

          return ( 
            <div key={s.id} onClick={()=>{setViewingStudent(s); setActiveModalTab('info'); setIsWriting(false);}} 
                 className={`bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center cursor-pointer active:scale-[0.99] transition 
                 ${!s.isActive ? 'border-red-400 opacity-60' : hasCriticalAlert ? 'border-red-500 border-l-8' : 'border-gray-100 hover:shadow-md'}`}>
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl overflow-hidden relative border border-gray-100">
                        {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName[0]}</div>}
                        {hasCriticalAlert && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-white animate-pulse"></div>}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">{s.lastName}, {s.firstName}</h4>
                            {s.modality === 'Inclusión' && <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-indigo-200 uppercase">INCLUSIÓN</span>}
                        </div>
                        <div className="flex gap-2 mt-1">
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 font-bold">{calculateAge(s.birthDate)} años</span>
                            <span className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase truncate max-w-[120px] ${
                              (s.modality === 'Inclusión' && !s.daiMorning && !s.daiAfternoon) || (s.modality !== 'Inclusión' && !s.groupMorning && !s.groupAfternoon)
                              ? 'bg-red-100 text-red-700 border border-red-200' 
                              : 'bg-gray-100 text-gray-500'
                            }`}>
                                {s.modality === 'Inclusión' 
                                    ? (s.daiMorning || s.daiAfternoon ? `DAI: ${s.daiMorning || s.daiAfternoon}` : <span>⚠️ Sin DAI</span>) 
                                    : (s.groupMorning || s.groupAfternoon ? `Grupo: ${s.groupMorning || s.groupAfternoon}` : <span>⚠️ Sin grupo</span>)}
                            </span>
                            {cudInfo.status === 'warning' && (
                                <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-1 rounded font-black animate-pulse border border-amber-200">
                                    CUD PRÓX. VENCER
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <Eye className={hasCriticalAlert ? "text-red-500" : "text-gray-300"}/>
            </div> 
          ); 
        })}
      </div>

      {/* ================= MODALES ================= */}

      {/* 1. MODAL FICHA COMPLETA (DETALLE) */}
      {viewingStudent && !showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* CABECERA */}
                <div className="bg-slate-700 p-6 text-white relative shrink-0">
                    <button onClick={()=>setViewingStudent(null)} className="absolute top-4 right-4 bg-white/20 p-1.5 rounded-full hover:bg-white/40 transition"><X size={20}/></button>
                    <div className="flex gap-5 items-center">
                        <div className="w-20 h-20 rounded-2xl bg-white/20 border-4 border-white/10 overflow-hidden shadow-lg flex items-center justify-center">
                            {viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="text-white/50"/>}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">{viewingStudent.lastName}, {viewingStudent.firstName}</h2>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <div className="bg-orange-500 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase shadow-sm">
                                    Edad: {calculateAge(viewingStudent.birthDate)} años
                                </div>
                                <div className="bg-white/10 text-white px-3 py-1 rounded-xl text-[10px] font-bold">
                                    Nac: {getSafeDate(viewingStudent.birthDate)}
                                </div>
                                <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold">{viewingStudent.dni}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTONERA DE PESTAÑAS (3 AHORA) */}
                <div className="flex gap-2 p-2 bg-slate-800/50 shrink-0">
                    <button onClick={()=>setActiveModalTab('info')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeModalTab==='info'?'bg-white text-slate-800 shadow-md':'text-white/40 hover:text-white'}`}>Ficha Técnica</button>
                    <button onClick={()=>setActiveModalTab('history')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeModalTab==='history'?'bg-white text-slate-800 shadow-md':'text-white/40 hover:text-white'}`}>Bitácora</button>
                    <button onClick={()=>setActiveModalTab('reports')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeModalTab==='reports'?'bg-white text-slate-800 shadow-md':'text-white/40 hover:text-white flex items-center justify-center gap-1'}`}><BookOpen size={12}/> Informes</button>
                </div>
      
                <div className="p-6 overflow-y-auto bg-gray-50 flex-1 relative custom-scrollbar">
                    
                    {/* CONTENIDO PESTAÑA 1: TODA LA INFO PERSONAL */}
                    {activeModalTab === 'info' && (
                      <div className="space-y-4 text-sm animate-in fade-in">
                        {canSearchDrive && (
                            <button onClick={() => abrirLegajoDigital(viewingStudent)} className="w-full bg-green-100 text-green-800 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-green-200 transition border border-green-300 mb-4 shadow-sm"><Folder size={18}/> {viewingStudent.modality === 'Inclusión' ? 'IR A CARPETA DRIVE' : 'BUSCAR EN DRIVE'}</button>
                        )}
                        <div className="grid grid-cols-4 gap-3">
                             <div className="bg-white p-3 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Nivel</p><p className="font-black text-slate-800 text-xs">{viewingStudent.level || '-'}</p></div>
                             <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 text-center shadow-sm"><p className="text-[9px] text-purple-400 font-bold uppercase mb-1">DX</p><p className="font-black text-purple-800 text-xs">{viewingStudent.dx || '-'}</p></div>
                             <div className="bg-white p-3 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Género</p><p className="font-black text-slate-800 text-xs">{viewingStudent.gender || '-'}</p></div>
                             <div className="bg-white p-3 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Jornada</p><p className="font-black text-slate-800 text-xs">{viewingStudent.journey || '-'}</p></div>
                        </div>
                        <div className="space-y-2">
                             <div className="bg-gray-200 p-2 rounded-lg text-[10px] font-bold text-gray-600 uppercase text-center tracking-widest">Modalidad {viewingStudent.modality || 'Sede'}</div>
                             {viewingStudent.modality === 'Inclusión' ? (
                                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 space-y-3"><div className="flex justify-between items-center border-b border-indigo-200 pb-2"><span className="text-[10px] text-indigo-400 font-bold uppercase">Escuela de Origen</span><span className="font-bold text-indigo-900 text-xs">{viewingStudent.originSchool || '-'} ({viewingStudent.originGrade || '-'})</span></div><div className="flex justify-between items-center"><span className="text-[10px] text-indigo-400 font-bold uppercase">DAI Asignada</span><span className="font-bold text-indigo-900 text-xs">{viewingStudent.daiMorning || viewingStudent.daiAfternoon || 'Sin asignar'}</span></div></div>
                             ) : (
                                <div className="grid grid-cols-2 gap-3"><div className="bg-yellow-50 p-3 rounded-2xl border border-yellow-200 shadow-sm relative overflow-hidden"><div className="absolute top-0 right-0 bg-yellow-200 text-yellow-800 text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">MAÑANA</div><p className="text-[9px] text-yellow-600 font-bold uppercase mt-2">Grupo</p><p className="font-bold text-slate-800 text-xs mb-2">{viewingStudent.groupMorning || '-'}</p><p className="text-[9px] text-yellow-600 font-bold uppercase">Docente</p><p className="font-bold text-slate-800 text-xs truncate">{viewingStudent.teacherMorning || '-'}</p></div><div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-200 shadow-sm relative overflow-hidden"><div className="absolute top-0 right-0 bg-indigo-200 text-indigo-800 text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">TARDE</div><p className="text-[9px] text-indigo-500 font-bold uppercase mt-2">Grupo</p><p className="font-bold text-slate-800 text-xs mb-2">{viewingStudent.groupAfternoon || '-'}</p><p className="text-[9px] text-indigo-500 font-bold uppercase">Docente</p><p className="font-bold text-slate-800 text-xs truncate">{viewingStudent.teacherAfternoon || '-'}</p></div></div>
                             )}
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><h4 className="font-bold text-green-600 text-xs uppercase flex items-center gap-1 mb-3"><Activity size={14}/> Salud y Obra Social</h4><div className="flex justify-between items-center text-xs"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Obra Social</span><span className="font-bold text-slate-800">{viewingStudent.healthInsurance || 'NO DECLARA'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Vencimiento CUD</span><span className="font-bold text-red-500">{getSafeDate(viewingStudent.cudExpiration) || '-'}</span></div></div></div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><h4 className="font-bold text-orange-600 text-xs uppercase flex items-center gap-1 mb-3"><User size={14}/> Familia</h4><div className="space-y-3"><div className="flex justify-between items-start border-b border-gray-50 pb-2"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Madre</span><span className="font-bold text-xs">{viewingStudent.motherName || '-'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Contacto</span><span className="font-bold text-blue-600 text-xs">{viewingStudent.motherContact || '-'}</span></div></div><div className="flex justify-between items-start"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Padre</span><span className="font-bold text-xs">{viewingStudent.fatherName || '-'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Contacto</span><span className="font-bold text-blue-600 text-xs">{viewingStudent.fatherContact || '-'}</span></div></div></div><div className="mt-3 pt-2 border-t border-gray-100"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Dirección</span><p className="font-bold text-xs text-gray-700">{viewingStudent.address || 'No registrada'}</p></div></div></div>
                      </div>
                    )}

                    {/* CONTENIDO PESTAÑA 2: BITÁCORA UNIFICADA */}
                   {/* CONTENIDO PESTAÑA 2: BITÁCORA UNIFICADA */}
                    {activeModalTab === 'history' && (
                      <div className="space-y-4 pb-20 animate-in fade-in">
                        {!isWriting && (
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {INCIDENT_TYPES.map((type) => (
                            <button 
                              key={type.label} 
                              onClick={() => handleSaveIncident(type.label, "", type.severity)} 
                              className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color}`}
                            >
                              <span className="text-2xl">{type.emoji}</span>
                              <span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span>
                            </button>
                          ))}
                        </div>
                        )}
                        <div className="space-y-3">
                          {(() => {
                            const normales = (viewingStudent.incidents || []).map(inc => ({ ...inc, source: 'aula' }));
                            
                            const sociales = [];
                            (socialCases || []).filter(c => {
                              if (c.studentId && viewingStudent.id && c.studentId === viewingStudent.id) return true;
                              if (c.dni && viewingStudent.dni && c.dni === viewingStudent.dni) return true;
                              const fullName = `${viewingStudent.lastName || ''}, ${viewingStudent.firstName || ''}`.trim().toLowerCase();
                              return (c.studentName || '').trim().toLowerCase() === fullName;
                            }).forEach(c => {
                              if (c.history && Array.isArray(c.history)) {
                                c.history.forEach(h => {
                                  sociales.push({
                                    date: h.date || new Date().toISOString(),
                                    text: `📋 [Gabinete] ${h.text}`,
                                    author: h.author || 'Gabinete',
                                    severity: 'high',
                                    source: 'social',
                                    isClosed: c.status === 'Archivado' || c.status === 'Reincorporado'
                                  });
                                });
                              }
                            });
                            
                            const combined = [...normales, ...sociales].sort((a, b) => new Date(b.date) - new Date(a.date));
                            return (
                                <div className="flex flex-col gap-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Registros de Bitácora</span>
                                        <button 
                                            onClick={() => imprimirBitacora(viewingStudent, combined)} 
                                            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition shadow-sm"
                                        >
                                            <Printer size={14}/> Imprimir Bitácora
                                        </button>
                                    </div>
                                    
                                    {combined.length === 0 ? (
                                        <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200">
                                            <p className="text-gray-400 text-xs font-bold uppercase italic">Sin registros</p>
                                        </div>
                                    ) : (
                                        combined.map((inc, i) => (
                                          <div key={i} className={`p-4 rounded-2xl border shadow-sm transition-all ${inc.source === 'social' ? (inc.isClosed ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200 ring-2 ring-red-50') : getSeverityColor(inc.severity)}`}>
                                            <div className="flex justify-between items-center mb-2 border-b border-gray-100/50 pb-1">
                                              <span className="text-[10px] font-black text-gray-400 uppercase">{new Date(inc.date).toLocaleDateString('es-AR')}</span>
                                              {inc.source === 'aula' && <button onClick={() => deleteIncident(viewingStudent.id, inc)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={12}/></button>}
                                            </div>
                                            <p className={`text-xs font-bold leading-relaxed ${inc.isClosed ? 'text-slate-500 line-through' : 'text-slate-700'}`}>{inc.text || inc.type}</p>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-2">Origen: {inc.source === 'social' ? 'Gabinete' : 'Aula'} • Por: {inc.author}</p>
                                          </div>
                                        ))
                                    )}
                                </div>
                            );
                          })()}
                        </div>
                        <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100">
                          {isWriting ? (
                            <div className="animate-in slide-in-from-bottom">
                              <textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Detalles..." className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm mb-2 h-24 outline-none"/>
                              <div className="flex gap-2">
                                <button onClick={() => setIsWriting(false)} className="flex-1 py-3 text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
                                <button 
                                  onClick={() => handleSaveIncident("Nota", newNote, "medium")} 
                                  disabled={!newNote.trim() || savingIncident} 
                                  className="flex-[2] py-3 bg-violet-600 text-white rounded-xl font-bold uppercase text-[10px]"
                                >
                                  {savingIncident ? 'Guardando...' : 'Guardar Nota'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setIsWriting(true)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition hover:scale-[1.02]"><Edit3 size={18}/> Redactar Nota</button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CONTENIDO PESTAÑA 3: INFORMES PEDAGÓGICOS/LABORALES */}
                    {activeModalTab === 'reports' && (
                      <div className="space-y-4 animate-in fade-in">
                        
                        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                          <select 
                            value={reportYearFilter} 
                            onChange={(e) => setReportYearFilter(e.target.value)}
                            className="bg-white text-gray-700 font-bold text-xs p-2 rounded-lg outline-none"
                          >
                            <option value="2026">2026</option>
                            <option value="2025">2025</option>
                          </select>
                          <select 
                            value={reportPeriodFilter} 
                            onChange={(e) => setReportPeriodFilter(e.target.value)}
                            className="flex-1 bg-white text-gray-700 font-bold text-xs p-2 rounded-lg outline-none"
                          >
                            <option value="Todos">Todos los períodos</option>
                            <option value="Inicial">Inicial</option>
                            <option value="Medio">Medio</option>
                            <option value="Final">Final</option>
                          </select>
                        </div>

                        <div className="space-y-3">
                          {(() => {
                            const studentReps = studentReports.filter(r => {
                               if (r.studentId !== viewingStudent.id) return false;
                               if (reportPeriodFilter !== 'Todos' && r.periodo !== reportPeriodFilter) return false;
                               // Por ahora el año lo dejamos libre o podemos buscar si tiene fecha de creación, 
                               // pero como todos son 2026 según el código, asumimos que coinciden
                               return true;
                            });

                            if (studentReps.length === 0) {
                              return (
                                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                                   <BookOpen className="mx-auto text-gray-300 mb-2" size={32} />
                                   <p className="text-gray-400 text-xs font-bold uppercase">No hay informes cargados</p>
                                </div>
                              );
                            }

                            return studentReps.map((rep, idx) => (
                               <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-black text-violet-900 uppercase text-sm">{rep.tipoInforme} - {rep.periodo}</h4>
                                      <p className="text-[10px] text-gray-500 font-bold uppercase">{rep.grupo}</p>
                                    </div>
                                    <div className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase flex items-center gap-1">
                                      <CheckCircle2 size={12} /> Guardado
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      let contenedor = document.getElementById('impresion-masiva');
                                      if (!contenedor) {
                                          contenedor = document.createElement('div');
                                          contenedor.id = 'impresion-masiva';
                                          contenedor.className = 'print:block';
                                          document.body.appendChild(contenedor);
                                      }
                                      contenedor.innerHTML = generarHTMLImpresion(viewingStudent, rep);
                                      setTimeout(() => window.print(), 500);
                                    }}
                                    className="w-full py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2"
                                  >
                                    <Printer size={14} /> Imprimir este informe
                                  </button>
                               </div>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                </div>

                {/* BOTONERA INFERIOR */}
                <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-2 shrink-0">
                    <button onClick={()=>openEdit(viewingStudent)} className="px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase hover:bg-blue-700 flex gap-2 items-center shadow-lg"><Edit3 size={16}/> Editar Ficha Técnica</button>
                </div>
            </div>
        </div>
      )}

      {/* 2. MODAL FORMULARIO DE EDICIÓN (COMPLETO) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <h3 className="text-xl font-bold mb-4">{editingStudent ? 'Editar' : 'Nuevo'} Legajo</h3>
                
                {/* FOTO PERFIL */}
                <div className="flex justify-center mb-6">
                    <div className="relative group w-24 h-24">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-violet-100 bg-gray-100 shadow-inner">
                            {photoPreview || editingStudent?.photoUrl ? (
                                <img src={photoPreview || editingStudent?.photoUrl} className="w-full h-full object-cover" alt="Perfil" />
                            ) : (
                                <User size={40} className="text-gray-300 m-auto mt-6" />
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 bg-violet-600 text-white p-2 rounded-full cursor-pointer hover:bg-violet-700 shadow-md">
                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                            {uploading ? <RefreshCw className="animate-spin" size={14} /> : <Edit3 size={14} />}
                        </label>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    {/* SELECTOR MODALIDAD */}
                    <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl">
                        <button type="button" onClick={() => setFormModalidad('Sede')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${formModalidad === 'Sede' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>SEDE</button>
                        <button type="button" onClick={() => setFormModalidad('Inclusión')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${formModalidad === 'Inclusión' ? 'bg-white shadow text-indigo-700' : 'text-gray-400'}`}>INCLUSIÓN</button>
                    </div>

                    {/* ESTADO ACTIVO/INACTIVO */}
                    <div className={`p-3 rounded-xl border mb-2 flex justify-between items-center ${editingStudent?.isActive === false ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase">Estado Actual</label>
                            <p className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                                {editingStudent?.isActive === false ? (
                                    <><AlertCircle size={12} className="text-red-500" /> BAJA / INACTIVO</>
                                ) : (
                                    <><CheckCircle size={12} className="text-green-500" /> ACTIVO (CURSANDO)</>
                                )}
                            </p>
                        </div>
                        <select name="isActive" defaultValue={editingStudent?.isActive === false ? 'false' : 'true'} className="p-2 rounded-lg border text-xs font-bold bg-white outline-none">
                            <option value="true">Activo</option>
                            <option value="false">Inactivo (Baja)</option>
                        </select>
                    </div>

                    {/* NOMBRE Y APELLIDO */}
                    <div className="grid grid-cols-2 gap-3">
                        <input name="firstName" defaultValue={editingStudent?.firstName} placeholder="Nombre" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm" />
                        <input name="lastName" defaultValue={editingStudent?.lastName} placeholder="Apellido" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm" />
                    </div>

                    {/* DNI Y NACIMIENTO */}
                    <div className="grid grid-cols-2 gap-3">
                        <input name="dni" type="number" defaultValue={editingStudent?.dni} placeholder="DNI" className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm" />
                        <input name="birthDate" type="date" defaultValue={getSafeDate(editingStudent?.birthDate)} className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm text-gray-500" />
                    </div>

                    {/* DATOS ESCOLARES Y GÉNERO */}
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
                        <h4 className="font-bold text-blue-700 text-xs uppercase">Datos Escolares y Personales</h4>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-blue-400 uppercase ml-1">Nivel</label>
                                <select name="level" defaultValue={editingStudent?.level} className="p-2 rounded-lg border text-xs font-bold w-full bg-white">
                                    <option value="">Nivel...</option>
                                    <option value="INICIAL">INICIAL</option>
                                    <option value="1° Ciclo">1° Ciclo</option>
                                    <option value="2° Ciclo">2° Ciclo</option>
                                    <option value="CFI">CFI</option>
                                    <option value="SECUNDARIA">SECUNDARIA</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-blue-400 uppercase ml-1">DX</label>
                                <select name="dx" defaultValue={editingStudent?.dx} className="p-2 rounded-lg border text-xs font-bold w-full bg-white">
                                    <option value="">DX...</option>
                                    <option value="DI">DI</option>
                                    <option value="TES">TES</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-blue-400 uppercase ml-1">Género</label>
                                <select name="gender" defaultValue={editingStudent?.gender || ""} className="p-2 rounded-lg border text-xs font-bold w-full bg-white">
                                    <option value="">...</option>
                                    <option value="M">Varón</option>
                                    <option value="F">Mujer</option>
                                    <option value="X">Otro</option>
                                </select>
                            </div>
                        </div>

                        {/* SUB-SECCIÓN POR MODALIDAD */}
                     {formModalidad === 'Sede' ? (
    <>
        {/* GRUPOS */}
        <div className="grid grid-cols-2 gap-2">
            <input name="groupMorning" defaultValue={editingStudent?.groupMorning} placeholder="Grupo TM" className="p-2 rounded-lg border text-xs w-full bg-white" />
            <input name="groupAfternoon" defaultValue={editingStudent?.groupAfternoon} placeholder="Grupo TT" className="p-2 rounded-lg border text-xs w-full bg-white" />
        </div>
        
        {/* DOCENTES TITULARES */}
        <div className="grid grid-cols-2 gap-2">
            <select name="teacherIdMorning" defaultValue={editingStudent?.teacherIdMorning} className="p-2 rounded-lg border text-xs w-full bg-white">
                <option value="">Docente TM...</option>
                {staffSede.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
            <select name="teacherIdAfternoon" defaultValue={editingStudent?.teacherIdAfternoon} className="p-2 rounded-lg border text-xs w-full bg-white">
                <option value="">Docente TT...</option>
                {staffSede.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
        </div>

        {/* AUXILIARES / PRECEPTORES (Campos faltantes) */}
        <div className="grid grid-cols-2 gap-2">
            <select name="auxIdMorning" defaultValue={editingStudent?.auxIdMorning} className="p-2 rounded-lg border text-xs w-full bg-orange-50 border-orange-100">
                <option value="">Auxiliar TM...</option>
                {staffSede.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
            <select name="auxIdAfternoon" defaultValue={editingStudent?.auxIdAfternoon} className="p-2 rounded-lg border text-xs w-full bg-orange-50 border-orange-100">
                <option value="">Auxiliar TT...</option>
                {staffSede.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
        </div>
    </>
) : (
                            <>
                                <input name="originSchool" defaultValue={editingStudent?.originSchool} placeholder="Escuela de Origen" className="w-full p-2 rounded-lg border text-xs font-bold bg-white" />
                                <input name="originGrade" defaultValue={editingStudent?.originGrade} placeholder="Grado/Año" className="w-full p-2 rounded-lg border text-xs bg-white" />
                                <div className="grid grid-cols-2 gap-2">
                                    <select name="daiMorning" defaultValue={editingStudent?.daiMorning} className="p-2 rounded-lg border text-xs bg-white">
                                        <option value="">DAI T. Mañana...</option>
                                        {editingStudent?.daiMorning && !staffInclusion.find(u => u.fullName === editingStudent?.daiMorning) && <option value={editingStudent.daiMorning}>{editingStudent.daiMorning} (Antiguo)</option>}
                                        {staffInclusion.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                                    </select>
                                    <select name="daiAfternoon" defaultValue={editingStudent?.daiAfternoon} className="p-2 rounded-lg border text-xs bg-white">
                                        <option value="">DAI T. Tarde...</option>
                                        {editingStudent?.daiAfternoon && !staffInclusion.find(u => u.fullName === editingStudent?.daiAfternoon) && <option value={editingStudent.daiAfternoon}>{editingStudent.daiAfternoon} (Antiguo)</option>}
                                        {staffInclusion.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                                    </select>
                                </div>
                                <div className="bg-green-50 p-2 rounded-lg border border-green-100 mt-2">
                                    <label className="text-[10px] font-bold text-green-700 uppercase block mb-1">📂 Carpeta Drive Personal</label>
                                    <input name="driveLink" defaultValue={editingStudent?.driveLink} placeholder="https://drive.google.com/..." className="w-full p-2 rounded-lg border text-xs text-green-800 bg-white" />
                                </div>
                            </>
                        )}
                    </div>

                    {/* SALUD Y FAMILIA */}
                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100 space-y-3">
                        <h4 className="font-bold text-green-800 text-xs uppercase">Salud y Familia</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <input name="healthInsurance" defaultValue={editingStudent?.healthInsurance} placeholder="Obra Social" className="w-full p-2 rounded-lg border text-xs bg-white" />
                            <input name="cudExpiration" type="date" defaultValue={getSafeDate(editingStudent?.cudExpiration)} className="w-full p-2 rounded-lg border text-xs text-gray-500 bg-white" />
                        </div>
                        <input name="address" defaultValue={editingStudent?.address} className="w-full p-2 rounded-lg border text-xs bg-white" placeholder="Dirección" />
                        <div className="grid grid-cols-2 gap-2">
                            <input name="motherName" defaultValue={editingStudent?.motherName} placeholder="Madre" className="w-full p-2 rounded-lg border text-xs bg-white" />
                            <input name="motherContact" defaultValue={editingStudent?.motherContact} placeholder="Contacto Madre" className="w-full p-2 rounded-lg border text-xs bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input name="fatherName" defaultValue={editingStudent?.fatherName} placeholder="Padre" className="w-full p-2 rounded-lg border text-xs bg-white" />
                            <input name="fatherContact" defaultValue={editingStudent?.fatherContact} placeholder="Contacto Padre" className="p-2 rounded-lg border text-xs bg-white" />
                        </div>
                        <div className="border-t border-green-200 pt-2">
                            <label className="text-[10px] font-bold text-green-700 uppercase block mb-1">Personas autorizadas a retirar</label>
                            <textarea name="pickupInfo" defaultValue={editingStudent?.pickupInfo} className="w-full p-2 rounded-lg border text-xs h-16 resize-none bg-white" placeholder="Abuela Marta, Tía Juana..." />
                        </div>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-white">
                        <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Guardar</button>
                        {editingStudent && <button type="button" onClick={() => handleDelete(editingStudent.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition border border-red-100"><Trash2 size={20} /></button>}
                    </div>
                </form>
            </div>
        </div>
      )}
      
      {/* 3. MODAL GESTIÓN (NUBE) */}
      {showDataManagement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2"><UploadCloud className="text-blue-500"/> Gestión de Datos</h3>
                    <button onClick={()=>setShowDataManagement(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={findDuplicates} className="p-3 bg-yellow-50 text-yellow-700 rounded-xl font-bold text-xs hover:bg-yellow-100 border border-yellow-200 flex flex-col items-center gap-1">
                            <Search size={16}/> Buscar Duplicados
                        </button>
                      <button onClick={() => { setShowQuickFix(true); setShowDataManagement(false); }} className="p-3 bg-purple-50 text-purple-700 rounded-xl font-bold text-xs hover:bg-purple-100 border border-purple-200 flex flex-col items-center gap-1">
    <Edit3 size={16}/> Saneamiento Rápido
</button>
                        <button onClick={checkUnassigned} className="p-3 bg-red-50 text-red-700 rounded-xl font-bold text-xs hover:bg-red-100 border border-red-200 flex flex-col items-center gap-1">
                            <AlertTriangle size={16}/> Ver Sin Grupo
                        </button>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-gray-600 text-xs mb-2 uppercase">Copia de Seguridad</h4>
                        <div className="flex gap-2">
                            <button onClick={descargarBackup} className="flex-1 py-3 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm flex items-center justify-center gap-2"><Download size={14}/> Descargar JSON</button>
                            <button onClick={handleBulkImport} disabled={processing} className="flex-1 py-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 shadow-sm flex items-center justify-center gap-2">
                                {processing ? <RefreshCw className="animate-spin" size={14}/> : <><UploadCloud size={14}/> Importar JSON</>}
                            </button>
                        </div>
                    </div>
                    <button onClick={handleAutoAssignGenders} disabled={processing} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2">
                        {processing ? <RefreshCw className="animate-spin" size={16}/> : <><User size={16}/> Asignar Género Automático</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL DE DUPLICADOS --- */}
      {duplicates && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="font-black text-red-600 uppercase flex items-center gap-2 text-xl italic">
                <AlertTriangle size={24}/> Duplicados ({duplicates.length})
              </h3>
              <button onClick={() => setDuplicates(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
            </div>
            
            <div className="overflow-y-auto space-y-4 pr-2">
              {duplicates.map((d, i) => (
                <div key={i} className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 bg-white inline-block px-3 py-1 rounded-full shadow-sm">
                    Coincidencia por {d.type}: {d.type === 'DNI' ? d.s2.dni : `${d.s2.lastName}, ${d.s2.firstName}`}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Registro 1 */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-gray-800 text-sm uppercase">{d.s1.lastName}, {d.s1.firstName}</p>
                        <p className="text-[10px] text-gray-500 font-bold mt-1">DNI: <span className="text-gray-800">{d.s1.dni || 'Sin DNI'}</span></p>
                        <p className="text-[10px] text-gray-500 font-bold">Nivel: <span className="text-gray-800">{d.s1.level || 'Sin nivel'}</span></p>
                      </div>
                      <button onClick={async () => { if(confirm("¿Eliminar este registro?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', d.s1.id)); setDuplicates(duplicates.filter(x => x !== d)); } }} className="mt-4 w-full py-2 bg-red-100 text-red-600 rounded-lg text-xs font-black uppercase hover:bg-red-200 transition">
                        Eliminar este
                      </button>
                    </div>

                    {/* Registro 2 */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-red-200 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-gray-800 text-sm uppercase">{d.s2.lastName}, {d.s2.firstName}</p>
                        <p className="text-[10px] text-gray-500 font-bold mt-1">DNI: <span className="text-gray-800">{d.s2.dni || 'Sin DNI'}</span></p>
                        <p className="text-[10px] text-gray-500 font-bold">Nivel: <span className="text-gray-800">{d.s2.level || 'Sin nivel'}</span></p>
                      </div>
                      <button onClick={async () => { if(confirm("¿Eliminar este registro?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', d.s2.id)); setDuplicates(duplicates.filter(x => x !== d)); } }} className="mt-4 w-full py-2 bg-red-500 text-white rounded-lg text-xs font-black uppercase shadow-md hover:bg-red-600 transition">
                        Eliminar clon
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

  {/* 4. MODAL ESTADÍSTICAS (CON DESGLOSE DE EDADES PARA INCLUSIÓN) */}
      {showStats && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                        <h3 className="text-2xl font-black text-violet-900 uppercase italic">Estadísticas</h3>
                        <p className="text-xs text-gray-500">Filtrado Acumulativo Preciso</p>
                    </div>
                    <button onClick={() => setShowStats(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>

                {/* RESULTADO GRANDE Y CONTADORES DIVIDIDOS */}
                <div className="bg-violet-50 p-6 rounded-3xl text-center mb-6 border border-violet-100 shadow-inner shrink-0">
                    <span className="text-5xl font-black text-violet-600 block mb-1">{statsResults.length}</span>
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[4px] mb-4 block">Coincidencias</span>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-white/60 p-2 rounded-2xl border border-blue-100">
                            <span className="block text-xl font-black text-blue-600">{statsResults.filter(x => x.gender === 'M').length}</span>
                            <span className="text-[8px] font-bold text-blue-400 uppercase">Varones</span>
                        </div>
                        <div className="bg-white/60 p-2 rounded-2xl border border-pink-100">
                            <span className="block text-xl font-black text-pink-600">{statsResults.filter(x => x.gender === 'F').length}</span>
                            <span className="text-[8px] font-bold text-pink-400 uppercase">Mujeres</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 overflow-y-auto pr-2 flex-1 custom-scrollbar">
                    
                    {/* NUEVO DESGLOSE DE EDADES EXCLUSIVO PARA INCLUSIÓN */}
                    <div className="bg-indigo-900 text-white p-5 rounded-3xl border border-indigo-950 shadow-md">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-3 ml-1 flex items-center gap-1">
                          📊 Desglose de Edades (Inclusión Activos)
                        </h4>
                        {(() => {
                            // Filtramos estrictamente los estudiantes activos de la modalidad Inclusión
                            const estudiantesInclusion = students.filter(s => s.isActive !== false && (s.modality === 'Inclusión'));
                            
                            // Agrupamos y contamos cuántos alumnos hay por cada edad analizada
                            const conteoEdades = estudiantesInclusion.reduce((acc, s) => {
                                const edad = calculateAge(s.birthDate);
                                if (edad !== '-') {
                                    acc[edad] = (acc[edad] || 0) + 1;
                                }
                                return acc;
                            }, {});

                            // Ordenamos las edades de menor a mayor
                            const edadesOrdenadas = Object.keys(conteoEdades).sort((a, b) => Number(a) - b);

                            if (edadesOrdenadas.length === 0) {
                                return <p className="text-xs italic text-indigo-300 text-center py-2">Sin alumnos de inclusión con fecha cargada.</p>;
                            }

                            return (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {edadesOrdenadas.map(edad => (
                                        <div key={edad} className="bg-white/10 p-2.5 rounded-xl flex justify-between items-center border border-white/5">
                                            <span className="font-bold text-indigo-200">{edad} años:</span>
                                            <span className="font-black bg-white text-indigo-900 px-2 py-0.5 rounded-md text-[11px]">
                                                {conteoEdades[edad]} {conteoEdades[edad] === 1 ? 'alumnx' : 'alumnxs'}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="col-span-2 text-center pt-2 border-t border-white/10 mt-1">
                                        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-wider">
                                            Total Matricula Inclusión: {estudiantesInclusion.length}
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* BOTÓN FILTRO PRE-TALLER */}
                    <div className="p-1 bg-gray-100 rounded-2xl">
                        <button 
                            onClick={() => setStatOnlyPreTaller(!statOnlyPreTaller)}
                            className={`w-full py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${
                                statOnlyPreTaller 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                                : 'bg-white text-gray-400 hover:text-emerald-500'
                            }`}
                        >
                            {statOnlyPreTaller ? '✅ Solo viendo Pre Taller' : '🔍 Filtrar por Pre Taller'}
                        </button>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Niveles</p>
                        <div className="flex flex-wrap gap-2">
                            {['INICIAL', '1° Ciclo', '2° Ciclo', 'CFI', 'SECUNDARIA'].map(lvl => (
                                <button key={lvl} onClick={() => toggleStatFilter('level', lvl)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${statFilters.level.includes(lvl) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200'}`}>{lvl}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Modalidad</p>
                        <div className="flex flex-wrap gap-2">
                            {['Sede', 'Inclusión'].map(mod => (
                                <button key={mod} onClick={() => toggleStatFilter('modality', mod)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${statFilters.modality.includes(mod) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200'}`}>{mod}</button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select value={statFilters.dx} onChange={e => setStatFilters({...statFilters, dx: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">DX: Todos</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select>
                        <select value={statFilters.gender} onChange={e => setStatFilters({...statFilters, gender: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Género: Todos</option><option value="M">Varones (M)</option><option value="F">Mujeres (F)</option></select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select value={statFilters.turn} onChange={e => setStatFilters({...statFilters, turn: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Turno: Todos</option><option value="Mañana">Mañana</option><option value="Tarde">Tarde</option></select>
                        <select value={statFilters.journey} onChange={e => setStatFilters({...statFilters, journey: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Jornada: Todas</option><option value="Simple Mañana">Simple Mañana</option><option value="Simple Tarde">Simple Tarde</option><option value="Doble">Doble</option></select>
                    </div>
                </div>

                <button 
                    onClick={() => {
                        setStatFilters({ modality: [], level: [], dx: 'all', gender: 'all', turn: 'all', journey: 'all' });
                        setStatOnlyPreTaller(false);
                    }} 
                    className="w-full py-3 text-red-400 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 rounded-xl transition mt-6 border border-dashed border-red-100 shrink-0"
                >
                    Limpiar Filtros
                </button>
            </div>
        </div>
      )}
  {/* 6. MODAL SANEAMIENTO RÁPIDO (LÓGICA ESTRICTA M/F) */}
      {showQuickFix && (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-8 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase italic">Saneamiento de Datos</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Garantizando precisión en la matrícula</p>
              </div>
              <button onClick={() => setShowQuickFix(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
            </div>

            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl">
              <button onClick={() => setFixingField('gender')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition ${fixingField === 'gender' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Falta Género (Estricto)</button>
              <button onClick={() => setFixingField('dx')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition ${fixingField === 'dx' ? 'bg-white shadow text-purple-600' : 'text-gray-400'}`}>Falta Diagnóstico</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {students.filter(s => {
                  if (s.isActive === false) return false;
                  const value = s[fixingField];
                  
                  // LÓGICA ESTRICTA: 
                  // Si estamos en género, solo dejamos pasar si es exactamente 'M' o 'F'.
                  // Cualquier otra cosa (X, null, "", undefined) se considera dato a sanear.
                  if (fixingField === 'gender') {
                      return value !== 'M' && value !== 'F';
                  }
                  
                  return !value || (typeof value === 'string' && value.trim() === "");
              }).length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-bold uppercase italic">✨ ¡Matrícula 100% precisa y saneada!</div>
              ) : (
                students.filter(s => {
                    if (s.isActive === false) return false;
                    const val = s[fixingField];
                    if (fixingField === 'gender') return val !== 'M' && val !== 'F';
                    return !val || (typeof val === 'string' && val.trim() === "");
                }).map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-md transition">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-700 uppercase text-sm">{s.lastName}, {s.firstName}</span>
                        {s.gender === 'X' && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded font-black">TIENE X</span>}
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{s.modality || 'Sede'} - {s.level || 'Sin Nivel'}</span>
                    </div>
                    
                    {fixingField === 'gender' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleQuickUpdate(s.id, 'gender', 'M')} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition shadow-sm">VARÓN</button>
                        <button onClick={() => handleQuickUpdate(s.id, 'gender', 'F')} className="px-4 py-2 bg-pink-100 text-pink-700 rounded-xl text-xs font-black hover:bg-pink-600 hover:text-white transition shadow-sm">MUJER</button>
                    </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => handleQuickUpdate(s.id, 'dx', 'TES')} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black hover:bg-purple-600 hover:text-white transition">TES</button>
                        <button onClick={() => handleQuickUpdate(s.id, 'dx', 'DI')} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black hover:bg-purple-600 hover:text-white transition">DI</button>
                        <input 
                          onBlur={(e) => e.target.value && handleQuickUpdate(s.id, 'dx', e.target.value)}
                          placeholder="Otro..." 
                          className="w-20 p-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold outline-none focus:border-purple-400 shadow-sm"
                        />
                    </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-6 font-bold uppercase tracking-widest">Los cambios se guardan automáticamente en la nube</p>
          </div>
        </div>
      )}
      {/* 5. MODAL SIN GRUPO */}
      {showUnassigned && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[90]">
            <div className="bg-white rounded-3xl p-6 w-full max-w-2xl h-[80vh] flex flex-col">
                <div className="flex justify-between mb-4">
                    <h3 className="font-bold text-red-600">Alumnos Sin Grupo / Sin DAI ({unassignedList.length})</h3>
                    <button onClick={()=>setShowUnassigned(false)}><X/></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {unassignedList.map(s=>(
                        <div key={s.id} className="flex justify-between items-center bg-red-50 p-3 rounded-xl">
                            <span className="font-bold">{s.lastName}, {s.firstName} <span className="text-red-500 text-xs ml-2">({s.modality || 'Sede'})</span></span>
                            <div className="flex gap-2">
                                <button onClick={()=>{openEdit(s); setShowUnassigned(false)}} className="text-xs bg-white px-2 py-1 rounded border">Editar</button>
                                <button onClick={()=>markAsInactive(s)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Baja</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
