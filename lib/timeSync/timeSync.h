#ifndef TIME_SYNC_H
#define TIME_SYNC_H
#include <Arduino.h>
#include <WiFiUdp.h>
#include <NTPClient.h>

extern WiFiUDP ntpUDP;
extern NTPClient timeClient;

ICACHE_FLASH_ATTR void ntpSyncOnce();
ICACHE_FLASH_ATTR unsigned long getCurrentEpoch();
ICACHE_FLASH_ATTR void getCurrentTime(char* out);

#endif