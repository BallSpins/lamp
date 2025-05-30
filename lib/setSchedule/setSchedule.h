#ifndef SET_SCHEDULE_H
#define SET_SCHEDULE_H
#include <Arduino.h>

void schedule(bool state, char* on, char* off);
ICACHE_FLASH_ATTR bool isWithinSchedule(const char* currentTime, const char* on, const char* off);

#endif