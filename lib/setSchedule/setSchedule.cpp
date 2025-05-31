#include "setSchedule.h"
#include "timeSync.h"
#include "logHandler.h"

void schedule(bool* state, char* on, char* off) {
  char currentTime[6];
  getCurrentTime(currentTime);
  *state = isWithinSchedule(currentTime, on, off);

  char message[128];
  snprintf(message, sizeof(message),
           "Schedule check: now=%s, on=%s, off=%s, result=%s",
           currentTime, on, off, *state ? "ON" : "OFF");

  logs(message, "INFO");
}

ICACHE_FLASH_ATTR bool isWithinSchedule(const char* currentTime, const char* on, const char* off) {
  int on_off_cmp = strcmp(on, off);
  int cur_on_cmp = strcmp(currentTime, on);
  int cur_off_cmp = strcmp(currentTime, off);

  if (on_off_cmp < 0) {
    // on < off, misal: 05:30 < 17:10, cek currentTime di antara on dan off
    return (cur_on_cmp >= 0) && (cur_off_cmp < 0);
  } else {
    // jadwal melintasi tengah malam, misal 17:10 > 05:30
    return (cur_on_cmp >= 0) || (cur_off_cmp < 0);
  }
}