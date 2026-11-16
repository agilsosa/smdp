# CityNexus · Panel de decisiones para una ciudad inteligente

Aplicación de escritorio **Electron + React** que recibe telemetría de un Arduino por
**puerto serie**, muestra el estado de cinco categorías de sensores urbanos y usa **Gemini**
para generar decisiones y recomendaciones para la ciudadanía. Las decisiones se envían de
vuelta al Arduino en un formato de texto fijo.

Incluye un **modo demo** que genera lecturas realistas sin necesidad de hardware.

## Categorías y decisiones

| Categoría      | Lecturas del Arduino                         | Decisión devuelta              |
| -------------- | -------------------------------------------- | ------------------------------ |
| Energía        | solar y eólica (kW + voltaje), residuos (kW) | `solar`, `eolica` o `residuos` |
| Semáforo       | ocupación vertical y horizontal              | `rojo`, `amarillo` o `verde`   |
| Sol / Cubierta | radiación norte y sur                        | `cubrir` o `libre`             |
| Temperatura    | ambiente (°C) y humedad (%)                  | `frio` o `caliente`            |
| Agua           | nivel del depósito (%)                       | `bajo`, `full` o `normal`      |
| Poste          | se deriva de la radiación solar              | `encender` o `apagar`          |

Reglas locales de respaldo (se usan si Gemini no está disponible):

- **Energía:** la fuente con el valor más alto es la que está en uso. La interfaz muestra
  las tres potencias, el voltaje de solar/eólica y el total en kW.
- **Semáforo:** ambos sensores ocupados → `rojo`; solo uno ocupado → `amarillo`; ninguno →
  `verde`. El semáforo físico tiene tres luces (D3 roja, D4 amarilla y D5 verde).
- **Sol / Cubierta:** radiación máxima ≥ 60 % → `cubrir` (motor D11 activo); si no, `libre`.
- **Temperatura:** ≥ 26 °C → `caliente`; por debajo → `frio`.
- **Agua:** < 25 % → `bajo`; ≥ 85 % → `full`; resto → `normal`.
- **Poste:** radiación máxima < 35 % (noche o nubosidad densa) → `encender`; si no, `apagar`.
  Controla los postes norte (D11) y sur (D12).
- **Residuos:** no tiene sensor físico; el sketch reporta una estimación configurable y se
  usa como tercera fuente para los indicadores D8/D9/D10.

## Formato de entrada del Arduino

El Arduino envía un bloque de cinco líneas. Los valores entre paréntesis se sustituyen por
las lecturas reales:

```text
Energía: solar (432.1), eolica (315.0), residuos (180.0), voltaje_solar (4.20), voltaje_eolica (3.15)
Semaforo: vertical (libre), horizontal (ocupado)
Sol: norte (72), sur (41)
Temperatura: ambiente (24.5), humedad (56)
Agua: nivel (68)
```

Los pares `voltaje_solar` y `voltaje_eolica` son opcionales; si el sketch no los envía, la
interfaz sigue funcionando. El parser acepta acentos, mayúsculas y espacios variables. Las
líneas se agrupan hasta completar las cinco categorías; si el Arduino deja de enviar, se
procesa el bloque parcial tras 2,5 segundos de inactividad.

## Formato de salida hacia el Arduino

La aplicación envía exactamente este bloque, con una decisión por línea:

```text
energia: solar
semaforo: amarillo
sol: cubrir
temperatura: caliente
agua: normal
poste: apagar
```

El sketch lee estas líneas y actúa sobre las luces, el motor de la cubierta, los indicadores
de energía y los postes.

## Mapa de pines del sketch

| Pin   | Función                                                        |
| ----- | -------------------------------------------------------------- |
| `D2`  | Sensor de ocupación vertical (`INPUT_PULLUP`, LOW = ocupado)   |
| `D6`  | Sensor de ocupación horizontal (`INPUT_PULLUP`, LOW = ocupado) |
| `D3`  | Luz roja del semáforo                                          |
| `D4`  | Luz amarilla del semáforo                                      |
| `D5`  | Luz verde del semáforo                                         |
| `D8`  | Indicador de energía solar en uso                              |
| `D9`  | Indicador de energía eólica en uso                             |
| `D10` | Indicador de energía de residuos en uso                        |
| `D11` | Motor/relé de la cubierta de edificios                         |
| `D12` | Libre / Poste sur (opcional)                                   |
| `A0`  | LDR sur                                                        |
| `A1`  | Temperatura y humedad (DHT11/DHT22 o TMP36 analógico)          |
| `A2`  | LDR norte                                                      |
| `A4`  | Voltaje entregado por los paneles solares                      |
| `A5`  | Sensor de nivel de agua                                        |
| `A6`  | Voltaje de la eólica (Nano)                                    |
| `A3`  | Alternativa para la eólica en Arduino UNO (no existe A6)       |

Notas de conexión:

- **A6 solo existe en placas como Arduino Nano.** En un UNO el sketch usa `A3`
  automáticamente para la eólica; conecta allí la señal.
- **DHT en A1:** añade una resistencia pull-up de 10 kΩ entre A1 y 5 V. Si no hay DHT, el
  sketch usa A1 como entrada analógica para un TMP36 y estima la humedad. Para un LM35
  cambia `TEMP_ANALOG_OFFSET_V` a `0.0`.
- **Motor y postes:** usa relé, transistor o driver; no los conectes directos al pin.
- **Sensores de ocupación:** si tu módulo entrega HIGH al detectar, cambia
  `OCCUPIED_LEVEL` a `HIGH`.
- **LDR:** si tu módulo entrega más voltaje con menos luz, pon `LIGHT_INVERTED` en `true`.
- **Voltajes:** el ADC solo admite 0–5 V. Si mides paneles o eólica de más tensión, usa un
  divisor y ajusta `SOLAR_VOLTAGE_RATIO`, `WIND_VOLTAGE_RATIO`, `SOLAR_KW_PER_VOLT` y
  `WIND_KW_PER_VOLT`.
- **Nivel de agua:** si el sensor entrega la lectura invertida, intercambia
  `WATER_EMPTY_RAW` y `WATER_FULL_RAW`.

## Funcionalidades de la interfaz

- Panel de energía con las tres fuentes, voltaje de solar/eólica, porcentaje de
  participación y total en kW.
- Semáforo de tres luces con los dos sensores de ocupación y aviso de congestión.
- Panel solar con posición, nubosidad y estado de la cubierta de los edificios.
- Panel de entorno con temperatura, humedad, nivel de agua y estado de la cubierta.
- Tablero con las seis decisiones, su explicación y recomendaciones ciudadanas.
- Asistente conversacional con streaming para preguntar sobre las lecturas.
- Visor del bloque de salida, envío manual y envío automático al Arduino.
- Registro de eventos, logs completos y ajustes de API key/modelo.
- Indicador de origen de cada decisión: **Gemini** o **LOCAL**.

## Requisitos

- Node.js 20.19+ (recomendado 22 o superior).
- Arduino IDE para cargar el sketch (opcional).
- Una API key de Gemini desde [Google AI Studio](https://aistudio.google.com/apikey).
  Sin clave, la app sigue funcionando con decisiones locales.

## Instalación

```bash
npm install
```

`serialport` incluye binarios precompilados N-API, así que normalmente no necesitas
compilador. Si tu plataforma no tiene un prebuild disponible:

```bash
npm run rebuild
```

### Permisos del puerto en Linux

```bash
sudo usermod -aG dialout "$USER"
# Cierra sesión y vuelve a entrar, o reinicia.
```

En Windows suele ser necesario el driver del chip USB-serie (CH340, CP210x, FTDI…).

## Configurar Gemini

1. Crea una clave en <https://aistudio.google.com/apikey>.
2. Abre la app, pulsa **Ajustes** y pega la clave.
3. O copia `.env.example` a `.env` y define `GEMINI_API_KEY`.

| Variable         | Descripción                                    |
| ---------------- | ---------------------------------------------- |
| `GEMINI_API_KEY` | Clave de la API de Gemini.                     |
| `GEMINI_MODEL`   | Modelo a usar. Por defecto `gemini-3.8-flash`. |

La clave introducida desde la interfaz se guarda en `settings.json` dentro del directorio
de datos de usuario de Electron, con permisos `0600` cuando el sistema lo permite.

## Ejecutar

```bash
npm run dev      # desarrollo con HMR
npm start        # previsualizar la build
npm run build    # compilar main, preload y renderer
```

Atajo: `F12` abre DevTools en desarrollo.

## Conectar el Arduino

1. Carga [`arduino/smdp_sensors/smdp_sensors.ino`](arduino/smdp_sensors/smdp_sensors.ino).
2. Conecta la placa por USB.
3. Elige el puerto y la velocidad (9600 baudios en el sketch).
4. Pulsa **Conectar**.

El sketch usa lecturas analógicas para la radiación, el nivel de agua y los voltajes de
generación; entradas digitales para los dos sensores de ocupación; y salidas digitales para
las tres luces, el motor de la cubierta, los indicadores de energía y los postes. Si no
tienes todos los sensores, los valores que faltan se estiman. También puedes usar **Modo
Demo** en la app para probar todo sin hardware.

## Cómo se generan las decisiones

1. Al completarse una trama, el renderer pide decisiones al proceso principal.
2. El proceso principal construye un prompt con las lecturas y las reglas de negocio.
3. Gemini responde con **JSON estructurado** (`responseMimeType` + `responseSchema`) que
   contiene las seis decisiones, una explicación y recomendaciones.
4. El resultado se valida contra los valores permitidos. Si algo falla, se usa el cálculo
   local determinista y se etiqueta como `LOCAL`.
5. El bloque de salida se muestra en pantalla y, si el envío automático está activo, se
   escribe en el puerto serie.

El análisis automático se limita a una decisión cada ~12 segundos para no saturar la API.
El botón **Analizar ahora** fuerza una decisión inmediata.

## Seguridad

- `contextIsolation: true`, `nodeIntegration: false` y preload con `contextBridge`.
- La API key permanece en el proceso principal; nunca se expone al renderer.
- CSP restrictiva en `index.html`.
- Los valores que llegan del Arduino se validan y se limitan a las categorías conocidas.

## Arquitectura

```text
src/
├── main/
│   ├── index.js          Arranque de Electron y variables de entorno
│   ├── ipc.js            Canales IPC, decisiones y streaming del chat
│   ├── serial-manager.js Puerto serie, modo demo y escritura al Arduino
│   ├── city-parser.js    Parser de las cinco líneas y ensamblado de tramas
│   ├── gemini-service.js Decisiones estructuradas y chat con Gemini
│   └── settings-store.js Persistencia local de ajustes
├── preload/              Puente seguro con contextBridge
├── shared/
│   ├── channels.js       Nombres de canales IPC
│   └── city.js           Modelo, etiquetas, reglas locales y payload
└── renderer/             Interfaz React + Vite
```

Flujo de datos:

```text
Arduino --serie--> serial-manager --IPC--> React (paneles y decisiones)
                                      \--> gemini-service --HTTPS--> Gemini
React --IPC--> serial-manager --serie--> Arduino (decisiones)
```

## Empaquetar

```bash
npm run build:linux
npm run build:win
npm run build:mac
```

El empaquetado incluye los binarios nativos de `serialport`.

### Release automático para Windows (GitHub Actions)

El repositorio incluye un flujo de trabajo en `.github/workflows/release-windows.yml` que compila y publica automáticamente el instalador de Windows (`citynexus-<version>-setup.exe`):

1. **Por etiqueta Git (recomendado):**
   Crea y empuja una etiqueta que comience por `v` (por ejemplo, `v1.0.0`):

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

   La acción compilará la versión para Windows, generará las notas de la versión automáticamente y adjuntará el instalador NSIS en la sección **Releases** de GitHub.

2. **Ejecución manual (workflow_dispatch):**
   Ve a la pestaña **Actions** en GitHub, selecciona **Release Windows Build** y pulsa **Run workflow**. Puedes configurar:
   - `create_release`: Si se debe crear la release en GitHub (por defecto `true`).
   - `tag_name`: Etiqueta personalizada o dejar en blanco para usar la versión de `package.json`.
   - `draft` y `prerelease`: Marcar como borrador o pre-release si es necesario.
   - El instalador compilado también estará disponible para su descarga en la sección **Artifacts** de la ejecución.

## Problemas frecuentes

| Problema                                 | Solución                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| No aparecen puertos                      | Revisa cable/driver y permisos (`dialout`). Pulsa ↻.                       |
| `Error: Cannot find module ... bindings` | `npm run rebuild`.                                                         |
| El puerto se abre pero no hay datos      | Comprueba baudios y que el sketch envíe las cinco líneas completas.        |
| Gemini: falta API key                    | Configúrala en Ajustes o en `.env`; la app usará decisiones locales.       |
| Gemini: límite de uso                    | Espera o revisa la cuota. La app cae automáticamente a decisiones locales. |
