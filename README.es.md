# ReCom TCG

**Descubre los comandantes que tienes escondidos en tu propio pool de cartas.**

[Read in English](README.md)

La mayoría de las herramientas de Commander parten de un comandante que ya elegiste y te sugieren cartas para comprar. ReCom TCG hace el camino inverso: importas las cartas que **ya tienes**, eliges las identidades de color que quieres jugar, y la herramienta ordena los legendarios de tu pool según qué tan bien aprovechan el resto de tu colección, y te explica por qué.

> Estado: **desarrollo inicial (M0)**. Todavía no hay nada usable. Las reglas de negocio completas están en [`docs/especificacion.md`](docs/especificacion.md).

## Principios

- **Neutral.** Ninguna carta recibe trato especial por ser popular. Solo importan su texto de reglas y tu pool.
- **Explicable.** Cada puntuación viene con evidencia: las cartas concretas de tu pool que la sostienen.
- **Privado.** Tu pool se procesa en tu navegador y nunca sale de tu equipo.
- **Datos abiertos.** Los datos de cartas vienen de [Scryfall](https://scryfall.com).
- **Hecho con la comunidad.** Las reglas de detección, los umbrales y los textos viven en archivos YAML que cualquiera puede mejorar con un pull request, sin tocar código.

## Cómo funciona

1. **En el build (semanal, en CI):** se descargan los datos de Scryfall, se aplican las reglas YAML al texto Oracle de cada carta y se publican los datos etiquetados y versionados.
2. **En tu navegador:** importas tu pool, eliges identidades y el motor puntúa cada candidato con tres métricas: **sinergia**, **esqueleto del mazo** (ramp, robo, interacción, fixing) y **cartas aprovechables**. Luego explica el resultado.

## Primeros pasos

Requisitos: Node.js 22+ y pnpm 10 (`corepack enable` lo instala).

```bash
pnpm install          # la primera vez crea pnpm-lock.yaml: súbelo al repo
pnpm check            # valida los YAML, revisa tipos y corre los tests
pnpm dev              # la web en http://localhost:3000

pnpm data:fetch       # descarga los datos de Scryfall en data/raw/
pnpm data:build       # genera los datos etiquetados en data/out/
```

Cómo está construido por dentro, y las convenciones de Clean Code y SOLID que sigue el código: [`docs/arquitectura.md`](docs/arquitectura.md).

La estructura del repositorio, la hoja de ruta y la guía de contribución están en el [README en inglés](README.md) y en [CONTRIBUTING.md](CONTRIBUTING.md). Las contribuciones en español son bienvenidas.

## Licencia

[MIT](LICENSE). Cubre el código y la documentación del proyecto, no el contenido de Magic: The Gathering ni los datos de Scryfall.

---

ReCom TCG es contenido de fans no oficial permitido bajo la Fan Content Policy de Wizards of the Coast. No está aprobado ni respaldado por Wizards. Parte de los materiales usados son propiedad de Wizards of the Coast. © Wizards of the Coast LLC. Datos de cartas provistos por [Scryfall](https://scryfall.com).
