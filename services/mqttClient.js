import mqtt from 'mqtt'
import dotenv from 'dotenv'
dotenv.config()

const brokerUrl = process.env.MQTT_BROKER_URL

const options = {
    port: process.env.MQTT_PORT,
    clientId: 'ExpressClient',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    rejectUnauthorized: true
  }
  
const client = mqtt.connect(brokerUrl, options)

client.on('connect', () => {
    console.log('MQTT Connected')
  })
  
client.on('error', err => {
  console.error('MQTT Error:', err.message)
})

export default client