#include <Arduino.h>
#include <string.h>
#include <ArduinoJson.h>
#include "MQTTClient.h"
#include "timeSync.h"
#include "setSchedule.h"

// Pins
#define LED_PIN 0  // Built-in LED (active-low)

// Server
const char* SERVER = "";

const char* WiFiSSID = "";
const char* WiFiPASSWORD = "";

// MQTT
const char* MQTTUSERNAME = "user";
const char* MQTTPASSWORD = "user";

char clientId[25];

// Lamp status
char schedule_on[] = "17:10";
char schedule_off[] = "05:30";
bool state = false;
bool manual = false;

void reconnectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  WiFi.begin(WiFiSSID, WiFiPASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 15000) {
    delay(500);
  }
}

void reconnectMQTT() {
  while (!client.connected()) {
    if (client.connect(clientId, MQTTUSERNAME, MQTTPASSWORD)) {
      client.subscribe("lamp/esp_sub");
    } else {
      delay(2500);
    }
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  // Handle pesan masuk
  char jsonBuffer[64];
  if (length >= sizeof(jsonBuffer)) return;
  memcpy(jsonBuffer, payload, length);
  jsonBuffer[length] = '\0';

  StaticJsonDocument<64> doc;
  DeserializationError error = deserializeJson(doc, jsonBuffer);
  if (error) return;
  
  const char* on = doc["n"] | "";
  const char* off = doc["f"] | "";

  if (on[0] != '\0') strcpy(schedule_on, on);
  if (off[0] != '\0') strcpy(schedule_off, off);
  
  if (doc.containsKey("m")) {
    manual = (doc["m"].is<int>() == 1);
    if (!manual) schedule(&state, schedule_on, schedule_off);
  }

  // If 's' exists, update lamp state immediately
  if (doc.containsKey("s")) {
    state = (doc["s"].is<int>() == 1);
    if (!manual) {
      manual = true;  // optional
    }
  }
}

void setup() {
  // put your setup code here, to run once:
  pinMode(LED_PIN, OUTPUT);
  
  client.setServer(SERVER, 1883);
  
  randomSeed(millis());
  int randNum = random(1, 100);
  snprintf(clientId, sizeof(clientId), "ESP8266Client%d", randNum);
  
  client.setCallback(callback);
  
  reconnectWiFi();
  timeClient.begin();
  ntpSyncOnce();
  reconnectMQTT();
}

unsigned long lastSync = 0;
bool lastState = false;

void loop() {
  // put your main code here, to run repeatedly:
  if (WiFi.status() != WL_CONNECTED) reconnectWiFi();
  if (!client.connected()) reconnectMQTT();
  if (millis() - lastSync > 3600000) {  // every 1 hour
    ntpSyncOnce();
    lastSync = millis();
  }
  
  if (!manual) schedule(&state, schedule_on, schedule_off);

  digitalWrite(LED_PIN, state ? LOW : HIGH);

  if (state != lastState) {
    lastState = state;
    
    char jsonPayload[7];
    snprintf(jsonPayload, sizeof(jsonPayload), "{\"s\":%d}", state ? 1 : 0);

    client.publish("lamp/status", jsonPayload);
  }

  client.loop();
}