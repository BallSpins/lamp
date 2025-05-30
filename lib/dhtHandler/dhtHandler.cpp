#include "dhtHandler.h"

DHT dht(DHT_PIN, DHT_TYPE);

float humid;
float temp;

ICACHE_FLASH_ATTR void getDHT() {
    static unsigned long timing = 0;

    if(millis() - timing > 10000) {
      timing = millis();
      humid = dht.readHumidity();
      temp = dht.readTemperature();

      if(!(isnan(humid) || isnan(temp))) {
        char payload[21];
        snprintf(payload, sizeof(payload), "{\"h\":%d,\"t\":%d}", humid, temp);

        client.publish("dht", payload);
      } 
    }
}