#include "logHandler.h"

ICACHE_FLASH_ATTR void logs(char* message, char* type) {
    char payload[256];
    snprintf(payload, sizeof(payload), "{\"m\":\"%s\",\"t\":\"%s\"}", message, strcmp(type, "INFO") == 0 ? "INFO" : "WARNING");

    client.publish("log", payload);
}