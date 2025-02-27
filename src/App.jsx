import { db } from "./firebase"
import { doc, onSnapshot, updateDoc } from "firebase/firestore"
import { ref, set } from "firebase/database"  
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Lightbulb } from "lucide-react"

function App() {
  const [isOn, setIsOn] = useState(false)
  const [show, setShow] = useState(false)
  const [autoMode, setAutoMode] = useState(false)
  const [ scheduleMode, setScheduleMode ] = useState(false)
  const [schedule, setSchedule] = useState({ on: "", off: "" })
  const [sunTimes, setSunTimes] = useState({ sunrise: "", sunset: "" })
  const prevIsOn = useRef(isOn)
  const prevAutoMode = useRef(autoMode)
  const prevScheduleMode = useRef(scheduleMode)

  useEffect(() => {
    const auth = getAuth()
    
    signInWithEmailAndPassword(auth, "okgasokgasayokitacarigas@gmail.com", "okgasokgas")
      .then((userCredential) => {
        console.log("User logged in:", userCredential.user)

        const unsub = (() => {
          const docRef = doc(db, 'schedule', 'global')
  
          onSnapshot(docRef, async (doc) => {
            let data = doc.data()
  
            console.log('Current data: ', data)
            console.log('lamp: ', data['lampStatus'])
  
            setIsOn(data['lampStatus'])
            setAutoMode(data['autoSchedule']['status'])
            setScheduleMode(data['schedule']['status'])
            setSchedule({ on: data['schedule']['on'], off: data['schedule']['off'] })
          })
        })()
      })
      .catch((error) => {
        console.error("Login failed:", error.message);
      })

  }, [])

  const store = async (section) => {
    const docRef = doc(db, 'schedule', 'global')
    switch (section) {
      case 1:
        await updateDoc(docRef, {
          lampStatus: isOn
        })
        break;
      case 2:
        console.log('suntime ', sunTimes)
        console.log('auto, ', autoMode) 
        await updateDoc(docRef, {
          "autoSchedule.sunrise": sunTimes['sunrise'],
          "autoSchedule.sunset": sunTimes['sunset']
        })
        console.log('auto, ', autoMode) 
        break;
      case 3:
        await updateDoc(docRef, {
          schedule: {
            status: scheduleMode,
            on: schedule['on'],
            off: schedule['off']
          }
        })
        break;
      case 4:
        await updateDoc(docRef, {
          autoSchedule: {
            status: autoMode,
            sunrise: sunTimes['sunrise'],
            sunset: sunTimes['sunset']
          }
        })
      default:
        await updateDoc(docRef, {
          lampStatus: isOn
        })
        break;
    }
  }

  // Fetch sunrise & sunset
  useEffect(() => {
    const fetchSunTimes = (async () => {
      const res = await fetch(
        "https://api.sunrise-sunset.org/json?lat=-7.250445&lng=112.768845&formatted=0"
      )
      const data = await res.json()
      if (data.status === "OK") {
        const sunrise = new Date(data.results.sunrise).toLocaleTimeString("en-GB", { 
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
        })
        const sunset = new Date(data.results.sunset).toLocaleTimeString("en-GB", { 
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
        })
        console.log({ sunrise, sunset })
        setSunTimes({ sunrise, sunset })
      }
    })()
  }, [])

  useEffect(() => {
    if (sunTimes.sunrise && sunTimes.sunset) {
      store(2);
    }
  }, [sunTimes]);

  useEffect(() => {
    if (prevIsOn.current !== isOn) {
      store(1)
      prevIsOn.current = isOn
    } 
  }, [isOn])
  
  useEffect(() => {
    if (prevAutoMode.current !== autoMode) {
      store(4)
      prevAutoMode.current = autoMode
    }
  }, [autoMode])

  useEffect(() => {
    if (prevScheduleMode.current !== scheduleMode) {
      store(3)
      prevScheduleMode.current = scheduleMode
    }
  }, [scheduleMode])

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-800 text-white">
      <Lightbulb size={50} className={isOn ? "text-yellow-500" : "text-gray-400"} />
      <motion.div
        className="w-12 h-24 bg-gray-300 rounded-full p-1 flex flex-col justify-between cursor-pointer"
        onClick={() => { 
          setIsOn(!isOn)
          store(1)
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
      <button className="mt-4 bg-blue-500 px-4 py-2 rounded" onClick={() => {
        setAutoMode(!autoMode)
        // store(2)
      }}>
        {autoMode ? "Disable Auto Mode" : "Enable Auto Mode"}
      </button>
      <button onClick={() => setShow(true)} className="mt-4 bg-green-500 px-4 py-2 rounded">
        Set Schedule
      </button>
      {show && (
        <ScheduleModal 
          schedule={schedule}
          setSchedule={setSchedule}
          setScheduleMode={setScheduleMode}
          setIsModalOpen={setShow} 
          store={store}
        />
      )}
    </div>
  )
}

const ScheduleModal = ({ schedule, setSchedule, setScheduleMode, setIsModalOpen, store }) => {
  const [onTime, setOnTime] = useState(schedule.on || "")
  const [offTime, setOffTime] = useState(schedule.off || "")

  const handleSaveSchedule = () => {
    setSchedule({ onTime, offTime })
    setIsModalOpen(false)
  }

  console.log(schedule.off, schedule.on)

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
            className="px-4 py-2 bg-red-500 text-white rounded mr-2"
            onClick={() => {
              setSchedule({ on: '', off: '' })
              setScheduleMode(false)
              setIsModalOpen(false)
              store(3)
            }}
          >
            Clear
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => { 
              setSchedule({ on: onTime, off: offTime }) 
              setScheduleMode(true)
              setIsModalOpen(false)
              store(3)
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