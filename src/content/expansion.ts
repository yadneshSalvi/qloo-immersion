/** Original AI-assisted CC0 fiction. Bands are author recommendations, not certification.
 * Listening pieces use the application's disclosed browser-speech fallback; no recorded
 * creator performance, video, factual cultural account, or educator validation is claimed.
 */
import type { Draft } from './corpus';
import { cinemaDrafts } from './expansion-cinema';
import { literatureDrafts } from './expansion-literature';
import { foodDrafts } from './expansion-food';
import { designDrafts } from './expansion-design';
import { placesDrafts } from './expansion-places';

export const expansionDrafts: Draft[] = [
  {
    id: 'la-radio-de-la-lavanderia',
    title: 'La radio de la lavandería',
    subtitle: 'Three songs for the time between wash and rinse.',
    description: 'A fictional laundry-room listening club chooses a fair way to share its radio.',
    cluster: 'music',
    band: 'A2',
    format: 'read',
    country: 'Colombia',
    variety: 'Colombian setting; general Spanish',
    scene: 'An imagined laundry room in Bogotá',
    palette: 'record',
    objective: 'Follow a simple rule and explain a shared musical choice.',
    segments: [
      [
        'La espera',
        'Los martes, Julia lava la ropa en una lavandería de su barrio. Las máquinas tardan cuarenta minutos. Siempre lleva una revista, pero hoy la deja en casa. En una mesa hay una radio pequeña. El empleado la enciende y pregunta qué música quieren escuchar. Tres clientes dan tres respuestas diferentes. Julia sonríe: la espera ya parece menos larga.',
        'On Tuesdays, Julia washes clothes at a neighborhood laundry. The machines take forty minutes. She always brings a magazine, but today she leaves it at home. There is a small radio on a table. The employee turns it on and asks what music they want to hear. Three customers give three different answers. Julia smiles: the wait already seems shorter.',
      ],
      [
        'Los turnos',
        'Un señor quiere música rápida y una estudiante prefiere canciones tranquilas. Julia propone una regla: cada persona puede elegir una canción y después pasa el turno. El empleado escribe los nombres en un papel. No ponen el volumen muy alto porque necesitan oír las máquinas. Julia elige una canción con piano, sin voz, para empezar la tarde.',
        'A man wants fast music and a student prefers quiet songs. Julia suggests a rule: each person can choose one song and then passes the turn. The employee writes the names on paper. They do not turn the volume up very high because they need to hear the machines. Julia chooses a song with piano and no voice to start the afternoon.',
      ],
      [
        'La próxima vez',
        'Cuando termina su lavado, Julia todavía escucha la canción de la estudiante. Dobla las camisas despacio y pregunta el nombre del grupo. Lo apunta en su revista la semana siguiente. Ahora trae también un lápiz a la lavandería. No todas las canciones le gustan, pero siempre encuentra algo nuevo durante la espera.',
        'When her wash ends, Julia is still listening to the student’s song. She slowly folds her shirts and asks the band’s name. She writes it in her magazine the following week. Now she also brings a pencil to the laundry. She does not like every song, but she always finds something new while waiting.',
      ],
    ],
    words: [
      [
        'lavandería',
        'laundry / laundromat',
        0,
        'Here, a business where customers wash their clothes.',
      ],
      ['turno', 'turn', 1, 'Each customer gets a turn to choose one song.'],
      ['Dobla', 'folds', 2, 'Julia folds the clean shirts after washing them.'],
    ],
    questions: [
      [
        'What does Julia leave at home today?',
        ['Her laundry', 'Her magazine', 'Her radio'],
        1,
        0,
        'She usually brings a magazine, but today she leaves it at home.',
      ],
      [
        'Why do they keep the volume low?',
        ['The radio is broken', 'Only Julia can listen', 'They need to hear the machines'],
        2,
        1,
        'The passage directly links the low volume to hearing the machines.',
      ],
      [
        'What does Julia ask after hearing the student’s song?',
        ['The name of the band', 'The price of a shirt', 'The employee’s address'],
        0,
        2,
        'Julia asks the band’s name and later writes it down.',
      ],
    ],
    practice: [
      'Complete the expression: «Ahora pasa el ___». (Now pass the turn.)',
      ['turno'],
      1,
      '“Pasar el turno” means to let the next person take a turn, as in their listening rule.',
      'Find the noun after “pasa el” in passage 2.',
    ],
  },
  {
    id: 'el-ensayo-del-domingo',
    title: 'El ensayo del domingo',
    subtitle: 'A new drummer learns when to leave space.',
    description:
      'Listen to a fictional rehearsal in which playing less helps the group stay together.',
    cluster: 'music',
    band: 'A2',
    format: 'listen',
    country: 'Spain',
    variety: 'Spanish setting; general Spanish',
    scene: 'An imagined practice room in Zaragoza',
    palette: 'bridge',
    objective: 'Identify a rehearsal problem and follow the steps used to solve it.',
    segments: [
      [
        'Un grupo pequeño',
        'Leo toca la batería en un grupo de cuatro amigos. El domingo ensayan en una sala junto al río. Tienen una guitarra, un teclado y una cantante. Leo conoce bien la canción, pero hoy toca demasiado fuerte. La cantante levanta la mano. «No puedo escuchar el teclado», dice. Los cuatro paran y dejan los instrumentos en silencio.',
        'Leo plays drums in a band of four friends. On Sunday they rehearse in a room beside the river. They have a guitar, a keyboard, and a singer. Leo knows the song well, but today he plays too loudly. The singer raises her hand. “I cannot hear the keyboard,” she says. All four stop and leave the instruments silent.',
      ],
      [
        'Un cambio',
        'Primero toca solo el teclado. Después entra la guitarra y la cantante empieza a cantar. Leo espera hasta el final de la primera frase. Entonces toca un ritmo más suave. Esta vez puede oír a sus amigos. Le cuesta esperar, pero mueve la cabeza para seguir el ritmo. No necesita tocar durante toda la canción.',
        'First only the keyboard plays. Then the guitar comes in and the singer begins singing. Leo waits until the end of the first phrase. Then he plays a softer rhythm. This time he can hear his friends. Waiting is difficult for him, but he moves his head to follow the rhythm. He does not need to play throughout the entire song.',
      ],
      [
        'La grabación',
        'Al final graban la canción con un teléfono. Escuchan juntos la grabación antes de guardar los instrumentos. Leo reconoce la voz y el teclado con claridad. Pide otra copia para practicar en casa. El próximo domingo quiere probar el mismo ritmo, pero también recordar los momentos en que tiene que esperar.',
        'At the end they record the song on a phone. They listen to the recording together before putting away their instruments. Leo hears the voice and keyboard clearly. He asks for another copy to practice at home. Next Sunday he wants to try the same rhythm, while also remembering the moments when he has to wait.',
      ],
    ],
    words: [
      ['ensayan', 'rehearse', 0, 'The friends practice music together before a performance.'],
      ['suave', 'soft / gentle', 1, 'Here it describes a quieter drum rhythm.'],
      ['guardar', 'to put away', 2, 'They put away their instruments after listening.'],
    ],
    questions: [
      [
        'What can the singer not hear at first?',
        ['The keyboard', 'Traffic outside', 'A phone call'],
        0,
        0,
        'The singer explicitly says she cannot hear the keyboard.',
      ],
      [
        'When does Leo start playing in the second attempt?',
        ['Before the keyboard', 'At the end of the first phrase', 'After everyone goes home'],
        1,
        1,
        'Leo waits until the first phrase ends before joining softly.',
      ],
      [
        'Why does Leo request a copy of the recording?',
        ['To delete the keyboard', 'To sell it', 'To practice at home'],
        2,
        2,
        'He asks for another copy so he can practice at home.',
      ],
    ],
    practice: [
      'Complete the sequence: «___ toca solo el teclado». (First only the keyboard plays.)',
      ['primero'],
      1,
      '“Primero” introduces the first step in a sequence; it begins their new rehearsal approach.',
      'Use the first word of passage 2.',
    ],
  },
  {
    id: 'una-cancion-dos-versiones',
    title: 'Una canción, dos versiones',
    subtitle: 'The same melody can hold two different evenings.',
    description:
      'A fictional musician compares two arrangements without making one the only right answer.',
    cluster: 'music',
    band: 'B1',
    format: 'listen',
    country: 'Argentina',
    variety: 'Argentine setting; general Spanish',
    scene: 'An imagined home studio in Rosario',
    palette: 'nocturne',
    objective: 'Compare interpretations and distinguish a choice from a judgment.',
    segments: [
      [
        'Dos archivos',
        'Vera había compuesto una melodía para una fiesta de su edificio y guardaba dos versiones en el ordenador. La primera tenía percusión rápida y varias voces; la segunda, solo una guitarra y su propia voz. Al preparar un pequeño concierto, envió ambos archivos a su vecino Bruno. Esperaba que eligiera la versión más rápida, porque él siempre bailaba en las fiestas. Su respuesta, sin embargo, la sorprendió.',
        'Vera had composed a melody for a party in her building and kept two versions on her computer. The first had fast percussion and several voices; the second, only a guitar and her own voice. While preparing a small concert, she sent both files to her neighbor Bruno. She expected him to choose the faster version because he always danced at parties. His response, however, surprised her.',
      ],
      [
        'Una respuesta distinta',
        'Bruno prefirió la versión lenta. Explicó que podía entender mejor las palabras y que el silencio entre las frases le recordaba una conversación. Vera volvió a escuchar las dos grabaciones con auriculares. En la rápida había una energía que seguía gustándole, pero en la lenta descubrió detalles que antes había pasado por alto. No cambió la melodía: anotó qué efecto producía cada arreglo y en qué espacio quería tocarlo.',
        'Bruno preferred the slow version. He explained that he could understand the words better and that the silence between phrases reminded him of a conversation. Vera listened to both recordings again with headphones. The fast one had an energy she still liked, but in the slow one she discovered details she had previously overlooked. She did not change the melody: she noted the effect of each arrangement and the space where she wanted to play it.',
      ],
      [
        'El programa',
        'Finalmente abrió el concierto con la guitarra y dejó la versión rápida para el final, cuando había más gente en el patio. Presentó las dos como decisiones diferentes, no como una prueba con una respuesta correcta. Bruno cantó con el grupo en la última canción. Vera comprendió que conocer el gusto de alguien no permitía adivinar todas sus elecciones, ni siquiera dentro de una misma noche.',
        'She finally opened the concert with guitar and saved the fast version for the end, when more people were in the courtyard. She presented them as different decisions, rather than a test with one correct answer. Bruno sang with the group during the last song. Vera understood that knowing someone’s taste did not let her predict every choice, even within a single evening.',
      ],
    ],
    words: [
      ['percusión', 'percussion', 0, 'Instruments providing the beat in the first arrangement.'],
      ['arreglo', 'arrangement', 1, 'The musical treatment of the same melody.'],
      ['adivinar', 'to guess / predict', 2, 'Here, to know someone’s choice before they tell you.'],
    ],
    questions: [
      [
        'Why does Vera expect Bruno to choose the fast version?',
        ['He wrote it', 'He dislikes guitar', 'He usually dances at parties'],
        2,
        0,
        'Her expectation comes from seeing him dance at parties, rather than from his answer.',
      ],
      [
        'What does Bruno value in the slower recording?',
        ['Clearer words and pauses', 'A louder drum sound', 'More singers'],
        0,
        1,
        'He can understand the words and notices the silence between phrases.',
      ],
      [
        'How does Vera organize the concert?',
        [
          'She plays only the fast version',
          'Guitar first, fast version at the end',
          'She cancels both versions',
        ],
        1,
        2,
        'She opens with guitar and saves the energetic arrangement for the later, fuller courtyard.',
      ],
    ],
    practice: [
      'Complete the expression: «Había pasado esos detalles por ___». (She had overlooked those details.)',
      ['alto'],
      1,
      '“Pasar por alto” means to overlook something; Vera notices details she previously missed.',
      'The expression follows “había pasado por” in passage 2.',
    ],
  },
  {
    id: 'el-archivo-de-las-campanas',
    title: 'El archivo de las campanas',
    subtitle: 'A sound archive learns to include its uncertainties.',
    description: 'Read an original fictional account of labeling old recordings with care.',
    cluster: 'music',
    band: 'B1',
    format: 'read',
    country: 'Chile',
    variety: 'Chilean setting; general Spanish',
    scene: 'An imagined neighborhood archive in La Serena',
    palette: 'record',
    objective: 'Separate documented information from an uncertain interpretation.',
    segments: [
      [
        'Las cajas',
        'Nicolás ayudaba a ordenar un archivo vecinal cuando encontró una caja de grabaciones de campanas. En las etiquetas aparecían fechas, pero faltaban casi todos los lugares. Una de las grabaciones le recordó el reloj de la escuela donde había estudiado. Estuvo a punto de escribir el nombre en la ficha, aunque no tenía ningún documento que confirmara su recuerdo. Decidió escucharla otra vez antes de completar el catálogo.',
        'Nicolás was helping organize a neighborhood archive when he found a box of bell recordings. The labels showed dates, but nearly all the locations were missing. One recording reminded him of the clock at his old school. He nearly wrote the name on the record, although he had no document confirming his memory. He decided to listen again before completing the catalog.',
      ],
      [
        'Las pistas',
        'Invitó a dos antiguas vecinas a escuchar el archivo en una sala tranquila. Una reconoció la campana de una fábrica; la otra pensó que era la de un mercado. Nicolás anotó las dos propuestas con los nombres de quienes las habían hecho. Después comparó fotografías de los edificios, sin encontrar una respuesta definitiva. La fecha de la caja tampoco garantizaba que todas las cintas fueran de ese mismo año.',
        'He invited two former neighbors to listen to the recording in a quiet room. One recognized a factory bell; the other thought it was a market bell. Nicolás noted both suggestions with the names of the people who made them. He then compared photographs of the buildings without finding a definite answer. The date on the box did not guarantee that every tape was from that year either.',
      ],
      [
        'Una ficha abierta',
        'La ficha final conservó la fecha de la etiqueta y describió el sonido, pero dejó el lugar como desconocido. En un apartado separado incluyó los recuerdos de las vecinas y su propia hipótesis sobre la escuela. Así, otra persona podría investigar sin confundir una posibilidad con un dato comprobado. Nicolás prefería una pregunta visible a una dirección precisa que quizá llevara a alguien por el camino equivocado.',
        'The final record kept the date from the label and described the sound, but left the location as unknown. In a separate section he included the neighbors’ memories and his own school hypothesis. That way, someone else could investigate without confusing a possibility with a verified fact. Nicolás preferred a visible question to a precise address that might send someone in the wrong direction.',
      ],
    ],
    words: [
      ['etiquetas', 'labels', 0, 'The written labels on the recordings.'],
      ['propuestas', 'suggestions', 1, 'The two possible locations suggested by the neighbors.'],
      [
        'comprobado',
        'verified',
        2,
        'A fact supported by a check, unlike a proposed identification.',
      ],
    ],
    questions: [
      [
        'What makes Nicolás think of his old school?',
        ['A familiar sound', 'A photograph inside the box', 'The school’s written address'],
        0,
        0,
        'The recording reminds him of the school clock; no document confirms that memory.',
      ],
      [
        'What happens when the two neighbors listen?',
        [
          'They identify the same place',
          'Their proposed locations differ',
          'They refuse to comment',
        ],
        1,
        1,
        'One proposes a factory, while the other proposes a market.',
      ],
      [
        'How is the location recorded in the final entry?',
        ['As definitely the school', 'As definitely the market', 'As unknown'],
        2,
        2,
        'He leaves the location unknown and places hypotheses in a separate section.',
      ],
    ],
    practice: [
      'Complete the expression: «Estuvo a ___ de escribir el nombre». (He was about to write the name.)',
      ['punto'],
      0,
      '“Estar a punto de” plus an infinitive means to be about to do something.',
      'Find the expression before “de escribir” in passage 1.',
    ],
  },
  ...cinemaDrafts,
  ...literatureDrafts,
  ...foodDrafts,
  ...designDrafts,
  ...placesDrafts,
];
