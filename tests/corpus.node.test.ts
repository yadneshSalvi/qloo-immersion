import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { corpus, publicPiece } from '../src/content/corpus';
import { clusters } from '../src/domain/types';
import { normalizeAnswer, commandSchema, onboardingSchema } from '../src/domain/commands';

// Frozen before expansion: hashes cover the entire source AND all assessment keys.
// These existing :1 versions must not be rewritten when adding alternatives.
const originalFingerprints = [
  ['una-mesa-en-el-mercado', 'c9d437b3bb44c63f0c4a28c651e0ca6fe93ed7cc228a191472114baf53f045b0'],
  ['la-receta-que-viaja', 'ade9c5b4b27882913d79ff82bb0dc29ca84375c3fb943f7e87181643d66a32d6'],
  ['el-cine-de-los-jueves', 'e23890a8c35943568a186b7cd3c5e58cdd1d7e3eb160e3e53bbcd5c4cf7794cc'],
  ['fuera-de-campo', '50d40a56420e1f9f1e0ebe9e492782a717f6f3ebd32a3dcc1cce60f4a9e416c6'],
  ['un-disco-para-la-tarde', '02ba84a7a1b0df1899afb8755dc7a9f98dc44ee81a036a611ef0b54bf42899e8'],
  ['el-sonido-del-puente', '2dd0e97756e428116ae4ab671646f3610c581c3123d85e7b7f889f1e7ab4f776'],
  ['la-libreria-de-la-esquina', 'fa173a1a98ff945a71b7e51acd22245770608c187f6d3bd8679ad770f436617c'],
  ['las-palabras-prestadas', 'e34b564bdad630fcdb78bc504e89804fdc5eef62608cfad289cb71c098bfe8c6'],
  ['la-silla-amarilla', '601415cc4ffd4659f6d71a09347bf572327f169f3027aecdd537d2c84fe52fb5'],
  ['un-cartel-para-todos', 'e4239436f208721b5a0f5cc1865a73024a6e5bec07199356347a8a0365c94ec7'],
  ['la-plaza-a-las-ocho', '649b4b3b59f6851f2315d844168bbdc6ca0cf334028f86ba76d879cda87ecf8c'],
  ['el-mapa-sin-nombres', '0f6885d7a70ed221a0cda3ca4bde6efa4e8ce4fcebb09e4cbf453bccec0062e9'],
] as const;
const additions = corpus.slice(originalFingerprints.length);

test('the original twelve source and assessment snapshots are byte-for-byte unchanged', () => {
  for (const [index, [id, fingerprint]] of originalFingerprints.entries()) {
    assert.equal(corpus[index].source.id, id);
    assert.equal(
      createHash('sha256').update(JSON.stringify(corpus[index])).digest('hex'),
      fingerprint,
      id,
    );
  }
});

test('36 sources provide three choices per cluster/band with reading and listening in every cell', () => {
  assert.equal(corpus.length, 36);
  assert.equal(additions.length, 24);
  assert.equal(new Set(corpus.map((p) => p.source.id)).size, 36);
  assert.equal(new Set(corpus.map((p) => p.source.versionId)).size, 36);
  assert.equal(corpus.filter((p) => p.source.format === 'read').length, 18);
  assert.equal(corpus.filter((p) => p.source.format === 'listen').length, 18);
  for (const cluster of clusters) {
    for (const band of ['A2', 'B1'] as const) {
      const cell = corpus.filter(
        ({ source }) => source.cluster === cluster && source.band === band,
      );
      assert.equal(cell.length, 3, `${cluster}/${band}`);
      assert.deepEqual([...new Set(cell.map(({ source }) => source.format))].sort(), [
        'listen',
        'read',
      ]);
      for (const completed of cell) {
        const unseen = cell.filter(({ source }) => source.id !== completed.source.id);
        assert.equal(
          unseen.length,
          2,
          'one completed source leaves two same-thread, same-band alternatives',
        );
      }
    }
  }
});
test('each exercise points to its own source and keeps a bounded key', () => {
  const ids = new Set<string>();
  for (const { source, assessments } of corpus) {
    assert.equal(source.provenance.mode, 'authored-sample');
    assert.match(source.provenance.authorship, /AI assistance.*Fictional/);
    assert.equal(source.provenance.educatorReview, 'pending');
    assert.equal(source.provenance.qlooMapping, null);
    assert.match(source.provenance.license, /^CC0-1.0 original sample text; no third-party media$/);
    assert(['read', 'listen'].includes(source.format));
    assert.equal(source.segments.length, 3);
    assert.equal(source.glossary.length, 3);
    assert.equal(new Set(source.glossary.map((word) => word.word)).size, 3);
    assert.equal(
      source.wordCount,
      source.segments.reduce((sum, segment) => sum + segment.text.split(/\s+/).length, 0),
    );
    assert.equal(source.preview, source.segments[0].text);
    for (const identity of [
      source.id,
      source.versionId,
      ...source.segments.map((s) => s.id),
      ...source.glossary.map((w) => w.id),
    ]) {
      assert(!ids.has(identity), `duplicate identity: ${identity}`);
      ids.add(identity);
    }
    assert.equal(assessments.filter((a) => a.kind === 'comprehension').length, 3);
    assert.equal(assessments.filter((a) => a.kind === 'practice').length, 1);
    for (const item of assessments) {
      assert(!ids.has(item.id));
      ids.add(item.id);
      assert(item.sourceSegmentIds.length > 0);
      assert(item.sourceSegmentIds.every((id) => source.segments.some((s) => s.id === id)));
      assert(item.answer.length > 0);
      assert(item.explanation.length > 30);
      if (item.kind === 'comprehension') {
        assert.equal(item.options.length, 3);
        assert.equal(new Set(item.options.map((option) => option.id)).size, 3);
        assert.equal(new Set(item.options.map((option) => option.text)).size, 3);
        assert.equal(item.answer.length, 1);
        assert(item.answer.every((key) => item.options.some((o) => o.id === key)));
      } else {
        assert.equal(item.options.length, 0);
      }
    }
    for (const word of source.glossary)
      assert(source.segments.some((s) => s.id === word.segmentId));
  }
});

test('new sources meet author-recommended length targets and ground contextual terms and expression keys', () => {
  for (const { source, assessments } of additions) {
    const [min, max] = source.band === 'A2' ? [130, 220] : [180, 260];
    assert(
      source.wordCount >= min && source.wordCount <= max,
      `${source.id}: ${source.wordCount} words`,
    );
    for (const segment of source.segments) {
      assert(segment.text.split(/\s+/).length >= 40, `${segment.id}: substantive Spanish passage`);
      assert(
        segment.translation.split(/\s+/).length >= 40,
        `${segment.id}: substantive English translation`,
      );
      assert.notEqual(segment.text, segment.translation);
    }
    for (const term of source.glossary) {
      const passage = source.segments.find((s) => s.id === term.segmentId)!;
      assert(
        normalizeAnswer(passage.text).includes(normalizeAnswer(term.word)),
        `${term.id}: term occurs in cited Spanish passage`,
      );
      assert(term.meaning.length > 2);
      assert(term.note.length >= 20);
    }
    const practice = assessments.find((a) => a.kind === 'practice')!;
    assert(practice.prompt.includes('___'), 'a bounded short expression exercise');
    const cited = source.segments.filter((s) => practice.sourceSegmentIds.includes(s.id));
    for (const answer of practice.answer) {
      assert(normalizeAnswer(answer).split(/\s+/).length <= 3);
      assert(
        cited.some((s) => normalizeAnswer(s.text).split(' ').includes(normalizeAnswer(answer))),
        `${practice.id}: grounded answer ${answer}`,
      );
    }
  }
});

test('sources have unique passages, translations, titles and no recycled near-duplicate stories', () => {
  const passages = corpus.flatMap(({ source }) => source.segments);
  assert.equal(new Set(passages.map((s) => normalizeAnswer(s.text))).size, 108);
  assert.equal(new Set(passages.map((s) => normalizeAnswer(s.translation))).size, 108);
  assert.equal(new Set(corpus.map(({ source }) => source.title)).size, 36);
  const fiveGrams = corpus.map(({ source }) => {
    const words = normalizeAnswer(source.segments.map((s) => s.text).join(' ')).split(/\s+/);
    return new Set(words.slice(0, -4).map((_, index) => words.slice(index, index + 5).join(' ')));
  });
  for (let i = 0; i < fiveGrams.length; i++) {
    for (let j = i + 1; j < fiveGrams.length; j++) {
      const shared = [...fiveGrams[i]].filter((phrase) => fiveGrams[j].has(phrase)).length;
      assert(
        shared / Math.min(fiveGrams[i].size, fiveGrams[j].size) < 0.2,
        `${corpus[i].source.id} / ${corpus[j].source.id}`,
      );
    }
  }
});

// Curated source evidence for every added comprehension item. These are exact
// Spanish substrings matched against the expected keyed option.
// This is deterministic editorial QA, not a claim of independent educator review.
const groundedKeys: Record<string, [string, string][]> = {
  'la-radio-de-la-lavanderia': [
    ['2', 'hoy la deja en casa'],
    ['3', 'necesitan oír las máquinas'],
    ['1', 'pregunta el nombre del grupo'],
  ],
  'el-ensayo-del-domingo': [
    ['1', 'No puedo escuchar el teclado'],
    ['2', 'hasta el final de la primera frase'],
    ['3', 'para practicar en casa'],
  ],
  'una-cancion-dos-versiones': [
    ['3', 'él siempre bailaba en las fiestas'],
    ['1', 'entender mejor las palabras'],
    ['2', 'abrió el concierto con la guitarra'],
  ],
  'el-archivo-de-las-campanas': [
    ['1', 'le recordó el reloj de la escuela'],
    ['2', 'la campana de una fábrica; la otra pensó que era la de un mercado'],
    ['3', 'dejó el lugar como desconocido'],
  ],
  'la-fila-de-la-taquilla': [
    ['2', 'ya no quedan entradas'],
    ['3', 'duran una hora en total'],
    ['1', 'una historia divertida con pocos personajes'],
  ],
  'el-vestuario-del-corto': [
    ['3', 'No tienen dinero para muchos trajes'],
    ['1', 'dentro de una bolsa abierta'],
    ['2', 'Guarda el cuaderno con los dibujos'],
  ],
  'la-escena-sin-reloj': [
    ['2', 'todos hablaron de la hora de la cita'],
    ['3', 'conservaba la misma duración'],
    ['1', 'la causa exacta aparecería después'],
  ],
  'la-voz-del-subtitulo': [
    ['2', 'tres golpes en una puerta que quedaba fuera del encuadre'],
    ['1', 'tiempo de leerlas y mirar la acción'],
    ['3', 'más comentarios de personas con distintas necesidades'],
  ],
  'el-poema-del-bolsillo': [
    ['3', 'la parte de atrás de una lista de compras'],
    ['1', 'El papel se mueve porque el camino tiene muchas curvas'],
    ['2', 'muestran sus ideas anteriores'],
  ],
  'la-carta-del-futuro': [
    ['2', 'Pueden describir un día normal'],
    ['3', 'comparar su vida de hoy con la del próximo año'],
    ['1', 'junto a sus documentos importantes'],
  ],
  'el-final-que-no-enviaron': [
    ['2', 'explicaciones posibles para la maleta'],
    ['1', 'un diálogo breve sobre una promesa olvidada'],
    ['3', 'seguía imaginando quién había dejado la maleta'],
  ],
  'el-indice-de-las-ausencias': [
    ['1', 'faltaba la sexta'],
    ['2', 'ninguna se presentara como parte de su cuento'],
    ['3', 'Las dos escenas encajaban de formas distintas'],
  ],
  'el-pan-de-la-vecina': [
    ['1', 'la bolsa del pan está vacía'],
    ['3', 'para no quemarse las manos'],
    ['2', 'Daniel lava las tazas'],
  ],
  'la-lista-del-picnic': [
    ['3', 'preguntar qué puede comer cada uno'],
    ['1', 'el queso en un recipiente separado'],
    ['2', 'quedan dos manzanas'],
  ],
  'el-menu-de-los-recuerdos': [
    ['1', 'cada persona mencionó algo diferente'],
    ['2', 'No recordaba las cantidades exactas'],
    ['3', 'corrigió la nota sin borrar la primera versión'],
  ],
  'el-puesto-que-cambio-la-hora': [
    ['2', 'su descanso empezaba a las dos y cuarto'],
    ['3', 'Preparó el mismo menú'],
    ['1', 'repetir el horario dos semanas más'],
  ],
  'la-lampara-de-papel': [
    ['1', 'La luz es fuerte y le molesta'],
    ['3', 'El blanco permite iluminar una parte más grande'],
    ['2', 'va a medir la mesa'],
  ],
  'el-mural-de-las-manos': [
    ['2', 'papel grande para preparar el diseño'],
    ['3', 'los dibujos de abajo quedan detrás de una mesa'],
    ['1', 'contar la historia del mural'],
  ],
  'el-banco-que-se-movia': [
    ['1', 'marcó su tamaño en el suelo con cinta'],
    ['2', 'dos bancos cortos en lugar de uno largo'],
    ['3', 'faltaba revisar los materiales y la estabilidad'],
  ],
  'la-tipografia-de-la-feria': [
    ['2', 'leerlas mientras caminaban entre otras personas'],
    ['3', 'a la misma altura'],
    ['1', 'folletos que se leerían de cerca'],
  ],
  'la-parada-del-autobus': [
    ['2', 'La calle está en obras'],
    ['1', 'delante de una tienda de bicicletas'],
    ['3', 'Las obras van a durar una semana'],
  ],
  'el-jardin-de-la-azotea': [
    ['3', 'la tierra muy seca'],
    ['1', 'dentro de una caja junto a la puerta'],
    ['2', 'se quedan un rato hablando'],
  ],
  'la-estacion-que-espero': [
    ['2', 'una sala para ensayar teatro'],
    ['3', 'una actividad podía molestar a la otra'],
    ['1', 'una revisión del ruido'],
  ],
  'el-sendero-de-dos-ritmos': [
    ['1', 'otras preferían detenerse para dibujar o conversar'],
    ['2', 'la entrada del jardín a mediodía'],
    ['3', 'desde el principio los dos ritmos'],
  ],
};

test('every added comprehension key retains its expected answer and exact evidence in the cited passage', () => {
  assert.deepEqual(
    Object.keys(groundedKeys).sort(),
    additions.map(({ source }) => source.id).sort(),
  );
  const correctPositions = new Map<string, number>();
  for (const { source, assessments } of additions) {
    const questions = assessments.filter((item) => item.kind === 'comprehension');
    const evidence = groundedKeys[source.id];
    assert.equal(evidence.length, questions.length);
    for (const [index, [key, quote]] of evidence.entries()) {
      const question = questions[index];
      assert.deepEqual(question.answer, [key], question.id);
      const cited = source.segments.filter((segment) =>
        question.sourceSegmentIds.includes(segment.id),
      );
      assert(
        cited.some((segment) => segment.text.includes(quote)),
        `${question.id}: source evidence`,
      );
      correctPositions.set(key, (correctPositions.get(key) ?? 0) + 1);
    }
  }
  assert.deepEqual([...correctPositions.entries()].sort(), [
    ['1', 24],
    ['2', 24],
    ['3', 24],
  ]);
});

test('public cards omit passages, glossary, exercises and answer keys', () => {
  for (const { source } of corpus) {
    const piece = publicPiece(source);
    assert(!('segments' in piece));
    assert(!('glossary' in piece));
    assert(!('assessments' in piece));
    assert(!('answer' in piece));
    assert.equal(piece.id, source.id);
  }
});
test('bounded matching normalizes case and accents without accepting unrelated prose', () => {
  assert.equal(normalizeAnswer('  MÁS! '), 'mas');
  assert.equal(normalizeAnswer('mañana'), 'manana');
  assert.notEqual(normalizeAnswer('por si acaso, no sé'), 'acaso');
});
test('age, owned source identifiers, state versions, and finite inputs are required at the command boundary', () => {
  assert.equal(onboardingSchema.safeParse({ adult: false }).success, false);
  assert.equal(
    commandSchema.safeParse({
      type: 'position',
      sessionId: 'not-a-session',
      expectedVersion: -1,
      position: 0,
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: 'complete',
      sessionId: '123',
      expectedVersion: 1,
      taste: 'more',
      difficulty: 'hard',
      consent: true,
      note: '',
    }).success,
    false,
  );
});
