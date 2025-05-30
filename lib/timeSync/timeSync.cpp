#include "timeSync.h"

// NTP
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 25200, 60000);  // UTC+7

unsigned long syncedEpoch = 0;
unsigned long lastMillis = 0;

ICACHE_FLASH_ATTR void ntpSyncOnce() {
  for (int i = 0; i < 5; i++) {
    if (timeClient.update()) {
      syncedEpoch = timeClient.getEpochTime();
      lastMillis = millis();
      return;
    }
    delay(5000);  // Wait 5 seconds before retrying
  }
}

ICACHE_FLASH_ATTR unsigned long getCurrentEpoch() {
  return syncedEpoch + ((millis() - lastMillis) / 1000);
}

ICACHE_FLASH_ATTR void getCurrentTime(char* out) {
  unsigned long now = getCurrentEpoch();
  unsigned long hours = (now % 86400) / 3600;
  unsigned long minutes = (now % 3600) / 60;
  sprintf(out, "%02d:%02d", hours, minutes);
}
