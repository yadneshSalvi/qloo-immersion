/** Original fictional teaching scenes written for IMMERSION with AI assistance.
 * No third-party passage, transcript, Qloo mapping, or educator review is implied.
 * This module is server-only by import boundary: answer keys never enter client props.
 */
import type { Cluster, Band, Format, Source, PublicAssessment } from '../domain/types';
export interface AnswerKey extends PublicAssessment {
  answer: string[];
  explanation: string;
}
export interface CorpusEntry {
  source: Source;
  assessments: AnswerKey[];
}
type Draft = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  cluster: Cluster;
  band: Band;
  format: Format;
  country: string;
  variety: string;
  scene: string;
  palette: string;
  objective: string;
  segments: [string, string, string][];
  words: [string, string, number, string][];
  questions: [string, [string, string, string], number, number, string][];
  practice: [string, string[], number, string, string];
};
function entry(d: Draft, index: number): CorpusEntry {
  const segments = d.segments.map(([label, text, translation], i) => ({
    id: `${d.id}-s${i + 1}`,
    label,
    text,
    translation,
  }));
  const versionId = `${d.id}:1`;
  const source: Source = {
    id: d.id,
    versionId,
    title: d.title,
    subtitle: d.subtitle,
    description: d.description,
    cluster: d.cluster,
    band: d.band,
    format: d.format,
    minutes: d.band === 'A2' ? 6 : 8,
    country: d.country,
    variety: d.variety,
    scene: d.scene,
    palette: d.palette,
    issue: String(index + 1).padStart(2, '0'),
    objective: d.objective,
    preview: segments[0].text,
    wordCount: segments.reduce((n, s) => n + s.text.split(/\s+/).length, 0),
    releasedAt: '2026-10-24T00:00:00.000Z',
    provenance: {
      mode: 'authored-sample',
      authorship:
        'Original IMMERSION sample, written with AI assistance. Fictional characters and scenes.',
      educatorReview: 'pending',
      license: 'CC0-1.0 original sample text; no third-party media',
      qlooMapping: null,
    },
    segments,
    glossary: d.words.map(([word, meaning, segment, note], i) => ({
      id: `${d.id}-w${i + 1}`,
      word,
      meaning,
      segmentId: segments[segment].id,
      note,
    })),
  };
  const assessments: AnswerKey[] = d.questions.map(
    ([prompt, choices, correct, segment, explanation], i) => ({
      id: `${d.id}-q${i + 1}`,
      objectiveId: `${d.cluster}-detail-1`,
      kind: 'comprehension',
      prompt,
      options: choices.map((text, j) => ({ id: String(j + 1), text })),
      sourceSegmentIds: [segments[segment].id],
      hint: `Look again at passage ${segment + 1}.`,
      answer: [String(correct + 1)],
      explanation,
    }),
  );
  assessments.push({
    id: `${d.id}-practice`,
    objectiveId: 'use-source-expression-1',
    kind: 'practice',
    prompt: d.practice[0],
    options: [],
    sourceSegmentIds: [segments[d.practice[2]].id],
    answer: d.practice[1],
    explanation: d.practice[3],
    hint: d.practice[4],
  });
  return { source, assessments };
}
const drafts: Draft[] = [
  {
    id: 'una-mesa-en-el-mercado',
    title: 'Una mesa en el mercado',
    subtitle: 'A little conversation. A different kind of lunch.',
    description:
      'Take a seat at a small market counter, where the best thing on the menu might be a conversation.',
    cluster: 'food',
    band: 'A2',
    format: 'read',
    country: 'Mexico',
    variety: 'Mexican Spanish vocabulary',
    scene: 'An imagined market in Oaxaca',
    palette: 'market',
    objective: 'Find the reason behind a choice and describe what you would like.',
    segments: [
      [
        'La llegada',
        'Clara entra en un mercado pequeño de Oaxaca. Tiene hambre, pero no sabe qué pedir. En un puesto hay una mesa larga y seis sillas. Una mujer prepara sopa de calabaza. «Hoy hace frío. La sopa está caliente», dice la mujer. Clara se sienta cerca de la ventana.',
        'Clara walks into a small market in Oaxaca. She is hungry, but does not know what to order. At one stall there is a long table and six chairs. A woman is making squash soup. “It is cold today. The soup is hot,” the woman says. Clara sits near the window.',
      ],
      [
        'Una conversación',
        'Un señor llega con una bolsa de tomates. Se llama Luis y trabaja en una librería. Clara le pregunta por el mercado. «Vengo los martes porque hay menos gente», explica. La mujer les sirve la sopa con pan. Luis deja su teléfono en el bolsillo y empieza a contar una historia.',
        'A man arrives with a bag of tomatoes. His name is Luis and he works in a bookshop. Clara asks him about the market. “I come on Tuesdays because there are fewer people,” he explains. The woman serves them soup with bread. Luis leaves his phone in his pocket and begins telling a story.',
      ],
      [
        'La despedida',
        'Después de comer, Clara pide la cuenta. La sopa cuesta poco, pero ella recuerda sobre todo la conversación. Antes de salir, compra dos tomates para la cena. «El próximo martes vuelvo», dice. No vuelve solo por la comida: quiere saber cómo termina la historia de Luis.',
        'After eating, Clara asks for the bill. The soup costs little, but what she remembers most is the conversation. Before leaving, she buys two tomatoes for dinner. “I will come back next Tuesday,” she says. She is not returning only for the food: she wants to know how Luis’s story ends.',
      ],
    ],
    words: [
      ['puesto', 'stall', 0, 'Here, a small place selling food inside a market.'],
      ['bolsillo', 'pocket', 1, '“En el bolsillo” means “in the pocket.”'],
      ['cuenta', 'bill', 2, '“Pedir la cuenta” is a useful way to ask for the bill.'],
    ],
    questions: [
      [
        'What is the woman preparing at the stall?',
        ['Squash soup', 'Tomato salad', 'A cup of coffee'],
        0,
        0,
        'The woman is preparing squash soup in the first passage. “Sopa de calabaza” is squash soup.',
      ],
      [
        'Why does Luis come on Tuesdays?',
        ['The soup is free', 'There are fewer people', 'The bookshop is closed'],
        1,
        1,
        'Luis gives the reason explicitly: “porque hay menos gente” — because there are fewer people.',
      ],
      [
        'What especially makes Clara want to return?',
        ['Buying more tomatoes', 'Finding a cheaper lunch', 'Hearing the end of Luis’s story'],
        2,
        2,
        'Clara wants to know how the story ends. Food and price are mentioned, but they are not her main reason to return.',
      ],
    ],
    practice: [
      'Complete this request with one word: «Quiero pedir la ___, por favor». (I would like the bill.)',
      ['cuenta'],
      2,
      'Use “la cuenta” for the bill: “Quiero pedir la cuenta, por favor.” The feminine article “la” agrees with “cuenta.”',
      'The useful expression is in the final passage.',
    ],
  },
  {
    id: 'la-receta-que-viaja',
    title: 'La receta que viaja',
    subtitle: 'What changes when a recipe leaves home?',
    description:
      'A family recipe crosses a city, and a small substitution becomes a story about belonging.',
    cluster: 'food',
    band: 'B1',
    format: 'listen',
    country: 'Colombia',
    variety: 'Colombian setting; general Spanish',
    scene: 'An imagined kitchen in Bogotá',
    palette: 'citrus',
    objective: 'Understand a contrast and explain a practical decision.',
    segments: [
      [
        'El cuaderno',
        'Cuando Inés se mudó a Bogotá, llevó una maleta y el cuaderno de recetas de su padre. Los domingos preparaba una sopa que le recordaba su casa. Una mañana descubrió que en la tienda del barrio no vendían una de las hierbas de la receta. En lugar de abandonar el plan, decidió preguntar a su vecina.',
        'When Inés moved to Bogotá, she took a suitcase and her father’s recipe notebook. On Sundays she made a soup that reminded her of home. One morning she discovered that the neighborhood shop did not sell one of the herbs in the recipe. Instead of giving up on the plan, she decided to ask her neighbor.',
      ],
      [
        'Otro ingrediente',
        'Su vecina, Marta, le ofreció una hierba distinta. «El sabor no será igual, pero puede quedar bien», dijo. Cocinaron juntas y probaron la sopa varias veces. Inés añadió un poco de limón al final. El resultado era diferente: menos intenso, más fresco. Antes de servir, escribió el cambio en el margen del cuaderno.',
        'Her neighbor Marta offered her a different herb. “The flavor will not be the same, but it may turn out well,” she said. They cooked together and tasted the soup several times. Inés added a little lemon at the end. The result was different: less intense, fresher. Before serving, she wrote the change in the notebook’s margin.',
      ],
      [
        'Una llamada',
        'Esa tarde Inés llamó a su padre. Tenía miedo de que no le gustara el cambio, pero él se rio. Le contó que su propia versión tampoco era la original: había cambiado un ingrediente muchos años antes. Inés comprendió que conservar una receta no siempre significa repetirla exactamente. A veces significa seguir compartiéndola.',
        'That afternoon Inés called her father. She was afraid he would dislike the change, but he laughed. He told her that his own version was not the original either: he had changed an ingredient many years earlier. Inés understood that preserving a recipe does not always mean repeating it exactly. Sometimes it means continuing to share it.',
      ],
    ],
    words: [
      ['barrio', 'neighborhood', 0, 'A district or local area within a town or city.'],
      ['margen', 'margin', 1, 'The empty edge of a page, where Inés writes her change.'],
      ['compartir', 'to share', 2, 'The infinitive appears within “compartiéndola”: sharing it.'],
    ],
    questions: [
      [
        'Why does Inés ask Marta for help?',
        ['She cannot find an herb', 'She has lost her notebook', 'She has no kitchen'],
        0,
        0,
        'The shop does not sell an herb in the recipe, so Inés asks her neighbor.',
      ],
      [
        'Where does Inés record the change?',
        ['In a phone message', 'In the notebook’s margin', 'On the shop door'],
        1,
        1,
        'She writes it “en el margen del cuaderno.”',
      ],
      [
        'What does her father reveal?',
        ['He dislikes lemon', 'The recipe must never change', 'He also changed an ingredient'],
        2,
        2,
        'His version was already an adaptation. This helps Inés see sharing as part of preserving the recipe.',
      ],
    ],
    practice: [
      'Complete the contrast with one word: «El sabor es diferente, ___ está bueno». (The flavor is different, but it is good.)',
      ['pero'],
      1,
      '“Pero” connects contrasting ideas: different flavor, good result. “Porque” would give a reason instead.',
      'You need the Spanish word for “but.”',
    ],
  },
  {
    id: 'el-cine-de-los-jueves',
    title: 'El cine de los jueves',
    subtitle: 'The screen is small. The evening isn’t.',
    description: 'One projector, a courtyard, and a neighborhood that stays after the credits.',
    cluster: 'cinema',
    band: 'A2',
    format: 'read',
    country: 'Spain',
    variety: 'Peninsular Spanish vocabulary',
    scene: 'An imagined courtyard in Valencia',
    palette: 'cinema',
    objective: 'Follow an event sequence and identify a shared plan.',
    segments: [
      [
        'Antes de la película',
        'Cada jueves, Eva lleva un proyector al patio de su edificio. No hay entradas ni asientos numerados. Los vecinos traen sus propias sillas. Esta noche van a ver una película corta sobre un viaje en tren. Eva coloca una sábana blanca en la pared y espera a que se haga de noche.',
        'Every Thursday, Eva takes a projector to her building’s courtyard. There are no tickets or numbered seats. The neighbors bring their own chairs. Tonight they are going to watch a short film about a train journey. Eva puts a white sheet on the wall and waits for it to get dark.',
      ],
      [
        'Una pausa',
        'A mitad de la película empieza a llover. Eva apaga el proyector y todos recogen las sillas. Por suerte, la sala de la planta baja está libre. Un vecino abre la puerta y otro busca toallas. En diez minutos están dentro. La pantalla es más pequeña, pero nadie quiere volver a casa.',
        'Halfway through the film, it starts to rain. Eva turns off the projector and everyone gathers the chairs. Luckily, the ground-floor room is free. One neighbor opens the door and another looks for towels. Within ten minutes they are inside. The screen is smaller, but nobody wants to go home.',
      ],
      [
        'Después',
        'Al terminar, hablan del último personaje que aparece en el tren. Algunos creen que está perdido; otros piensan que busca a un amigo. Eva no decide quién tiene razón. Propone otra película para el próximo jueves. Todos aceptan, pero esta vez van a consultar el tiempo antes de preparar el patio.',
        'When it ends, they talk about the last character who appears on the train. Some think he is lost; others think he is looking for a friend. Eva does not decide who is right. She suggests another film for next Thursday. Everyone agrees, but this time they will check the weather before preparing the courtyard.',
      ],
    ],
    words: [
      ['sábana', 'sheet', 0, 'A bedsheet, used as a screen in this fictional scene.'],
      ['llover', 'to rain', 1, '“Empieza a llover” means “it starts to rain.”'],
      ['razón', 'reason / being right', 2, '“Tener razón” means “to be right.”'],
    ],
    questions: [
      [
        'What do the neighbors bring?',
        ['Tickets', 'Their own chairs', 'A television'],
        1,
        0,
        'The text says “Los vecinos traen sus propias sillas.”',
      ],
      [
        'Why do they move indoors?',
        ['It starts to rain', 'The film ends', 'The projector breaks'],
        0,
        1,
        'Rain interrupts the outdoor screening. The projector is switched off so they can move.',
      ],
      [
        'What will they do before the next screening?',
        ['Buy a larger screen', 'Cancel the event', 'Check the weather'],
        2,
        2,
        'They will “consultar el tiempo” before preparing the courtyard.',
      ],
    ],
    practice: [
      'Complete the plan with one word: «El jueves vamos a ___ una película». (On Thursday we are going to watch a film.)',
      ['ver'],
      0,
      'After “vamos a,” use an infinitive: “ver.” “Vamos a ver” expresses a plan to watch.',
      'Use the infinitive of the verb meaning “to see / watch.”',
    ],
  },
  {
    id: 'fuera-de-campo',
    title: 'Fuera de campo',
    subtitle: 'A story told by what you cannot see.',
    description: 'A young filmmaker discovers that an empty frame can still have a voice.',
    cluster: 'cinema',
    band: 'B1',
    format: 'listen',
    country: 'Argentina',
    variety: 'Argentine setting; general Spanish',
    scene: 'An imagined editing room in Córdoba',
    palette: 'nocturne',
    objective: 'Infer a creative intention from evidence in a story.',
    segments: [
      [
        'La primera versión',
        'Tomás estaba montando un corto sobre la despedida de dos hermanos. Había filmado muchos primeros planos, pero al verlos juntos sentía que explicaban demasiado. Su profesora le pidió que escuchara la escena sin mirar la pantalla. Entonces notó algo que había ignorado: el ruido de una llave al caer al suelo.',
        'Tomás was editing a short film about two siblings saying goodbye. He had filmed many close-ups, but watching them together he felt they explained too much. His teacher asked him to listen to the scene without looking at the screen. Then he noticed something he had ignored: the sound of a key falling to the floor.',
      ],
      [
        'La puerta vacía',
        'En la nueva versión, la cámara se queda frente a una puerta vacía. Las voces de los hermanos llegan desde otra habitación. Se oye la llave y luego un silencio largo. Tomás quitó la música que había añadido al principio. Quería que el público prestara atención a esos sonidos pequeños y pudiera imaginar lo que ocurría fuera de campo.',
        'In the new version, the camera stays in front of an empty doorway. The siblings’ voices come from another room. The key can be heard, followed by a long silence. Tomás removed the music he had added initially. He wanted the audience to pay attention to those small sounds and imagine what was happening off-screen.',
      ],
      [
        'La proyección',
        'Después de la proyección, una amiga le preguntó quién había recogido la llave. Tomás sonrió: la película no daba una respuesta. Para él, esa pregunta era una buena señal. Había dejado espacio para que cada persona construyera una parte de la historia. La escena ahora mostraba menos, pero invitaba a escuchar más.',
        'After the screening, a friend asked who had picked up the key. Tomás smiled: the film did not give an answer. For him, that question was a good sign. He had left room for each person to construct part of the story. The scene now showed less, but invited people to listen more.',
      ],
    ],
    words: [
      ['llave', 'key', 0, 'A physical key; its sound matters in this scene.'],
      ['quitar', 'to remove', 1, '“Quitó la música”: he removed the music.'],
      ['fuera de campo', 'off-screen', 1, 'Film action or sound outside the visible frame.'],
    ],
    questions: [
      [
        'What does Tomás notice when he only listens?',
        ['A train arriving', 'A key falling', 'A song ending'],
        1,
        0,
        'The teacher’s exercise lets him hear the previously ignored falling key.',
      ],
      [
        'Why does he remove the music?',
        ['It is too expensive', 'His friend dislikes it', 'To draw attention to small sounds'],
        2,
        1,
        'He wants the audience to focus on voices, the key, and silence.',
      ],
      [
        'How does he react to his friend’s unanswered question?',
        ['He sees it as a good sign', 'He decides to explain everything', 'He cancels the film'],
        0,
        2,
        'Her question shows that she is imagining part of the story herself.',
      ],
    ],
    practice: [
      'Complete the purpose with one word: «Quitó la música ___ escuchar los sonidos pequeños». (He removed the music in order to hear the small sounds.)',
      ['para'],
      1,
      '“Para” plus an infinitive expresses purpose: “para escuchar.” “Por” would not express this purpose in the same way.',
      'Use the preposition that introduces a purpose.',
    ],
  },
  {
    id: 'un-disco-para-la-tarde',
    title: 'Un disco para la tarde',
    subtitle: 'Slow down. Turn the record over.',
    description:
      'A record-shop visit becomes an invitation to listen to a whole side, without skipping.',
    cluster: 'music',
    band: 'A2',
    format: 'listen',
    country: 'Spain',
    variety: 'Peninsular Spanish vocabulary',
    scene: 'An imagined record shop in Madrid',
    palette: 'record',
    objective: 'Identify a recommendation and the reason for it.',
    segments: [
      [
        'La tienda',
        'Mara entra en una tienda de discos después del trabajo. Normalmente escucha música en el autobús, con auriculares. Hoy quiere encontrar algo para una tarde tranquila en casa. El dueño le enseña un disco con una portada azul. No conoce al grupo y pregunta cómo suena.',
        'Mara enters a record shop after work. She normally listens to music on the bus, with headphones. Today she wants to find something for a quiet afternoon at home. The owner shows her a record with a blue cover. She does not know the band and asks what it sounds like.',
      ],
      [
        'La escucha',
        'El dueño pone la primera canción. Hay una guitarra suave, un bajo y una batería muy lenta. Nadie canta durante el primer minuto. Mara cierra los ojos. «Este disco es bueno para escuchar sin hacer otras cosas», dice el dueño. Ella escucha dos canciones completas antes de decidir.',
        'The owner puts on the first song. There is a soft guitar, a bass, and very slow drums. Nobody sings during the first minute. Mara closes her eyes. “This is a good record to listen to without doing other things,” the owner says. She listens to two complete songs before deciding.',
      ],
      [
        'En casa',
        'Mara compra el disco y vuelve a casa. Prepara un té, deja el teléfono en otra habitación y pone el disco. Cuando termina la primera cara, no busca otra canción. Se levanta despacio para darle la vuelta. La tarde parece más larga, aunque el reloj funciona como siempre.',
        'Mara buys the record and goes home. She makes tea, leaves her phone in another room, and puts on the record. When the first side ends, she does not look for another song. She gets up slowly to turn it over. The afternoon seems longer, although the clock works as usual.',
      ],
    ],
    words: [
      ['auriculares', 'headphones', 0, 'A common term in Spain for headphones.'],
      ['suave', 'soft / gentle', 1, 'Describes the gentle sound of the guitar here.'],
      ['darle la vuelta', 'to turn it over', 2, 'Here, physically turning over the record.'],
    ],
    questions: [
      [
        'What does Mara want music for?',
        ['A party', 'A quiet afternoon at home', 'A bus performance'],
        1,
        0,
        'She wants “algo para una tarde tranquila en casa.”',
      ],
      [
        'What is absent during the first minute?',
        ['Singing', 'A guitar', 'Drums'],
        0,
        1,
        '“Nadie canta durante el primer minuto”: nobody sings.',
      ],
      [
        'Where does Mara leave her phone at home?',
        ['Beside the record player', 'On the bus', 'In another room'],
        2,
        2,
        'She puts it in another room so she can listen without the distraction.',
      ],
    ],
    practice: [
      'Complete the description with one word: «La guitarra suena muy ___». (The guitar sounds very soft.)',
      ['suave'],
      1,
      '“Suave” describes a gentle sound. It has the same form with masculine and feminine singular nouns.',
      'Find the adjective used with “guitarra” in passage 2.',
    ],
  },
  {
    id: 'el-sonido-del-puente',
    title: 'El sonido del puente',
    subtitle: 'A city becomes an instrument.',
    description: 'Follow a sound collector who finds a rhythm in the space between footsteps.',
    cluster: 'music',
    band: 'B1',
    format: 'read',
    country: 'Uruguay',
    variety: 'Uruguayan setting; general Spanish',
    scene: 'An imagined walk in Montevideo',
    palette: 'bridge',
    objective: 'Distinguish an initial plan from a revised creative choice.',
    segments: [
      [
        'Una búsqueda',
        'Lucía salió con una grabadora para buscar sonidos de la ciudad. Al principio quería registrar el tráfico, pero cerca de un puente escuchó algo más interesante: los pasos cambiaban de tono según la parte del suelo. Se quedó allí media hora, esperando a que pasaran personas con zapatos distintos.',
        'Lucía went out with a recorder to look for city sounds. At first she wanted to record traffic, but near a bridge she heard something more interesting: footsteps changed pitch depending on the part of the ground. She stayed there for half an hour, waiting for people with different shoes to pass.',
      ],
      [
        'En el estudio',
        'De vuelta en su estudio, cortó las grabaciones y ordenó los pasos como si fueran notas. Evitó incluir conversaciones de las personas que habían pasado. Añadió un ritmo sencillo con las manos y dejó algunos huecos de silencio. No quería imitar una calle llena de gente, sino recordar la sensación de caminar sin prisa.',
        'Back in her studio, she cut the recordings and arranged the footsteps as if they were notes. She avoided including conversations of the people who had passed. She added a simple rhythm with her hands and left some gaps of silence. She did not want to imitate a crowded street, but to recall the feeling of walking without hurry.',
      ],
      [
        'La escucha compartida',
        'Cuando enseñó la pieza a su hermano, él pensó que los sonidos venían de un instrumento de madera. Lucía le contó la historia del puente. A él le sorprendió que algo tan cotidiano pudiera sonar nuevo. Al día siguiente, los dos hicieron el mismo camino, esta vez sin auriculares y con más atención.',
        'When she showed the piece to her brother, he thought the sounds came from a wooden instrument. Lucía told him the story of the bridge. He was surprised that something so ordinary could sound new. The next day they both took the same route, this time without headphones and paying more attention.',
      ],
    ],
    words: [
      ['pasos', 'footsteps', 0, 'The sounds made as people walk.'],
      ['huecos', 'gaps', 1, 'Spaces left between sounds in the composition.'],
      [
        'sin prisa',
        'without hurry',
        1,
        'An expression for moving or doing something at an unhurried pace.',
      ],
    ],
    questions: [
      [
        'What did Lucía originally plan to record?',
        ['Traffic', 'Birds', 'A concert'],
        0,
        0,
        'Her initial plan was to “registrar el tráfico.” The footsteps change that plan.',
      ],
      [
        'What does she avoid including?',
        ['Silence', 'People’s conversations', 'Hand rhythms'],
        1,
        1,
        'She explicitly avoids conversations from the passersby.',
      ],
      [
        'What do the siblings do the next day?',
        ['Buy a wooden instrument', 'Stay in the studio', 'Walk the route without headphones'],
        2,
        2,
        'They repeat the walk, this time paying attention without headphones.',
      ],
    ],
    practice: [
      'Complete the expression with one word: «Me gusta caminar sin ___». (I like walking without hurry.)',
      ['prisa'],
      1,
      '“Sin prisa” is a fixed, useful expression. “Sin” means “without”; no article is needed here.',
      'The phrase appears near the end of passage 2.',
    ],
  },
  {
    id: 'la-libreria-de-la-esquina',
    title: 'La librería de la esquina',
    subtitle: 'Sometimes the right book finds a second reader.',
    description: 'A note left inside a secondhand book sends two readers into the same story.',
    cluster: 'literature',
    band: 'A2',
    format: 'read',
    country: 'Argentina',
    variety: 'Argentine setting; general Spanish',
    scene: 'An imagined bookshop in Rosario',
    palette: 'books',
    objective: 'Locate a detail and explain why a character makes a choice.',
    segments: [
      [
        'Un libro usado',
        'Nico visita una librería de libros usados. Busca una novela corta para el fin de semana. En una estantería encuentra un libro verde, sin dibujos. Al abrirlo, ve una nota escrita a mano: «Lee el capítulo tres en un lugar tranquilo». Nico quiere saber por qué y compra el libro.',
        'Nico visits a secondhand bookshop. He is looking for a short novel for the weekend. On a shelf he finds a green book with no pictures. When he opens it, he sees a handwritten note: “Read chapter three in a quiet place.” Nico wants to know why and buys the book.',
      ],
      [
        'El capítulo tres',
        'El sábado va a un parque. Se sienta debajo de un árbol y empieza a leer. Los primeros capítulos hablan de una familia que vive lejos del mar. En el tercero, la abuela cuenta su primer viaje a la playa. Nico recuerda un viaje con su propia abuela y deja de leer un momento.',
        'On Saturday he goes to a park. He sits under a tree and begins to read. The first chapters are about a family living far from the sea. In the third, the grandmother describes her first trip to the beach. Nico remembers a trip with his own grandmother and stops reading for a moment.',
      ],
      [
        'Otra nota',
        'Cuando termina el libro, Nico escribe una nota nueva: «El capítulo tres me hizo llamar a mi abuela». La pone junto a la primera nota y regala el libro a su amiga Julia. No le cuenta el final. Solo le recomienda buscar un lugar tranquilo para leer.',
        'When he finishes the book, Nico writes a new note: “Chapter three made me call my grandmother.” He puts it beside the first note and gives the book to his friend Julia. He does not tell her the ending. He only recommends finding a quiet place to read.',
      ],
    ],
    words: [
      ['estantería', 'bookshelf', 0, 'A set of shelves for books or other objects.'],
      ['debajo', 'underneath', 1, '“Debajo de un árbol”: under a tree.'],
      ['regalar', 'to give as a gift', 2, '“Regala el libro” means he gives the book as a gift.'],
    ],
    questions: [
      [
        'What makes Nico curious about the book?',
        ['Its pictures', 'A handwritten note', 'Its price'],
        1,
        0,
        'The note tells him to read chapter three somewhere quiet, making him curious.',
      ],
      [
        'Where does he read on Saturday?',
        ['Under a tree in a park', 'At the beach', 'In the bookshop'],
        0,
        1,
        'He goes to a park and sits “debajo de un árbol.”',
      ],
      [
        'What does Nico do with the book afterward?',
        ['Sells it', 'Leaves it in the park', 'Gives it to Julia'],
        2,
        2,
        'He adds his own note and gives the book to his friend Julia.',
      ],
    ],
    practice: [
      'Complete the location with one word: «Nico lee ___ de un árbol». (Nico reads under a tree.)',
      ['debajo'],
      1,
      '“Debajo de” means “under.” Keep “de” before the noun phrase: “debajo de un árbol.”',
      'Find the location expression in the second passage.',
    ],
  },
  {
    id: 'las-palabras-prestadas',
    title: 'Las palabras prestadas',
    subtitle: 'The dictionary on the kitchen table.',
    description: 'Two generations collect the words that refuse to fit neatly into a translation.',
    cluster: 'literature',
    band: 'B1',
    format: 'listen',
    country: 'Mexico',
    variety: 'Mexican setting; general Spanish',
    scene: 'An imagined family kitchen in Puebla',
    palette: 'letters',
    objective: 'Identify a change in perspective and support it with a detail.',
    segments: [
      [
        'La lista',
        'Elena empezó una lista de palabras que su abuelo usaba y que ella casi nunca oía fuera de casa. Pensaba que bastaría con buscar una definición y escribirla al lado. Sin embargo, cuando le preguntó por la primera palabra, él no dio una explicación breve. Le contó una historia de su infancia que duró veinte minutos.',
        'Elena began a list of words her grandfather used that she almost never heard outside the house. She thought looking up a definition and writing it alongside would be enough. However, when she asked about the first word, he did not give a short explanation. He told her a twenty-minute story from his childhood.',
      ],
      [
        'Más que definiciones',
        'Durante varias semanas se sentaron en la cocina después de comer. Elena anotaba ejemplos, lugares y nombres de personas. A veces el abuelo cambiaba de opinión sobre el significado. Ella dejó de corregirlo con el diccionario: empezó a entender que le interesaba la forma en que él había vivido las palabras, no solo su definición.',
        'For several weeks they sat in the kitchen after lunch. Elena wrote down examples, places, and people’s names. Sometimes her grandfather changed his mind about the meaning. She stopped correcting him with the dictionary: she began to understand that she was interested in how he had lived the words, not only their definition.',
      ],
      [
        'Un libro pequeño',
        'Elena convirtió las notas en un libro pequeño y preparó dos copias, una para cada uno. En la primera página escribió que no era un diccionario completo ni una guía de cómo debía hablar la gente. Era el registro de unas conversaciones. Su abuelo lo leyó despacio y añadió otra historia en una página vacía.',
        'Elena turned the notes into a small book and made two copies, one for each of them. On the first page she wrote that it was not a complete dictionary or a guide to how people should speak. It was a record of conversations. Her grandfather read it slowly and added another story on an empty page.',
      ],
    ],
    words: [
      ['infancia', 'childhood', 0, 'The period of a person’s life when they are a child.'],
      ['anotar', 'to write down', 1, '“Anotaba” describes what Elena repeatedly wrote down.'],
      ['registro', 'record', 2, 'Here, a written record, not a music record.'],
    ],
    questions: [
      [
        'What did Elena initially expect?',
        ['A short definition', 'A complete book', 'A long journey'],
        0,
        0,
        'She thought she only needed to look up a definition and write it down.',
      ],
      [
        'Why does she stop correcting him with a dictionary?',
        [
          'The dictionary is lost',
          'His experience of the words interests her',
          'She stops understanding Spanish',
        ],
        1,
        1,
        'Her interest shifts from a fixed definition to his lived experience.',
      ],
      [
        'How does she describe the finished book?',
        ['A complete dictionary', 'Rules for speaking correctly', 'A record of conversations'],
        2,
        2,
        'She explicitly calls it a record of conversations, with limits on what it claims.',
      ],
    ],
    practice: [
      'Complete the contrast with one word: «No es un diccionario completo; es un ___ de conversaciones». (It is a record of conversations.)',
      ['registro'],
      2,
      '“Un registro de conversaciones” is a written record of the conversations. The masculine noun takes “un.”',
      'Find the noun Elena uses for her book in passage 3.',
    ],
  },
  {
    id: 'la-silla-amarilla',
    title: 'La silla amarilla',
    subtitle: 'An ordinary object, given another life.',
    description:
      'A scratched chair becomes a small lesson in looking again at what is already there.',
    cluster: 'design',
    band: 'A2',
    format: 'listen',
    country: 'Spain',
    variety: 'Peninsular Spanish vocabulary',
    scene: 'An imagined repair workshop in Barcelona',
    palette: 'chair',
    objective: 'Follow simple repair steps and identify a preference.',
    segments: [
      [
        'El hallazgo',
        'Pablo encuentra una silla vieja junto a su edificio. Una pata está rota, pero el asiento es cómodo. La lleva al taller de su amiga Lola. Ella fabrica muebles y sabe reparar madera. «Podemos arreglarla, pero necesitas paciencia», le dice. Pablo tiene una tarde libre y decide intentarlo.',
        'Pablo finds an old chair beside his building. One leg is broken, but the seat is comfortable. He takes it to his friend Lola’s workshop. She makes furniture and knows how to repair wood. “We can fix it, but you need patience,” she says. Pablo has a free afternoon and decides to try.',
      ],
      [
        'En el taller',
        'Primero limpian la silla y reparan la pata. Después esperan a que se seque el pegamento. Mientras esperan, Pablo mira los colores del taller. Quiere pintar la silla de amarillo porque su cocina es bastante oscura. Lola le da un pincel pequeño para las partes difíciles.',
        'First they clean the chair and repair the leg. Then they wait for the glue to dry. While they wait, Pablo looks at the workshop’s colors. He wants to paint the chair yellow because his kitchen is rather dark. Lola gives him a small brush for the difficult parts.',
      ],
      [
        'Un lugar nuevo',
        'Al día siguiente, Pablo pone la silla junto a la ventana de la cocina. Todavía tiene algunas marcas, y eso le gusta. No parece nueva, pero funciona bien. Cuando una amiga viene a tomar café, pregunta dónde la compró. Pablo sonríe y empieza a contar la historia del taller.',
        'The next day, Pablo puts the chair beside the kitchen window. It still has some marks, and he likes that. It does not look new, but it works well. When a friend comes for coffee, she asks where he bought it. Pablo smiles and begins telling the story of the workshop.',
      ],
    ],
    words: [
      ['taller', 'workshop', 0, 'A place where things are made or repaired.'],
      ['pegamento', 'glue', 1, 'Used here to help repair the wooden chair.'],
      ['pincel', 'paintbrush', 1, 'A brush used for painting.'],
    ],
    questions: [
      [
        'What is broken?',
        ['The seat', 'One leg', 'The window'],
        1,
        0,
        '“Una pata está rota” refers to a leg of the chair.',
      ],
      [
        'Why does Pablo choose yellow?',
        ['His kitchen is dark', 'It is the only color', 'Lola asks him to'],
        0,
        1,
        'He wants yellow because his kitchen is rather dark.',
      ],
      [
        'How does Pablo feel about the remaining marks?',
        ['He wants to hide them', 'He does not notice them', 'He likes them'],
        2,
        2,
        'The text says the chair still has marks, “y eso le gusta.”',
      ],
    ],
    practice: [
      'Complete the agreement with one word: «La silla es ___». (The chair is yellow.)',
      ['amarilla'],
      1,
      '“Silla” is feminine, so use “amarilla.” With a masculine noun, the adjective would be “amarillo.”',
      'Change the color ending to agree with “la silla.”',
    ],
  },
  {
    id: 'un-cartel-para-todos',
    title: 'Un cartel para todos',
    subtitle: 'Good design begins with who gets left out.',
    description: 'A designer rethinks a neighborhood poster after one honest conversation.',
    cluster: 'design',
    band: 'B1',
    format: 'read',
    country: 'Chile',
    variety: 'Chilean setting; general Spanish',
    scene: 'An imagined cultural center in Valparaíso',
    palette: 'poster',
    objective: 'Connect feedback to a concrete design change.',
    segments: [
      [
        'La propuesta',
        'Sara diseñó un cartel para anunciar un taller gratuito en un centro cultural. Eligió letras pequeñas y un fondo con muchos colores porque le parecía elegante. Antes de imprimirlo, lo enseñó a las personas que entraban al centro. Un hombre se acercó al papel y le preguntó a qué hora empezaba la actividad. La información estaba allí, pero él no podía leerla bien.',
        'Sara designed a poster to announce a free workshop at a cultural center. She chose small lettering and a background with many colors because she thought it looked elegant. Before printing, she showed it to people entering the center. A man moved closer to the paper and asked when the activity started. The information was there, but he could not read it well.',
      ],
      [
        'Volver a empezar',
        'Sara volvió a su mesa. Aumentó el tamaño de las letras, quitó parte del fondo y separó la fecha de la dirección. También añadió una frase sencilla que explicaba que no hacía falta experiencia. Cuando mostró la segunda versión, una mujer encontró la hora desde el otro lado de la sala. Esa reacción le resultó más útil que un elogio.',
        'Sara went back to her desk. She increased the lettering size, removed part of the background, and separated the date from the address. She also added a simple sentence explaining that no experience was needed. When she showed the second version, a woman found the time from across the room. That reaction was more useful to her than praise.',
      ],
      [
        'El día del taller',
        'El día del taller, Sara vio su cartel junto a la entrada. No era tan llamativo como la primera versión, pero varias personas lo leían sin detenerse mucho. Comprendió que diseñar no consistía solo en expresar su gusto. También era una forma de facilitar una decisión a alguien que quizá tenía poco tiempo o veía peor que ella.',
        'On the day of the workshop, Sara saw her poster beside the entrance. It was not as striking as the first version, but several people read it without stopping for long. She understood that design was not only about expressing her taste. It was also a way to make a decision easier for someone who might have little time or see less well than she did.',
      ],
    ],
    words: [
      ['cartel', 'poster', 0, 'A sign or poster intended to share information.'],
      ['elogio', 'praise', 1, 'A positive comment about someone or their work.'],
      [
        'llamativo',
        'eye-catching',
        2,
        'Something that attracts attention; not automatically easy to use.',
      ],
    ],
    questions: [
      [
        'What problem does the first poster have?',
        ['It gives the wrong date', 'It is difficult to read', 'It has no address'],
        1,
        0,
        'The man cannot read the information well; the passage does not say it is incorrect.',
      ],
      [
        'Which change does Sara make?',
        ['Larger lettering', 'More background colors', 'Removing the time'],
        0,
        1,
        'She increases the size of the lettering and simplifies the layout.',
      ],
      [
        'What does Sara learn about design?',
        [
          'It should only express her taste',
          'Praise matters more than use',
          'It can make a decision easier for others',
        ],
        2,
        2,
        'Her conclusion focuses on helping people with different needs use the information.',
      ],
    ],
    practice: [
      'Complete the comparison with one word: «La segunda versión es ___ fácil de leer». (The second version is easier to read.)',
      ['más', 'mas'],
      1,
      'Use “más fácil” for “easier.” The standard spelling is “más,” with an accent; both input forms are recognized in this exercise.',
      'Use the word for “more” before “fácil.”',
    ],
  },
  {
    id: 'la-plaza-a-las-ocho',
    title: 'La plaza a las ocho',
    subtitle: 'The city has a quieter hour.',
    description: 'An early walk reveals a familiar square doing something entirely different.',
    cluster: 'places',
    band: 'A2',
    format: 'read',
    country: 'Colombia',
    variety: 'Colombian setting; general Spanish',
    scene: 'An imagined neighborhood square in Medellín',
    palette: 'plaza',
    objective: 'Compare two moments and locate people in a scene.',
    segments: [
      [
        'Otra hora',
        'Andrés cruza la plaza todos los días a las seis de la tarde. Siempre hay música, bicicletas y mucha gente. Hoy sale de casa temprano y pasa por allí a las ocho de la mañana. La plaza parece otro lugar. Los bancos están vacíos y solo se oye una escoba sobre el suelo.',
        'Andrés crosses the square every day at six in the evening. There is always music, bicycles, and lots of people. Today he leaves home early and passes through at eight in the morning. The square seems like another place. The benches are empty and only a broom can be heard on the ground.',
      ],
      [
        'El primer café',
        'Cerca de una fuente, una señora abre un puesto de café. Andrés compra uno y se sienta en un banco. Ve a un jardinero regando las plantas y a dos personas que caminan despacio. Nadie tiene prisa. El café está muy caliente, así que espera antes de beber.',
        'Near a fountain, a woman opens a coffee stall. Andrés buys a coffee and sits on a bench. He sees a gardener watering the plants and two people walking slowly. Nobody is in a hurry. The coffee is very hot, so he waits before drinking.',
      ],
      [
        'La vuelta',
        'A las nueve empieza a llegar más gente. Andrés mira el reloj y camina hacia su trabajo. No ha descubierto un sitio nuevo, pero sí una hora nueva. Decide volver el sábado por la mañana. Esta vez quiere traer un libro y quedarse un poco más.',
        'At nine, more people begin to arrive. Andrés looks at his watch and walks toward work. He has not discovered a new place, but a new hour. He decides to return on Saturday morning. This time he wants to bring a book and stay a little longer.',
      ],
    ],
    words: [
      ['banco', 'bench', 1, 'Here it means a seat in the square, not a financial institution.'],
      ['fuente', 'fountain', 1, 'The water feature near the coffee stall.'],
      ['temprano', 'early', 0, 'A time earlier than usual or early in the day.'],
    ],
    questions: [
      [
        'When does Andrés usually cross the square?',
        ['At eight in the morning', 'At six in the evening', 'At midnight'],
        1,
        0,
        'His usual time is “a las seis de la tarde.” Today is different.',
      ],
      [
        'Where is the coffee stall?',
        ['Near a fountain', 'Inside his workplace', 'Behind a library'],
        0,
        1,
        'The woman opens it “cerca de una fuente.”',
      ],
      [
        'What does he want to bring on Saturday?',
        ['His bicycle', 'An umbrella', 'A book'],
        2,
        2,
        'He wants to bring a book and stay longer.',
      ],
    ],
    practice: [
      'Complete the time with one word: «La plaza está tranquila por la ___». (The square is quiet in the morning.)',
      ['mañana', 'manana'],
      0,
      'Use “por la mañana” for “in the morning.” The standard spelling uses ñ: “mañana.”',
      'It is the part of the day when Andrés visits at eight.',
    ],
  },
  {
    id: 'el-mapa-sin-nombres',
    title: 'El mapa sin nombres',
    subtitle: 'Finding your way by what you remember.',
    description:
      'A handmade map trades street names for sounds, smells, and a particular blue door.',
    cluster: 'places',
    band: 'B1',
    format: 'listen',
    country: 'Peru',
    variety: 'Peruvian setting; general Spanish',
    scene: 'An imagined neighborhood in Lima',
    palette: 'map',
    objective: 'Understand an alternative strategy and its limitations.',
    segments: [
      [
        'Una dirección',
        'Cuando su prima llegó a Lima, Diego quiso enseñarle el camino desde la estación hasta su casa. En vez de enviarle una ubicación, dibujó un mapa. No escribió los nombres de las calles: señaló una panadería, una puerta azul y un árbol que daba mucha sombra. Su prima pensó que era una forma complicada de dar indicaciones.',
        'When his cousin arrived in Lima, Diego wanted to show her the route from the station to his home. Instead of sending a location, he drew a map. He did not write street names: he marked a bakery, a blue door, and a tree that gave plenty of shade. His cousin thought it was a complicated way to give directions.',
      ],
      [
        'El recorrido',
        'Sin embargo, al salir de la estación, reconoció el olor del pan antes de ver la tienda. Luego encontró la puerta azul y el árbol. En la última esquina tuvo que llamar a Diego porque había dos casas parecidas. Él salió a buscarla. El mapa no era perfecto, pero la había ayudado a mirar el barrio con atención.',
        'However, leaving the station, she recognized the smell of bread before seeing the shop. Then she found the blue door and the tree. At the last corner, she had to call Diego because there were two similar houses. He came out to meet her. The map was not perfect, but it had helped her look carefully at the neighborhood.',
      ],
      [
        'Una segunda versión',
        'Esa noche mejoraron el dibujo juntos. Añadieron el número de la casa y una flecha en la esquina difícil. Su prima conservó los otros detalles: le gustaba recordar el camino a través de cosas concretas. Al volver a la estación dos días después, no necesitó abrir el mapa, aunque lo llevaba en el bolsillo por si acaso.',
        'That night they improved the drawing together. They added the house number and an arrow at the difficult corner. His cousin kept the other details: she liked remembering the route through concrete things. Going back to the station two days later, she did not need to open the map, although she had it in her pocket just in case.',
      ],
    ],
    words: [
      ['sombra', 'shade', 0, 'The shelter from direct sunlight given by the tree.'],
      ['esquina', 'corner', 1, 'The point where streets meet.'],
      ['por si acaso', 'just in case', 2, 'An expression for doing something as a precaution.'],
    ],
    questions: [
      [
        'What does Diego put on his first map?',
        ['Street names', 'Landmarks such as a blue door', 'Bus schedules'],
        1,
        0,
        'He marks a bakery, a blue door, and a tree instead of writing street names.',
      ],
      [
        'Why does his cousin call him?',
        ['Two houses look similar', 'The bakery is closed', 'She loses the map'],
        0,
        1,
        'At the last corner, two similar houses make the final choice uncertain.',
      ],
      [
        'What do they add to improve the map?',
        ['A restaurant review', 'Every street in the city', 'The house number and an arrow'],
        2,
        2,
        'They add the number and an arrow while retaining the memorable landmarks.',
      ],
    ],
    practice: [
      'Complete the expression with one word: «Llevo el mapa por si ___». (I carry the map just in case.)',
      ['acaso'],
      2,
      '“Por si acaso” means “just in case.” It is a fixed expression you can use after describing a precaution.',
      'Look for the final expression of the final passage.',
    ],
  },
];
export const corpus: CorpusEntry[] = drafts.map(entry);
export function publicPiece(source: Source) {
  const { segments: _segments, glossary: _glossary, ...piece } = source;
  return piece;
}
