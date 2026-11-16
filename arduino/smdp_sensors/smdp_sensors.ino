/*
 * SMDP · CityNexus · Sensores y actuadores de ciudad
 * -------------------------------------------------
 * Envía por el puerto serie un bloque de cinco líneas (una por categoría)
 * cada segundo, con este formato:
 *
 *   Energía: solar (432.1), eolica (315.0), residuos (180.0), voltaje_solar (4.20), voltaje_eolica (3.15)
 *   Semaforo: vertical (libre), horizontal (ocupado)
 *   Sol: norte (72), sur (41)
 *   Temperatura: ambiente (24.5), humedad (56)
 *   Agua: nivel (68)
 *
 * La aplicación responde con el bloque de decisiones:
 *
 *   energia: solar
 *   semaforo: amarillo
 *   sol: cubrir
 *   temperatura: caliente
 *   agua: normal
 *   poste: apagar
 *
 * El sketch aplica esas decisiones a las luces, al motor de la cubierta,
 * a los indicadores de energía y a los postes.
 *
 * ---------------------------------------------------------------------------
 * MAPA DE PINES
 * ---------------------------------------------------------------------------
 * SEMÁFORO
 *   D2   Sensor de paso vertical   (INPUT_PULLUP, LOW = ocupado)
 *   D6   Sensor de paso horizontal (INPUT_PULLUP, LOW = ocupado)
 *   D3   Luz roja
 *   D4   Luz amarilla
 *   D5   Luz verde
 *
 * SOL / CUBIERTA DE EDIFICIOS
 *   A0   LDR sur
 *   A2   LDR norte
 *   D11  Motor/relé de la cubierta (HIGH = cubrir)
 *
 * ENERGÍA
 *   A4   Voltaje de los paneles solares (0-5 V en el pin)
 *   A6   Voltaje de la eólica (0-5 V en el pin) *
 *   D8   Indicador: usando solar
 *   D9   Indicador: usando eólica
 *   D10  Indicador: usando residuos (fuente estimada, sin sensor)
 *
 * AGUA Y AMBIENTE
 *   A5   Sensor de nivel de agua
 *   A1   Sensor de temperatura/humedad (DHT11/DHT22 o analógico TMP36) **
 *
 * ALUMBRADO PÚBLICO
 *   D11  Poste norte
 *   D12  Poste sur
 *
 * *  Arduino UNO no tiene A6. En ese caso el sketch usa A3 automáticamente;
 *    conecta allí la señal de la eólica. En Nano/boards con A6 se usa A6.
 * ** Se intenta leer un DHT11/DHT22 en A1. Si no responde, se usa A1 como
 *    entrada analógica TMP36 y se estima la humedad. Añade una resistencia
 *    pull-up de 10 kΩ entre A1 y 5 V si usas DHT.
 *
 * IMPORTANTE: el motor de la cubierta y los postes deben ir con relé,
 * transistor o driver; nunca directos desde el pin del Arduino.
 */

#include <math.h>
#include <string.h>

// ---------------------------------------------------------------------------
// Pines digitales
// ---------------------------------------------------------------------------
const uint8_t PIN_TRAFFIC_VERTICAL = 2;
const uint8_t PIN_LED_RED = 3;
const uint8_t PIN_LED_AMBER = 4;
const uint8_t PIN_LED_GREEN = 5;
const uint8_t PIN_TRAFFIC_HORIZONTAL = 6;

const uint8_t PIN_ENERGY_SOLAR = 8;
const uint8_t PIN_ENERGY_WIND = 9;
const uint8_t PIN_ENERGY_WASTE = 10;

const uint8_t PIN_POST_NORTH = -1;
const uint8_t PIN_POST_SOUTH = -2;

const uint8_t PIN_COVER_MOTOR = 11;

// ---------------------------------------------------------------------------
// Pines analógicos
// ---------------------------------------------------------------------------
const uint8_t PIN_LIGHT_SOUTH = A0;
const uint8_t PIN_TEMP_HUM = A1;
const uint8_t PIN_LIGHT_NORTH = A2;
const uint8_t PIN_SOLAR = A4;
const uint8_t PIN_WATER = A5;

// A6 solo está definido en las variantes que lo exponen (Nano, ESP32, etc.).
// En el UNO no existe el macro A6, así que se usa A3 como entrada de la eólica.
#if defined(A6)
const uint8_t PIN_WIND = A6;
#else
const uint8_t PIN_WIND = A3; // Arduino UNO: A6 no existe, usa A3
#endif

// ---------------------------------------------------------------------------
// Calibración
// ---------------------------------------------------------------------------
const float ADC_REFERENCE = 5.0;
const float ADC_MAX = 1023.0;

// Multiplica por el divisor de tensión si la señal del panel/eólica llega
// dividida al pin. Con 1.0 se informa el voltaje presente en el pin (0-5 V).
const float SOLAR_VOLTAGE_RATIO = 1.0;
const float WIND_VOLTAGE_RATIO = 1.0;

// Potencia estimada por voltio. Ajusta con una pinza amperimétrica o con las
// especificaciones del generador. Ejemplo: 180 kW/V -> 900 kW a 5 V.
const float SOLAR_KW_PER_VOLT = 180.0;
const float WIND_KW_PER_VOLT = 160.0;

// La tercera fuente no tiene sensor: se estima una planta de residuos.
const float WASTE_BASE_KW = 180.0;

// Nivel de agua: cambia estos valores si tu sensor entrega la lectura al revés.
const int WATER_EMPTY_RAW = 0;
const int WATER_FULL_RAW = 1023;

// Los sensores IR/PIR suelen entregar LOW al detectar presencia.
const uint8_t OCCUPIED_LEVEL = LOW;

// Si tu módulo LDR entrega más voltaje con menos luz, pon esto en true.
const bool LIGHT_INVERTED = false;

// Sensor analógico de temperatura (solo si no hay DHT en A1).
const float TEMP_ANALOG_OFFSET_V = 0.5; // TMP36: 0.5 V; LM35: 0.0 V
const float TEMP_ANALOG_VOLTS_PER_C = 0.01; // 10 mV/°C

const unsigned long SAMPLE_INTERVAL_MS = 1000;
const unsigned long TEMP_HUMIDITY_INTERVAL_MS = 2000;

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------
unsigned long lastSampleAt = 0;
unsigned long lastTempAt = 0;

float ambientTemperature = 24.0;
int ambientHumidity = 55;
uint8_t dhtFailures = 0;
bool dhtEnabled = true;

// Última decisión recibida desde la aplicación.
String decisionEnergy = "";
String decisionTraffic = "amarillo"; // amarillo = esperando primera decisión
String decisionSun = "libre";
String decisionTemperature = "frio";
String decisionWater = "normal";
String decisionPost = "apagar";

float clampFloat(float value, float minValue, float maxValue) {
  if (value < minValue) return minValue;
  if (value > maxValue) return maxValue;
  return value;
}

int averageAnalog(uint8_t pin, uint8_t samples = 8) {
  long sum = 0;

  for (uint8_t i = 0; i < samples; i++) {
    sum += analogRead(pin);
  }

  return (int)(sum / samples);
}

float pinVoltage(uint8_t pin) {
  return averageAnalog(pin, 8) * (ADC_REFERENCE / ADC_MAX);
}

int readPercentage(uint8_t pin) {
  // Guardamos la media en una variable: constrain() evalúa su argumento
  // varias veces y repetiría la lectura analógica.
  const int raw = averageAnalog(pin, 8);
  const int percent = map(raw, 0, 1023, 0, 100);
  return constrain(percent, 0, 100);
}

int readWaterPercentage() {
  const int raw = averageAnalog(PIN_WATER, 8);
  const int percent = map(raw, WATER_EMPTY_RAW, WATER_FULL_RAW, 0, 100);
  return constrain(percent, 0, 100);
}

int readLightPercentage(uint8_t pin) {
  const int value = readPercentage(pin);
  return LIGHT_INVERTED ? 100 - value : value;
}

bool isOccupied(uint8_t pin) {
  return digitalRead(pin) == OCCUPIED_LEVEL;
}

// ---------------------------------------------------------------------------
// Lectura de temperatura/humedad
// ---------------------------------------------------------------------------
bool waitForLevel(uint8_t pin, uint8_t level, unsigned long timeoutUs) {
  const unsigned long start = micros();

  while (digitalRead(pin) != level) {
    if (micros() - start > timeoutUs) return false;
  }

  return true;
}

bool readDhtRaw(uint8_t pin, uint8_t data[5]) {
  memset(data, 0, 5);

  // Pulso de inicio: 18 ms en LOW es válido para DHT11 y DHT22.
  pinMode(pin, OUTPUT);
  digitalWrite(pin, LOW);
  delay(18);
  pinMode(pin, INPUT_PULLUP);

  // Respuesta: 80 µs en LOW, 80 µs en HIGH y después los 40 bits.
  if (!waitForLevel(pin, LOW, 300)) return false;
  if (!waitForLevel(pin, HIGH, 300)) return false;
  if (!waitForLevel(pin, LOW, 300)) return false;

  for (uint8_t i = 0; i < 40; i++) {
    if (!waitForLevel(pin, HIGH, 300)) return false;

    const unsigned long highStart = micros();
    if (!waitForLevel(pin, LOW, 300)) return false;
    const unsigned long highDuration = micros() - highStart;

    data[i / 8] <<= 1;
    if (highDuration > 45) data[i / 8] |= 1; // 26-28 µs = 0, ~70 µs = 1
  }

  const uint8_t checksum = (data[0] + data[1] + data[2] + data[3]) & 0xFF;
  return checksum == data[4];
}

bool decodeDht(const uint8_t data[5], float &temperature, float &humidity) {
  // DHT11: humedad entera, decimales en 0 y temperatura entera.
  if (data[1] == 0 && data[3] == 0) {
    humidity = data[0];
    temperature = data[2];

    if (humidity >= 0 && humidity <= 100 && temperature >= -40 && temperature <= 80) {
      return true;
    }
  }

  // DHT22/AM2302: 16 bits por magnitud, temperatura con bit de signo.
  humidity = ((uint16_t)data[0] << 8 | data[1]) / 10.0;
  const int16_t rawTemperature = ((uint16_t)(data[2] & 0x7F) << 8) | data[3];
  temperature = rawTemperature / 10.0;
  if (data[2] & 0x80) temperature = -temperature;

  return humidity >= 0 && humidity <= 100 && temperature >= -40 && temperature <= 80;
}

float readAnalogTemperature() {
  // Sin pull-up para no falsear la lectura de un TMP36/LM35.
  pinMode(PIN_TEMP_HUM, INPUT);
  const float voltage = averageAnalog(PIN_TEMP_HUM, 16) * (ADC_REFERENCE / ADC_MAX);
  return (voltage - TEMP_ANALOG_OFFSET_V) / TEMP_ANALOG_VOLTS_PER_C;
}

int estimateHumidity(float temperature) {
  return constrain((int)round(72.0 - (temperature - 18.0) * 2.0), 25, 92);
}

void updateTemperatureHumidity() {
  if (millis() - lastTempAt < TEMP_HUMIDITY_INTERVAL_MS) return;
  lastTempAt = millis();

  if (dhtEnabled) {
    float temperature = 0;
    float humidity = 0;
    uint8_t data[5];

    if (readDhtRaw(PIN_TEMP_HUM, data) && decodeDht(data, temperature, humidity)) {
      ambientTemperature = temperature;
      ambientHumidity = (int)round(humidity);
      dhtFailures = 0;
      return;
    }

    if (dhtFailures < 255) dhtFailures++;

    // Tras varios fallos se asume que no hay DHT y se pasa a modo analógico.
    if (dhtFailures >= 3) dhtEnabled = false;
  }

  if (!dhtEnabled) {
    const float analogTemperature = readAnalogTemperature();

    if (analogTemperature > -20.0 && analogTemperature < 70.0) {
      ambientTemperature = analogTemperature;
      ambientHumidity = estimateHumidity(analogTemperature);
    }
  }
}

// ---------------------------------------------------------------------------
// Decisiones de la aplicación
// ---------------------------------------------------------------------------
void applyDecisionLine(String line) {
  line.trim();
  const int separator = line.indexOf(':');
  if (separator < 0) return;

  String key = line.substring(0, separator);
  String value = line.substring(separator + 1);
  key.trim();
  value.trim();
  key.toLowerCase();
  value.toLowerCase();
  value.replace("(", "");
  value.replace(")", "");
  value.trim();

  if (key == "energia") decisionEnergy = value;
  else if (key == "semaforo") decisionTraffic = value;
  else if (key == "sol") decisionSun = value;
  else if (key == "temperatura") decisionTemperature = value;
  else if (key == "agua") decisionWater = value;
  else if (key == "poste") decisionPost = value;
}

void readDecisions() {
  static String buffer = "";

  while (Serial.available() > 0) {
    const char character = Serial.read();

    if (character == '\n') {
      applyDecisionLine(buffer);
      buffer = "";
    } else if (character != '\r' && buffer.length() < 80) {
      buffer += character;
    }
  }
}

// ---------------------------------------------------------------------------
// Actuadores
// ---------------------------------------------------------------------------
void applyOutputs() {
  // Semáforo de tres luces: solo una encendida.
  digitalWrite(PIN_LED_RED, decisionTraffic == "rojo" ? HIGH : LOW);
  digitalWrite(PIN_LED_AMBER, decisionTraffic == "amarillo" ? HIGH : LOW);
  digitalWrite(PIN_LED_GREEN, decisionTraffic == "verde" ? HIGH : LOW);

  // Indicador de la fuente de energía en uso.
  digitalWrite(PIN_ENERGY_SOLAR, decisionEnergy == "solar" ? HIGH : LOW);
  digitalWrite(PIN_ENERGY_WIND, decisionEnergy == "eolica" ? HIGH : LOW);
  digitalWrite(PIN_ENERGY_WASTE, decisionEnergy == "residuos" ? HIGH : LOW);

  // Motor de la cubierta de los edificios.
  digitalWrite(PIN_COVER_MOTOR, decisionSun == "cubrir" ? HIGH : LOW);

  // Postes norte y sur.
  const bool postOn = decisionPost == "encender";
  digitalWrite(PIN_POST_NORTH, postOn ? HIGH : LOW);
  digitalWrite(PIN_POST_SOUTH, postOn ? HIGH : LOW);
}

// ---------------------------------------------------------------------------
// Setup / loop
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(9600);

  pinMode(PIN_TRAFFIC_VERTICAL, INPUT_PULLUP);
  pinMode(PIN_TRAFFIC_HORIZONTAL, INPUT_PULLUP);

  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_AMBER, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);

  pinMode(PIN_ENERGY_SOLAR, OUTPUT);
  pinMode(PIN_ENERGY_WIND, OUTPUT);
  pinMode(PIN_ENERGY_WASTE, OUTPUT);

  pinMode(PIN_POST_NORTH, OUTPUT);
  pinMode(PIN_POST_SOUTH, OUTPUT);
  pinMode(PIN_COVER_MOTOR, OUTPUT);

  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_LED_AMBER, HIGH); // espera de la primera decisión
  digitalWrite(PIN_LED_GREEN, LOW);

  digitalWrite(PIN_ENERGY_SOLAR, LOW);
  digitalWrite(PIN_ENERGY_WIND, LOW);
  digitalWrite(PIN_ENERGY_WASTE, LOW);

  digitalWrite(PIN_POST_NORTH, LOW);
  digitalWrite(PIN_POST_SOUTH, LOW);
  digitalWrite(PIN_COVER_MOTOR, LOW);

  lastTempAt = millis() - TEMP_HUMIDITY_INTERVAL_MS;
  delay(1500); // estabiliza el puerto y los sensores
}

void loop() {
  readDecisions();
  applyOutputs();
  updateTemperatureHumidity();

  if (millis() - lastSampleAt < SAMPLE_INTERVAL_MS) return;
  lastSampleAt = millis();

  const float solarVoltage = pinVoltage(PIN_SOLAR) * SOLAR_VOLTAGE_RATIO;
  const float windVoltage = pinVoltage(PIN_WIND) * WIND_VOLTAGE_RATIO;
  const float solarKw = clampFloat(solarVoltage * SOLAR_KW_PER_VOLT, 0.0, 2000.0);
  const float windKw = clampFloat(windVoltage * WIND_KW_PER_VOLT, 0.0f, 2000.0f) / 5.0f;
  const float wasteKw = 0;

  const int north = readLightPercentage(PIN_LIGHT_NORTH);
  const int south = readLightPercentage(PIN_LIGHT_SOUTH);
  const int water = readWaterPercentage();

  const bool verticalOccupied = isOccupied(PIN_TRAFFIC_VERTICAL);
  const bool horizontalOccupied = isOccupied(PIN_TRAFFIC_HORIZONTAL);

  Serial.print(F("Energía: solar ("));
  Serial.print(solarKw, 1);
  Serial.print(F("), eolica ("));
  Serial.print(windKw, 1);
  Serial.print(F("), residuos ("));
  Serial.print(wasteKw, 1);
  Serial.print(F("), voltaje_solar ("));
  Serial.print(solarVoltage, 2);
  Serial.print(F("), voltaje_eolica ("));
  Serial.print(windVoltage, 2);
  Serial.println(F(")"));

  Serial.print(F("Semaforo: vertical ("));
  Serial.print(verticalOccupied ? F("ocupado") : F("libre"));
  Serial.print(F("), horizontal ("));
  Serial.print(horizontalOccupied ? F("ocupado") : F("libre"));
  Serial.println(F(")"));

  Serial.print(F("Sol: norte ("));
  Serial.print(north);
  Serial.print(F("), sur ("));
  Serial.print(south);
  Serial.println(F(")"));

  Serial.print(F("Temperatura: ambiente ("));
  Serial.print(ambientTemperature, 1);
  Serial.print(F("), humedad ("));
  Serial.print(ambientHumidity);
  Serial.println(F(")"));

  Serial.print(F("Agua: nivel ("));
  Serial.print(water);
  Serial.println(F(")"));
}
