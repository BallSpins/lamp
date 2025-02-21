import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Lightbulb, LightbulbOff } from "lucide-react"
import mqtt from "mqtt" // Import MQTT

const MQTT_BROKER = process.env.REACT_APP_MQTT_BROKER
const MQTT_OPTIONS = {
  username: process.env.REACT_APP_MQTT_USERNAME,
  password: process.env.REACT_APP_MQTT_PASSWORD,
  connectTimeout: 5000,
  clientId: "react-client-" + Math.random().toString(16).substring(2, 8),
}

function App() {
  const [isOn, setIsOn] = useState(false)
  const [show, setShow] = useState(false)
  const [mqttClient, setMqttClient] = useState(null)
  const [schedule, setSchedule] = useState({ on: "", off: "" })
  const [autoMode, setAutoMode] = useState(false)
  const [sunTimes, setSunTimes] = useState({ sunrise: "", sunset: "" })
  const prevState = useRef(null)

  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER, MQTT_OPTIONS)
    client.on("connect", () => console.log("MQTT Connected"))
    client.on("error", (err) => console.error("MQTT Error: ", err))

    setMqttClient(client)

    return () => {
      client.end()
    }
  }, [])

  const publishMessage = (message) => {
    if (mqttClient?.connected) {
      mqttClient.publish("lamp/control", message)
      console.log(`MQTT Published: ${message}`)
    } else {
      console.error("MQTT Not Connected")
    }
  }

  // Fetch sunrise & sunset every 30 seconds
  // useEffect(() => {
  //   const fetchSunTimes = async () => {
  //     const res = await fetch(
  //       "https://api.sunrise-sunset.org/json?lat=-7.250445&lng=112.768845&formatted=0"
  //     )
  //     const data = await res.json()
  //     if (data.status === "OK") {
  //       const sunrise = new Date(data.results.sunrise).toLocaleTimeString("en-GB", { 
  //         timeZone: "Asia/Jakarta",
  //         hour: "2-digit",
  //         minute: "2-digit",
  //       })
  //       const sunset = new Date(data.results.sunset).toLocaleTimeString("en-GB", { 
  //         timeZone: "Asia/Jakarta",
  //         hour: "2-digit",
  //         minute: "2-digit",
  //       })
  //       console.log({ sunrise, sunset })
  //       setSunTimes({ sunrise, sunset })
  //     }
  //   }
  //   fetchSunTimes()
  //   const interval = setInterval(fetchSunTimes, 30000)
  //   return () => clearInterval(interval)
  // }, [])

  // Check time every second
  useEffect(() => {
    const checkTime = () => {
      const currentTime = new Date().toLocaleTimeString("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
      })

      console.log('schedule time: ' + schedule.on + ' ,, ' + schedule.off + ' ,, curr time :' + currentTime)

      let newState = isOn

      if (
        autoMode &&
        (currentTime === sunTimes.sunrise || currentTime === sunTimes.sunset)
      ) {
        newState = true
      } else if (currentTime === schedule.on) {
        newState = true
        console.log(isOn)
      } else if (currentTime === schedule.off) {
        newState = false
      }

      if (prevState.current !== newState) {
        prevState.current = newState
        setIsOn(newState)
        publishMessage(newState ? 'ON' : 'OFF')
      }
    }
    const interval = setInterval(checkTime, 1000)
    return () => clearInterval(interval)
  }, [schedule, sunTimes, autoMode])

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-800 text-white">
      <Lightbulb size={50} className={isOn ? "text-yellow-500" : "text-gray-400"} />
      <motion.div
        className="w-12 h-24 bg-gray-300 rounded-full p-1 flex flex-col justify-between cursor-pointer"
        onClick={() => { 
          setIsOn(!isOn)
          publishMessage(isOn ? 'ON' : 'OFF')  
        }}
      >
        <motion.div
          className="w-10 h-10 bg-white rounded-full shadow-lg"
          initial={false}
          animate={{ y: isOn ? 0 : 56 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          style={{ backgroundColor: isOn ? "#22c55e" : "#6b7280" }}
        />
      </motion.div>
      <button className="mt-4 bg-blue-500 px-4 py-2 rounded" onClick={() => setAutoMode(!autoMode)}>
        {autoMode ? "Disable Auto Mode" : "Enable Auto Mode"}
      </button>
      <button onClick={() => setShow(true)} className="mt-4 bg-green-500 px-4 py-2 rounded">
        Set Schedule
      </button>
      {show && (
        <ScheduleModal 
          schedule={schedule}
          setSchedule={setSchedule}
          setIsModalOpen={setShow} 
        />
      )}
    </div>
  )
}

const ScheduleModal = ({ schedule, setSchedule, setIsModalOpen }) => {
  const [onTime, setOnTime] = useState(schedule.onTime || "")
  const [offTime, setOffTime] = useState(schedule.offTime || "")

  const handleSaveSchedule = () => {
    setSchedule({ onTime, offTime })
    setIsModalOpen(false)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg text-black w-80">
        <h2 className="text-lg mb-4">Set Schedule</h2>

        <label className="block mb-2">
          On Time:
          <input
            type="time"
            className="border p-2 w-full"
            value={onTime}
            onChange={(e) => setOnTime(e.target.value)}
          />
        </label>

        <label className="block mb-2">
          Off Time:
          <input
            type="time"
            className="border p-2 w-full"
            value={offTime}
            onChange={(e) => setOffTime(e.target.value)}
          />
        </label>

        <div className="flex justify-end mt-4">
          <button
            className="px-4 py-2 bg-gray-400 rounded mr-2"
            onClick={() => setIsModalOpen(false)}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => { 
              setSchedule({ on: onTime, off: offTime }) 
              setIsModalOpen(false)
              }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default App