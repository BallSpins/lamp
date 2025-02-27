import mqtt from "mqtt"

const MQTT_BROKER = import.meta.env.VITE_REACT_APP_MQTT_BROKER
const MQTT_USER = import.meta.env.VITE_REACT_APP_MQTT_USER
const MQTT_PASSWORD = import.meta.env.VITE_REACT_APP_MQTT_PASSWORD

const MQTTclient = mqtt.connect(MQTT_BROKER, {
    username: MQTT_USER,
    password: MQTT_PASSWORD,
    clientId: 'reactClient'
})

export { MQTTclient }