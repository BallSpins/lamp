#ifndef DHT_HANDLER_H
#define DHT_HANDLER_H
#include <DHT.h>
#include "MQTTClient.h"

#define DHT_PIN 2 
#define DHT_TYPE DHT11

extern DHT dht;

ICACHE_FLASH_ATTR void getDHT();

#endif