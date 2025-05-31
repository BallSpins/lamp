#ifndef LOG_HANDLER_H
#define LOG_HANDLER_H
#include <Arduino.h>
#include "MQTTClient.h"

ICACHE_FLASH_ATTR void logs(char* message, char* type);

#endif