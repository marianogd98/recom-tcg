# ReCom TCG — Especificación de reglas de negocio

> **Versión:** 0.1 (borrador) · **Fecha:** 6 de octubre de 2026 · **Autor:** Mariano Garcia
>
> **Alcance:** reglas RN-01 a RN-65, gramática de reglas YAML y modelo de puntuación.
> **Estado:** dominio cerrado; stack definido (TypeScript, pnpm, Next.js con exportación estática); implementación en curso (M0).

Cada regla tiene un identificador **RN-xx** que se cita en el código, los tests y los pull requests.

## 1. Introducción

### 1.1 Problema

Los jugadores de Magic: The Gathering suelen acumular un pool amplio de cartas, ordenadas por colores. Dentro de ese pool puede haber cartas legendarias que serían excelentes comandantes, pero por prisa o descuido pasan desapercibidas. Las herramientas populares de Commander están pensadas para el flujo inverso: «ya elegí mi comandante, ¿qué meto en el mazo?».

### 1.2 Propuesta

Una herramienta open source que, a partir del pool del jugador y de las identidades de color que prefiere, indique qué comandantes de su propio pool aprovechan mejor el resto de sus cartas, explique por qué y, en una segunda etapa, proponga el mazo completo.

### 1.3 Principios de diseño

- **Neutralidad:** ninguna carta recibe trato especial por ser quien es; solo por lo que dice su texto y por lo que hay en el pool. No se usa popularidad ni listas curadas de comandantes.
- **Explicabilidad:** todo resultado se apoya en evidencia calculada y verificable, con cartas concretas del pool.
- **Datos abiertos:** la información de cartas proviene de Scryfall; lo que el formato define se deriva de los datos siempre que sea posible.
- **Contribuible:** reglas, perfiles de importación, umbrales y textos viven en archivos YAML versionados que la comunidad puede mejorar sin tocar el código.
- **Privacidad:** el pool del usuario se procesa en su navegador y no sale de su equipo salvo que él lo decida.
- **Reproducibilidad:** mismos datos, mismas reglas y mismo pool producen siempre el mismo resultado.

### 1.4 Convenciones

Cada regla de negocio tiene un identificador RN-xx que se usa para referenciarla en el código, los tests y la documentación. Las claves de los archivos YAML están en inglés para facilitar contribuciones internacionales; la interfaz y las explicaciones se preparan para varios idiomas, empezando por inglés y añadiendo español más adelante. Los valores numéricos son hipótesis iniciales (v0) que se calibran con los pools de referencia.

| Bloque | Tema | Reglas |
| --- | --- | --- |
| 1 | Elegibilidad de candidatos | RN-01 a RN-09 |
| 2 | Normalización del pool | RN-10 a RN-22 |
| 3 | Umbrales del modelo | RN-23 a RN-37 |
| 4 | Alcance de la salida y construcción del mazo | RN-38 a RN-52 |
| 5 | Explicaciones y casos límite | RN-53 a RN-65 |

## 2. Modelo de puntuación

### 2.1 Conceptos

| Término | Significado |
| --- | --- |
| Pool P | Las cartas del usuario, normalizadas según el bloque 2. |
| Candidato c | Una carta del pool que puede ser comandante, o una pareja válida de ellas. |
| Pool elegible E(c) | Cartas de P legales en Commander cuya identidad de color está contenida en la de c, excluyendo al propio comandante. |
| Perfil temático T(c) | Pesos del comandante sobre los temas, extraídos de su texto, separados en lo que «pide» y lo que «da». |
| Afinidad sin(x, c) | Qué tanto una carta x del pool encaja con el comandante c, de 0 a 1. |

### 2.2 Detección neutral del perfil

El perfil de cada comandante se obtiene en tres capas, todas basadas exclusivamente en texto y en el pool:

1. **Reglas sobre mecánicas:** patrones del archivo YAML aplicados por igual a cualquier carta. Se separa lo que el comandante pide (disparos y recompensas) de lo que da (lo que produce). Una carta tiene sinergia si habilita lo que el comandante pide o aprovecha lo que da.
1. **Similitud semántica precalculada:** embeddings del texto Oracle de todas las cartas, generados una vez en el build con un modelo de texto abierto. Las reglas aportan precisión y explicabilidad; los embeddings, cobertura.
1. **Perfil del pool:** qué quiere hacer la colección por sí misma. Permite descubrir comandantes olvidados que la aprovechan y detectar huecos donde ningún comandante del pool encaja.

### 2.3 Métricas

| Métrica | Qué mide | Reglas |
| --- | --- | --- |
| S — Sinergia | Promedio de las k mejores afinidades del pool elegible con el comandante. | RN-25 a RN-28 |
| F — Esqueleto funcional | Cobertura de roles básicos: ramp, robo, interacción y fixing. | RN-29, RN-30, RN-39, RN-40 |
| U — Utilidad del pool | Cuántas cartas útiles hay y cuántas no-tierras faltan para completar el mazo. | RN-31, RN-32 |

La puntuación final es una suma ponderada de las tres métricas según el perfil elegido (RN-36), con una penalización gradual si el tema principal del comandante tiene poco apoyo (RN-33).

```
Puntuación = multiplicador_tema · (wS·S + wF·F + wU·U)        → mostrada de 0 a 100
```

**Decisión registrada:** la métrica de popularidad (basada en edhrec_rank) se retiró del modelo. Premiar lo popular empujaría al usuario hacia los comandantes de siempre y ocultaría justo las cartas olvidadas que la herramienta busca descubrir. Como mucho, puede existir como filtro opcional, desactivado por defecto.

## 3. Gramática de reglas YAML

### 3.1 Principios

- **Declarativa:** quien contribuye describe qué detectar, no cómo.
- **Autoverificable:** cada regla trae ejemplos de cartas que deben y no deben coincidir; el CI los ejecuta contra los datos de Scryfall.
- **Neutral:** las reglas solo producen etiquetas, nunca puntuaciones.

### 3.2 Normalización del texto

- Todo el texto se pasa a minúsculas.
- El nombre de la propia carta se reemplaza por ~.
- Se elimina el texto recordatorio entre paréntesis.
- Las cartas de varias caras se evalúan cara por cara y las etiquetas se unen.

### 3.3 Estructura del repositorio

```
rules/
  vocabulary.yaml      # temas, roles y macros permitidos (lista cerrada)
  themes/              # sacrifice.yaml, tokens.yaml, counters.yaml, tribal.yaml…
  roles/               # ramp.yaml, draw.yaml, removal.yaml…
  overrides.yaml       # correcciones puntuales con motivo obligatorio
  formats/
    commander/
      format.yaml
      pairing.yaml
      skeleton.yaml
import-profiles/       # mapeo de columnas CSV por aplicación
i18n/                  # plantillas de explicación por idioma
model.yaml             # umbrales y pesos del modelo
```

### 3.4 Esquema de una regla

```
schema_version: 1
rules:
  - id: sacrifice.outlet            # único, formato tema.nombre
    theme: sacrifice                # o "role:" para reglas de rol
    provides: gives                 # gives = habilita | asks = recompensa
    weight: 1.0                     # 0.1–1.0, fuerza de la señal
    match:
      text_any:
        - "sacrifice (a|another) (creature|permanent)( or artifact)?:"
      text_none:
        - "sacrifice ~:"
    examples:
      match: [Viscera Seer, Carrion Feeder]
      no_match: [Llanowar Elves, Sakura-Tribe Elder]

  - id: sacrifice.death-payoff
    theme: sacrifice
    provides: asks
    weight: 1.0
    match:
      text_any:
        - "whenever (~ or )?(a|another) creature( you control)? dies"
    examples:
      match: [Blood Artist, Zulaport Cutthroat]
      no_match: [Viscera Seer]
```

### 3.5 Operadores

| Operador | Actúa sobre | Lógica |
| --- | --- | --- |
| text_any / text_all / text_none | Texto Oracle normalizado | alguno / todos / ninguno |
| type_any / type_none | Línea de tipo | alguno / ninguno |
| keywords_any | Campo keywords de Scryfall | alguno |
| produces_mana | Campo produced_mana de Scryfall | verdadero / falso |

Los patrones son expresiones regulares. Para simplificarlas, vocabulary.yaml define macros reutilizables:

```
macros:
  N: "(a|an|one|two|three|x|\\d+)"
  permanent_type: "(creature|artifact|enchantment|land|planeswalker)s?"
# uso: "create {N} .* tokens?"
```

### 3.6 Temas parametrizados

Una regla puede capturar un valor del texto y generar un tema dinámico, validado contra la lista oficial de tipos de criatura de Scryfall. Así funciona el tribal sin mantener una lista fija:

```
  - id: tribal.lord
    theme: tribal
    provides: asks
    capture: creature_type
    match:
      text_any:
        - "other (?<creature_type>\\w+) creatures( you control)? get"
    examples:
      match: [Elvish Archdruid]        # produce tribal:elf
```

### 3.7 Combinación de etiquetas

- Varias reglas pueden etiquetar la misma carta; las etiquetas se acumulan.
- Mismo tema y misma dirección: se conserva el peso máximo, no la suma.
- Afinidad por pares: «pide» con «da» = 1.0; mismo tema y misma dirección = 0.5.

### 3.8 Overrides

```
overrides:
  - card: "Some Card Name"
    add:    [{ theme: sacrifice, provides: gives, weight: 0.8 }]
    remove: [counters]
    reason: "La regla de contadores coincide con veneno, no con +1/+1"
```

El campo reason es obligatorio y cada override se revisa en el pull request. Los overrides solo añaden o quitan etiquetas, nunca tocan puntuaciones. El CI reporta cuántos overrides acumula cada tema: muchos indican una regla mal escrita.

## 4. Bloque 1: Elegibilidad de candidatos

**Principio:** delegar en los datos de Scryfall lo que define el formato, y declarar en YAML solo lo que Scryfall no expresa directamente.

#### RN-01 — Carta elegible como comandante

Una carta del pool es candidata si Scryfall la considera apta para ser comandante (búsqueda is:commander, descargada en el build como lista de IDs) y su legalidad en Commander es legal. Esto cubre criaturas legendarias, planeswalkers y cartas que dicen «puede ser tu comandante».

#### RN-02 — Comandantes prohibidos

Una carta prohibida en Commander nunca es candidata. Si el usuario la tiene y encaja con sus colores, se indica en una nota para que no parezca un error.

#### RN-03 — Identidad de color

Se usa el campo color_identity de Scryfall, que ya aplica las reglas oficiales (coste, texto, híbridos, pirexiano, indicador de color, ambas caras). No se recalcula.

#### RN-04 — Comandantes en pareja

Una pareja es un candidato único con identidad igual a la unión de ambos, evaluado con el mismo modelo. Solo se forman parejas entre cartas del pool. Las variantes se declaran en YAML y cada variante solo se combina consigo misma.

```
# rules/formats/commander/pairing.yaml
pairings:
  - id: partner
    a: { keyword: "Partner" }
    b: { keyword: "Partner" }
  - id: partner-with
    a: { keyword_pattern: "Partner with (?<name>.+)" }
    b: { name_equals: "{name}" }
  - id: friends-forever
    a: { keyword: "Friends forever" }
    b: { keyword: "Friends forever" }
  - id: choose-a-background
    a: { keyword: "Choose a Background" }
    b: { type_all: ["Legendary", "Enchantment", "Background"] }
  - id: doctors-companion
    a: { keyword: "Doctor's companion" }
    b: { type_all: ["Legendary", "Creature", "Time Lord", "Doctor"] }
```

*Este archivo debe contrastarse con las reglas oficiales vigentes antes de publicarse.*

#### RN-05 — Selección de identidades

El usuario elige una o varias identidades. Por defecto se exige coincidencia exacta; la opción «incluir subconjuntos» muestra también comandantes cuya identidad está contenida en la elegida.

#### RN-06 — Comandantes incoloros

Solo se muestran si el usuario selecciona explícitamente «incoloro», para evitar que saturen todas las búsquedas con subconjuntos.

#### RN-07 — Pareja frente a individuo

Un comandante con capacidad de pareja que también puede liderar solo se evalúa de ambas formas, y la explicación indica cuánto mejora la pareja.

#### RN-08 — Exclusión del propio comandante

El comandante, o ambos miembros de la pareja, se excluyen de E(c).

#### RN-09 — Fuera de alcance por ahora

Companions y otros formatos con comandante (Oathbreaker, Brawl). La estructura rules/formats/ queda preparada para añadirlos.

## 5. Bloque 2: Normalización del pool

Sin importar el origen de la lista, el modelo recibe un conjunto limpio de cartas únicas, legales y bien identificadas, junto a un reporte de todo lo descartado o corregido.

### Identidad de las cartas

#### RN-10 — La unidad es la carta, no la impresión

Cada carta se identifica por su oracle_id. Ediciones, foils, idiomas y artes alternativos son una sola entrada.

#### RN-11 — Nombres en otros idiomas

Un índice de nombres localizados → oracle_id, generado en el build, permite importar listas con nombres en español u otros idiomas.

#### RN-12 — Cartas de varias caras

Se aceptan con el nombre completo o con el de cualquiera de sus caras.

### Resolución de nombres

#### RN-13 — Nunca descartar en silencio

Cada línea importada se clasifica así; es preferible preguntar que adivinar:

| Resultado | Condición | Comportamiento |
| --- | --- | --- |
| Reconocida | Coincidencia exacta, sin distinguir mayúsculas ni tildes | Se acepta |
| Corregida | Un único candidato muy similar | Se acepta y se marca para revisión |
| Ambigua | Varios candidatos posibles | El usuario elige |
| No reconocida | Sin candidatos razonables | Se lista para corregir |

#### RN-14 — Formatos de importación

Texto plano (4 Lightning Bolt, 1x Sol Ring, 1 Sol Ring (CMR) 263; edición y número se ignoran) y CSV mediante perfiles de importación en YAML que mapean columnas por aplicación.

```
# import-profiles/example-app.yaml
id: example-app
detect:
  header_contains: ["Name", "Quantity", "Set code"]
columns:
  name: "Name"
  quantity: "Quantity"
  language: "Language"     # opcional
```

### Cantidades y singleton

#### RN-15 — Singleton por defecto

Para el modelo, 1 o 4 copias de una carta no básica son lo mismo; la cantidad se conserva solo como dato informativo.

#### RN-16 — Excepciones al singleton

Las cartas que permiten varias copias se detectan por regla de texto y cuentan min(cantidad del usuario, límite de la carta).

#### RN-17 — Tierras básicas

Se asumen ilimitadas (incluidas nevadas y Wastes), con opción de usar las cantidades reales.

### Exclusiones

#### RN-18 — Objetos que no son cartas de mazo

Tokens, emblemas, cartas de arte y similares se excluyen por el campo layout y solo se reportan como conteo.

#### RN-19 — Cartas no legales

Prohibidas, solo digitales y de colecciones no legales para torneo se excluyen y se listan. La opción «mesa casual», desactivada por defecto, permite incluir prohibidas.

### Privacidad y reproducibilidad

#### RN-20 — El pool no sale del equipo

Normalización y ranking se ejecutan en el navegador. El pool solo se envía a un servidor si el usuario usa la API o una función que lo requiera, con aviso previo.

#### RN-21 — Versión de los datos

Todo resultado indica la fecha de los datos de Scryfall y la versión de las reglas (por ejemplo, «datos al 2026-10-01 · reglas v1.4»).

### Fase posterior

#### RN-22 — Cartas en uso en otros mazos

El usuario podrá importar sus mazos y marcar esas cartas como «en uso» para incluirlas con aviso o excluirlas. El MVP trabaja con un único pool.

### Reporte de importación

> *312 líneas procesadas · 287 reconocidas · 9 corregidas (revisar) · 2 ambiguas · 3 no reconocidas · Ignoradas: 8 tokens, 1 emblema · No legales: 2 prohibidas · Pool final: 276 cartas únicas (+ tierras básicas ilimitadas)*

## 6. Bloque 3: Umbrales del modelo

Todos los valores de este bloque son hipótesis iniciales (v0) a calibrar con los pools de referencia.

### Gobernanza

#### RN-23 — Ningún umbral en el código

Todos los parámetros viven en model.yaml; el código solo los lee.

#### RN-24 — Cambiar un umbral exige evidencia

Un pull request que modifica model.yaml debe ejecutar la suite de pools de referencia e incluir el diff de rankings resultante.

### Sinergia (S)

#### RN-25 — Afinidad combinada

Las reglas pesan más porque son explicables; la semántica rellena lo que las reglas no detectan.

```
sin(x, c) = α · reglas(x, c) + (1 − α) · semántica(x, c)      con α = 0.7
```

#### RN-26 — Calibración semántica

La similitud coseno se convierte en percentil frente a la distribución de ese comandante contra todas las cartas de su identidad, precalculada en el build.

#### RN-27 — Valor de k

S es el promedio de las k = 30 mejores afinidades de E(c). Si E(c) tiene menos de 30 cartas, los huecos cuentan como 0. Esto evita que los comandantes de muchos colores ganen solo por tener más cartas elegibles.

#### RN-28 — Perfil de una pareja

Es la suma normalizada de los perfiles de ambos comandantes, evaluada con los mismos parámetros.

### Esqueleto funcional (F)

#### RN-29 — Objetivos por rol

Cada rol aporta `f = min(1, cantidad / objetivo)` y F es su promedio ponderado. La interacción se desglosa en subroles en RN-39. Para comandantes mono-color, el peso del fixing se redistribuye proporcionalmente.

| Rol | Objetivo | Peso en F |
| --- | --- | --- |
| Ramp | 10 | 0.25 |
| Robo | 10 | 0.25 |
| Interacción (ver RN-39) | ~12 | 0.35 |
| Fixing | 0 / 3 / 6 según 1 / 2 / 3+ colores | 0.15 |

*Nota: en la versión inicial del bloque 3, la remoción puntual (8, peso 0.25) y los barridos (2, peso 0.10) eran roles separados; el bloque 4 los integró en la familia de interacción conservando su peso conjunto.*

#### RN-30 — Cartas con varios roles

Una carta cuenta en todos los roles que cumple, pero en U cuenta una sola vez.

### Utilidad (U) y cartas faltantes

#### RN-31 — Carta útil

Una carta de E(c) es útil si su afinidad es ≥ 0.5 o si cubre al menos un rol del esqueleto.

#### RN-32 — Tamaño objetivo (revisada en el bloque 4)

U = min(1, útiles / no-tierras objetivo). La cantidad de tierras ya no es fija en 37: se estima con la fórmula de RN-44 aplicada a la curva de las cartas útiles, y no-tierras objetivo = 99 − tierras estimadas. Faltantes = max(0, no-tierras objetivo − útiles). Así el conteo coincide con el mazo que se propondrá después.

### Tema insuficiente

#### RN-33 — Penalización gradual

Se usa una función continua en lugar de un corte brusco, para que una sola carta no provoque saltos en el ranking. Por debajo de 8 cartas de apoyo siempre se muestra una advertencia.

```
multiplicador = 0.5 + 0.5 · min(1, apoyo_tema_principal / 8)
```

### Confianza y plan abierto

#### RN-34 — Niveles de confianza

| Nivel | Condición |
| --- | --- |
| Alta | Las reglas detectan al menos un tema «pide» con peso ≥ 0.5 |
| Media | Las reglas no detectan nada claro, pero la señal semántica sí |
| Baja | Ninguna fuente identifica un plan |

#### RN-35 — Plan abierto

Con confianza baja, el peso de S se redistribuye entre F y U: el comandante se evalúa por lo jugable que es el mazo. Sin popularidad no existe una medida neutral de «calidad general», y la explicación lo dice. Se descarta la penalización por perfil demasiado plano.

### Puntuación final

#### RN-36 — Perfiles de prioridad

El perfil «Lo más fuerte» se eliminó porque dependía de la popularidad.

| Perfil | S | F | U | Para quién |
| --- | --- | --- | --- | --- |
| Aprovechar mi pool (por defecto) | 0.45 | 0.30 | 0.25 | Equilibrio general |
| Máxima sinergia | 0.65 | 0.20 | 0.15 | Mazo con identidad marcada |
| Casi listo para jugar | 0.20 | 0.35 | 0.45 | Jugar ya con lo que se tiene |

#### RN-37 — Presentación y desempates

La puntuación se muestra de 0 a 100. Los empates se resuelven de forma determinista: mayor S, luego menos faltantes, luego orden alfabético.

### Archivo model.yaml

```
schema_version: 1
version: "0.1.0"
synergy:
  alpha_rules: 0.7
  k: 30
  semantic_calibration: percentile
  pair_affinity: { asks_gives: 1.0, same_direction: 0.5 }
skeleton:
  roles:
    ramp:         { target: 10, weight: 0.25 }
    draw:         { target: 10, weight: 0.25 }
    interaction:  { target: 12, weight: 0.35 }    # subroles en skeleton.yaml
    fixing:       { target_by_colors: [0, 3, 6, 6, 6], weight: 0.15 }
lands:
  formula: commander_v0
  base: 36
  mv_reference: 3.0
  mv_slope: 3
  cheap_ramp_discount: 0.33
  min: 33
  max: 40
  mdfc_land_value: 0.5
utility:
  useful_threshold: 0.5
theme_support:
  min_cards: 8
  floor_multiplier: 0.5
confidence:
  high_min_rule_weight: 0.5
  low_redistribute_to: [skeleton, utility]
profiles:
  default:        { synergy: 0.45, skeleton: 0.30, utility: 0.25 }
  max_synergy:    { synergy: 0.65, skeleton: 0.20, utility: 0.15 }
  ready_to_play:  { synergy: 0.20, skeleton: 0.35, utility: 0.45 }
tiebreak: [synergy, missing_asc, name]
```

## 7. Bloque 4: Alcance de la salida y construcción del mazo

La herramienta no solo recomienda comandantes: también propone el mazo. La curva de maná, la interacción y la cantidad de tierras son reglas de negocio de primer nivel. El formato inicial es Commander, con la estructura preparada para otros formatos.

### Dos fases

#### RN-38 — Ranking primero, mazo después

Fase 1: se evalúan todos los candidatos con S, F y U. Fase 2: se construye el mazo propuesto solo para los primeros 5 del ranking o para el comandante que elija el usuario.

### Interacción

#### RN-39 — La interacción como familia de roles

Importan el total y unos mínimos por subrol, no cumplir cada fila exactamente. Una carta flexible puede cubrir varios subroles.

| Subrol | Objetivo orientativo |
| --- | --- |
| Remoción de criaturas | 4 |
| Remoción de artefactos/encantamientos | 2 |
| Contrahechizos | Cuentan como interacción general (solo con azul) |
| Barridos | 2 |
| Odio al cementerio | 1 |
| Protección propia | 2 |
| **Total de interacción** | **~12** |

#### RN-40 — Objetivos ajustados por tema

Los objetivos del esqueleto se modifican según el plan detectado del comandante, con modificadores declarados en YAML.

```
theme_modifiers:
  voltron:      { protection: +3, wipe: -1 }
  spellslinger: { draw: +2, interaction_total: +2 }
  graveyard:    { graveyard_hate: -1 }
```

### Curva de maná

#### RN-41 — Medición de la curva

Se calcula el MV medio de las no-tierras (sin el comandante) y su distribución por franjas: 0–1, 2, 3, 4, 5 y 6+.

#### RN-42 — Forma objetivo de la curva

Cada franja tiene un rango orientativo configurable. A igual afinidad, se elige la carta que mejor ajusta la curva. Una curva pesada genera una advertencia.

#### RN-43 — El comandante en curva

El mazo debe permitir lanzar al comandante cerca del turno igual a su MV. Si no es probable, se advierte y se prioriza el ramp.

### Tierras

#### RN-44 — Fórmula base (v0)

ramp_barato son las cartas de ramp de MV 2 o menos. Los coeficientes deben contrastarse con análisis publicados sobre cantidad de tierras en Commander (por ejemplo, los de Frank Karsten) y con los pools de referencia.

```
tierras = 36 + 3 · (MV_medio − 3.0) − 0.33 · ramp_barato      (acotado entre 33 y 40)
```

#### RN-45 — Verificación probabilística

La cantidad propuesta se verifica con cálculo hipergeométrico: probabilidad de tierras suficientes en la mano inicial y de jugar una tierra por turno en los turnos 1 a 4. Se muestra al usuario (por ejemplo, «88 % de probabilidad de bajar tu tercera tierra en turno 3»).

#### RN-46 — Composición de la base de maná

Primero tierras no básicas del pool que producen los colores del comandante; luego tierras utilitarias con afinidad alta; el resto, básicas repartidas según la proporción de símbolos de maná de cada color.

#### RN-47 — Cartas que cuentan como media tierra

Las cartas modales de dos caras con tierra en la cara trasera cuentan como 0.5 tierras.

### Construcción

#### RN-48 — Algoritmo de construcción determinista

1. Fijar el comandante o la pareja.
1. Cubrir los mínimos del esqueleto con la carta de mayor afinidad en cada rol.
1. Llenar los huecos restantes por afinidad, respetando la forma de la curva.
1. Calcular tierras con RN-44 y ajustar las no-tierras; repetir hasta que no cambie (2 o 3 iteraciones).
1. Armar la base de maná según RN-46.
1. Verificar con RN-45 y generar advertencias.

#### RN-49 — Mazos incompletos

Si el pool no alcanza, el mazo se entrega con huecos etiquetados por rol. En la v1.1 no se sugieren cartas fuera del pool; más adelante podrían sugerirse ordenando todas las cartas legales por afinidad con el comandante, de forma igualmente neutral.

#### RN-50 — Exportación

El mazo se exporta en texto plano, una carta por línea («1 Nombre de carta»), formato que aceptan la mayoría de plataformas de construcción de mazos.

### Otros formatos

#### RN-51 — Perfiles de formato

Todo lo que depende del formato vive en un perfil YAML. La identidad de color, las parejas y la zona de mando son un módulo exclusivo de Commander, activado por has_commander.

```
# formats/commander/format.yaml
id: commander
legality_key: commander
deck_size: 100
copies_limit: 1
has_commander: true
lands: { formula: commander_v0, min: 33, max: 40 }
skeleton: skeleton.yaml

# formats/pauper/format.yaml   (futuro)
id: pauper
legality_key: pauper
deck_size: 60
copies_limit: 4
has_commander: false
sideboard: 15
lands: { formula: sixty_card_v0, min: 18, max: 26 }
```

#### RN-52 — Diferencias de los formatos de 60 cartas

- La pregunta pasa a ser «qué arquetipo soporta mi pool»; el perfil temático del pool es el puente.
- Elegir cuántas copias de cada carta pasa a formar parte de la construcción.
- En Standard, Modern o Legacy competitivos la calidad depende del metagame, que el modelo neutral no conoce; la herramienta se presenta como de construcción casual en esos formatos.
- Rotaciones y cambios de legalidad se cubren solos con los datos de Scryfall (RN-19).

## 8. Bloque 5: Explicaciones y casos límite

### Explicaciones

#### RN-53 — Evidencia estructurada, texto aparte

El motor produce un objeto de evidencia; la interfaz lo convierte en texto con plantillas por clave. Traducir consiste en añadir un archivo de plantillas.

```
{
  "commander": "oracle_id…",
  "score": 78,
  "confidence": "high",
  "strengths": [
    { "key": "theme_support", "theme": "sacrifice", "count": 27,
      "top_cards": ["…", "…", "…"] }
  ],
  "weaknesses": [
    { "key": "role_below_target", "role": "removal_artifact",
      "have": 0, "target": 2 }
  ],
  "missing_nonlands": 14,
  "warnings": [ { "key": "commander_off_curve", "mv": 6 } ]
}
```

```
# i18n/en.yaml
theme_support: "You have {count} {theme} cards that work with this commander."
# i18n/es.yaml (futuro)
theme_support: "Tienes {count} cartas de {theme} que funcionan con este comandante."
```

#### RN-54 — Estructura fija

Siempre en el mismo orden: resumen de una línea, fortalezas, debilidades, cartas faltantes, advertencias y nivel de confianza.

#### RN-55 — Toda afirmación cita cartas del pool

Cada fortaleza o debilidad nombra hasta 5 cartas concretas del usuario como evidencia.

#### RN-56 — Lenguaje sin absolutos

Nunca «el mejor comandante», sino «el que mejor aprovecha tu pool con el perfil elegido».

#### RN-57 — Comparación entre candidatos

El usuario puede comparar dos candidatos métrica por métrica (por ejemplo, «A supera a B en sinergia (+18), pero B tiene mejor esqueleto (+9)»).

#### RN-58 — Panel «ver cálculo»

Muestra las métricas sin redondear y, por carta, los id de las reglas YAML que se activaron. Sirve para transparencia y para reportar reglas mal escritas.

### Casos límite

#### RN-59 — Ningún candidato en las identidades elegidas

Se indica y se muestran las identidades más cercanas con candidatos, además de los prohibidos relevantes (RN-02).

#### RN-60 — Todos los candidatos son flojos

Si ninguno supera 40 puntos, se muestran con un encabezado honesto y se destaca la detección de huecos.

#### RN-61 — Detección de huecos

Un tema con 15 o más cartas de apoyo en una identidad, sin ningún candidato cuyo tema principal sea ese, se reporta como hueco. En la v1 no se sugieren comandantes fuera del pool.

#### RN-62 — Pool muy pequeño

Con menos de 30 cartas elegibles para cualquier candidato, se advierte que las diferencias son poco significativas y el foco pasa a las cartas faltantes.

#### RN-63 — Pool muy grande y explosión de parejas

Las parejas se evalúan solo entre los mejores M candidatos individuales con capacidad de pareja (M configurable, por ejemplo 15). Objetivo de rendimiento verificado en CI: ranking completo en menos de 2 segundos en el navegador para un pool de 5.000 cartas.

#### RN-64 — Cartas más nuevas que los datos

Si una carta no se reconoce y los datos tienen varias semanas, el reporte sugiere que puede ser de una colección posterior.

#### RN-65 — Mecánicas nuevas sin reglas

El CI reporta las palabras clave más frecuentes entre comandantes con confianza baja, para orientar a la comunidad sobre qué reglas escribir primero.

## 9. Plan de entrega por etapas

| Etapa | Contenido | Reglas |
| --- | --- | --- |
| v1 | Ranking de comandantes con explicación, diagnóstico de esqueleto e interacción, estimación de tierras y curva | Bloques 1, 2, 3 y 5 completos; del bloque 4: RN-32 (revisada), RN-38 (fase 1), RN-39, RN-40, RN-41, RN-43, RN-44, RN-47 |
| v1.1 | Construcción completa del mazo propuesto | RN-42, RN-45, RN-46, RN-48, RN-49, RN-50 |
| Futuro | Ampliaciones | RN-22 (cartas en uso), sugerencias fuera del pool, RN-51 y RN-52 (otros formatos), interfaz en español y otros idiomas |

La verificación hipergeométrica (RN-45) se reserva para la v1.1 porque necesita un mazo concreto para ser fiable; la v1 solo ofrece la estimación de tierras.

## 10. Validación y decisiones pendientes

### 10.1 Validación del modelo

- **Pools de referencia:** casos donde jugadores experimentados acuerdan el resultado esperado; funcionan como tests y como base de calibración.
- **Análisis de sensibilidad:** si un cambio pequeño en los pesos reordena todo el ranking, el modelo es frágil.
- **Sesgos vigilados:** comandantes de muchos colores (mitigado con top-k y fixing) y comandantes genéricos (cubierto por el nivel de confianza).

### 10.2 Pendientes

- Calibrar los coeficientes v0 de model.yaml con la suite de pools de referencia.
- Contrastar pairing.yaml con las reglas oficiales de Commander vigentes.
- Contrastar la fórmula de tierras (RN-44) con análisis publicados.
- Revisar la Fan Content Policy de Wizards of the Coast antes del lanzamiento público.
- Revisar las condiciones de uso de imágenes y simbología de Scryfall (atribución, no alterar imágenes).
- ~~Elegir licencia~~ — decidido: MIT.
- ~~Definir el stack tecnológico y la interfaz~~ — decidido: monorepo TypeScript con Next.js (exportación estática).
