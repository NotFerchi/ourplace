# Our Place

Life OS personal: escena 3D viva de fondo + HUD de productividad en vidrio.
Todo el stack corre en capas gratuitas.

## Correr en local (con login)

Requiere Node.js 20.19 o superior y una base de datos Neon (gratis, ver abajo).

```bash
# 0) Base de datos (en la raíz): escribe DATABASE_URL y DATABASE_URL_UNPOOLED en .env.local
neon env pull               # o `neon deploy`; requiere `neon login`

# 1) Servidor
cd server
cp .env.example .env        # un JWT_SECRET, una TOKEN_ENC_KEY y, si quieres, un INVITE_CODE
npm install
npm run db:migrate:local    # crea las tablas
npm run dev                 # http://localhost:3000

# 2) Cliente (otra terminal)
cd client
npm install
npm run dev                 # http://localhost:5173, reenvía /api al servidor
```

En local, si dejas `INVITE_CODE` vacío el registro no pide código.

## Desplegar (gratis): Neon + Render

Un solo servicio de Render sirve la API y el frontend; Neon guarda los datos.

1. **Base de datos.** En neon.tech crea un proyecto. En *Connect* copia dos cadenas:
   la **pooled** (host con `-pooler`) y la **directa** (sin `-pooler`).
2. **Código en GitHub.** Sube la carpeta a un repositorio **privado** (`.env` ya está en `.gitignore`).
3. **Render.** En render.com: *New → Blueprint* → elige el repositorio. Lee `render.yaml` y te pide:
   `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (directa), `TOKEN_ENC_KEY` e `INVITE_CODE` (opcional).
   `TOKEN_ENC_KEY` cifra los tokens de los servicios conectados; sin ella el servidor no arranca. Genérala con
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` y guárdala: si la cambias,
   hay que volver a conectar cada servicio.
   `JWT_SECRET` lo genera solo. Pulsa *Apply*; el primer despliegue tarda unos minutos y
   crea las tablas solo (`prisma migrate deploy` corre al arrancar).
   `INVITE_CODE` es opcional: si lo dejas vacío, **cualquiera con la URL puede crear una cuenta**;
   si le pones un valor, el registro pedirá ese código.
4. **Cuentas.** Abre la URL `https://my-place-xxxx.onrender.com`, pulsa *Crear cuenta* (y usa el código, si definiste uno).
   Tu novia hace lo mismo con su correo: cada quien ve solo sus tareas y su agenda.
5. **Cierra el registro cuando terminen** (opcional). Define o cambia `INVITE_CODE` por algo nuevo que no compartas con nadie.

Para actualizar, haz `git push`: Render vuelve a desplegar.

**Lo que hay que saber del plan gratis**

- Render duerme el servicio tras 15 minutos sin visitas; la primera carga después tarda ~30-60 s.
  Para evitarlo (y para que las alertas de la Fase 3 corran), un ping gratis a `/api/health`
  cada 10 minutos desde cron-job.org o UptimeRobot lo mantiene despierto.
- Neon también se suspende cuando no se usa y despierta solo en menos de un segundo.
- La sesión dura 30 días en una cookie `httpOnly`. Las contraseñas se guardan con bcrypt.

## Conexiones (importar tareas)

El botón de enlace junto a *Cerrar sesión* abre **Conexiones**. Por ahora: **ClickUp**.

1. En ClickUp: avatar → *Settings* → *Apps* → *API Token* (empieza con `pk_`).
2. Pégalo en Conexiones → *Conectar*. Se guarda cifrado (AES-256-GCM con `TOKEN_ENC_KEY`) y no vuelve al navegador.
3. Se importan las tareas abiertas que tienes asignadas, con su fecha, descripción y enlace. Categoría: *Proyecto*
   (se cambia en la conexión).

La importación es de solo lectura: lo que cambies aquí no cambia en ClickUp, y la siguiente sincronización
vuelve a traer título, notas y fecha desde allá. Lo que marques como hecho aquí no se reabre. Si una tarea
desaparece de ClickUp no se borra; solo deja de actualizarse. Al desconectar puedes borrar las importadas.
Las pruebas del servidor (`npm test` en `server/`, Node 22.3+) usan un ClickUp simulado y no tocan la base.

## Atajos

| Acción | Atajo |
| --- | --- |
| Captura rápida | `Ctrl + K` / `Cmd + K` |
| Guardar tarea | `Enter` |
| Modo Zen (mostrar / ocultar paneles) | `Esc` |
| Ver la escena a otra hora | agrega `?hour=19.5` a la URL (0 a 24) |

## Estructura

```
our-place/
├── client/                      Frontend React + Vite
│   ├── public/models/           Aquí va my-place.glb (Fase 4)
│   └── src/
│       ├── App.jsx              Composición: escena + HUD + atajos
│       ├── config.js            Modelo GLB y rango de la agenda
│       ├── index.css            Tailwind, tipografía y sombra del HUD
│       ├── scene/               Todo lo 3D
│       │   ├── Scene.jsx            Canvas, luces y post-procesado
│       │   ├── dayCycle.js          Fondo y luz según la hora real
│       │   ├── Sky.jsx              Degradado de fondo y estrellas
│       │   ├── CameraRig.jsx        Ángulo de maqueta + paralaje con el mouse
│       │   ├── world.js             Medidas de la base y posición de cada cosa
│       │   ├── textures.js          Texturas pintadas de 256×256 (CanvasTexture)
│       │   ├── PlaceholderScene.jsx Arma el diorama
│       │   ├── Base.jsx             Terreno, pared del acantilado, lago y sendero
│       │   ├── Forest.jsx           Pinos, bloques de roca, helechos y arbustos (instanciados)
│       │   ├── Cabin.jsx            Cabaña con sala interior, vigas y deck
│       │   ├── Waterfall.jsx        Cascada con espuma animada
│       │   ├── Stairs.jsx           Escalera con faroles y muelle
│       │   ├── Campfire.jsx         Fogata
│       │   ├── Couple.jsx           Los dos personajes y los troncos
│       │   ├── Particles.jsx        Luciérnagas, chispas, bruma
│       │   ├── parts.jsx            Barandal y poste con farol
│       │   └── MyPlaceModel.jsx     Cargador del GLB de Blender
│       ├── hud/                 Interfaz de cristal
│       │   ├── glass.js             Clases del cristal
│       │   ├── AuthScreen.jsx       Entrar / crear cuenta
│       │   ├── Header.jsx           Marca, estado, saludo, reloj, salir
│       │   ├── WeekStrip.jsx        Semana en curso
│       │   ├── TodayPanel.jsx       Tareas de hoy + próximas
│       │   ├── NextUpCard.jsx       Tarjeta ámbar con cuenta regresiva
│       │   ├── AgendaPanel.jsx      Agenda por horas
│       │   ├── BottomDock.jsx       Filtros, Modo Zen, captura
│       │   └── QuickCapture.jsx     Captura rápida
│       ├── hooks/               useAuth, useTasks, useBlocks, useRemoteList, useNow
│       └── lib/                 api.js (fetch), fechas, categorías, lógica de tareas
├── server/                      Backend Express + Prisma 6
│   ├── .env.example
│   ├── prisma/schema.prisma     User, Task y Block para Neon
│   ├── prisma/migrations/       0001_init: crea todas las tablas
│   ├── src/                     index.js (arranque), app.js, auth.js, crypto.js (tokens cifrados)
│   │   ├── routes/              auth, tasks, blocks, integrations
│   │   └── integrations/        conectores (clickup.js) y sync.js
│   └── test/                    npm test: sincronización con ClickUp simulado
├── render.yaml                  Despliegue en Render (plan gratis)
└── package.json                 Scripts raíz que usa Render (build / start)
```

## Ajustar la escena

- **Noche fija o reloj real:** `FOLLOW_CLOCK` en `scene/dayCycle.js`. En `false` (predeterminado) siempre es de noche; en `true` sigue la hora de tu computadora. Con `?hour=13` en la URL pruebas cualquier hora.
- **Encuadre:** `AZIMUTH`, `PITCH` y las distancias de `VIEWS` en `scene/CameraRig.jsx`; el `fov` está en `scene/Scene.jsx`.
- **Niebla:** `<fogExp2 ... density={0.014} />` en `scene/Scene.jsx`. Más densidad esconde antes el bosque lejano.
- **Luces cálidas:** el color es `WARM` en `scene/parts.jsx`. Los faroles con `light` proyectan luz real; si va lento en tu equipo, quítale `light` a algunos.
- **Píxel y resplandor:** `<Pixelation granularity={2} />` y `<Bloom ... intensity={0.7} />` en `scene/Scene.jsx`.
- **Mover cosas:** posiciones de la cabaña, fogata, troncos, sendero, escalera y muelle en `scene/world.js`.
- **Colores de las texturas:** las paletas `P` al inicio de `scene/textures.js`.

## Usar tu modelo de Blender

1. Exporta como glTF binario (`.glb`) con las animaciones incluidas.
2. Copia el archivo a `client/public/models/my-place.glb`.
3. En `client/src/config.js` cambia `model.enabled` a `true`.

Se reproducen en bucle todos los clips cuyo nombre contenga "Idle"; si no hay
ninguno, el primer clip. El cielo, las luces y las partículas siguen activos.
Si el archivo falta o falla, la app vuelve sola a la escena placeholder.

## Siguientes fases

- **Fase 2 (hecha):** Express + Prisma 6 + Neon, con cuentas.
- **Fase 3:** `node-cron` + ntfy.sh para alertas al celular.
- **Fase 4:** modelo GLB propio, audio ambiental y micro-interacciones.
