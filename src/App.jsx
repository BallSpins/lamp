import { app, db } from "./services/firebase"
import { ref, update, onValue } from "firebase/database"
import { getAuth, signInAnonymously } from "firebase/auth"
import { useState, useEffect, useRef } from 'react'
import { Lightbulb } from 'lucide-react'
import { motion } from 'framer-motion'

export default function App() {
  const [isOn, setIsOn] = useState(false)
  const [mode, setMode] = useState('switch')
  const [updateInterval, setUpdateInterval] = useState(5)
  const [scheduleMode, setScheduleMode] = useState(false)
  const [show, setShow] = useState(false)
  const [schedule, setSchedule] = useState({on: '', off: ''})

  const [name, setName] = useState('')
  const prevIsOn = useRef(isOn)
  const prevScheduleMode = useRef(scheduleMode)

  const [authorized, setAuthorized] = useState(false)
  const [inputPassword, setInputPassword] = useState("")

  useEffect(() => {
    if (prevIsOn.current !== isOn) {
      store(1)
      prevIsOn.current = isOn
    } 
  }, [isOn])

  useEffect(() => {
    if (prevScheduleMode.current !== scheduleMode) {
      store(3)
      prevScheduleMode.current = scheduleMode
    }
  }, [scheduleMode])

  useEffect(() => {
    const dataRef = ref(db, 'lamps')
    let unsub = () => {}
    
    const auth = getAuth(app)
    signInAnonymously(auth)
      .then(() => {
        unsub = onValue(dataRef, (snapshot) => {
          const data = snapshot.val()

          setName(data.terrace.config.device_name)
          setMode(data.terrace.config.mode)
          setUpdateInterval(data.terrace.config.update_interval)

          setIsOn(data.terrace.switch.state)
          setSchedule({on: data.terrace.schedule.on, off: data.terrace.schedule.off})
          console.log(data.terrace.config.update_interval)
        })
      })
      .catch((error) => {
        console.error('Anonymous login failed!', error.code, error.messsage)
      })
  
    // return untuk cleanup (unmount)
    return () => {
      unsub() // matikan listener biar nggak nyampah
    }
  }, [])
  

  const store = async (section, payload) => {
    switch (section) {
      case 1:
        await update(ref(db, 'lamps/terrace/switch'), { state: isOn })
        break
      case 2:
        await update(ref(db, 'lamps/terrace/config'), { mode: payload.mode })
      case 3:
        await update(ref(db, 'lamps/terrace/schedule'), { on: schedule.on, off: schedule.off })
        break
      case 4:
        await update(ref(db, 'lamps/terrace/config'), { update_interval: payload.update_interval })
      default:
        await update(ref(db, 'lamps/terrace'), { status: isOn })
        break
    }
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
        <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl max-w-sm w-full shadow-lg">
          <h2 className="text-lg font-semibold mb-4">🔐 Masukkan Password</h2>
          <input 
            type="password" 
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
            className="w-full p-2 mb-4 rounded text-black"
            placeholder="Password"
          />
          <button 
            className="w-full bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
            onClick={() => {
              if (inputPassword === import.meta.env.VITE_LAMP_PASSWORD) {
                setAuthorized(true)
              } else {
                alert("Password salah, coba lagi ya 😬")
              }
            }}
          >
            🔓 Masuk
          </button>
        </div>
      </div>
    )
  }  

  return (
    <div className='w-full min-h-screen bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f0f0f] text-white font-sans px-4 py-8 flex flex-col items-center justify-center'>      
      <div className='mb-6 text-center'>
        <span className='text-gray-400'>Device:</span>
        <span className='ml-2 text-emerald-400 uppercase font-semibold tracking-wide'>{name}</span>
      </div>

      <div className='mb-6 text-center'>
        <span className='text-gray-400'>Mode saat ini:</span>
        <span className='ml-2 text-emerald-400 uppercase font-semibold tracking-wide'>{mode}</span>
      </div>

      <button 
        onClick={() => {
          if (!authorized) return
          const newMode = mode === 'switch' ? 'schedule' : 'switch'
          setMode(newMode)
          store(2, { mode: newMode })
        }} 
        className='mb-8 px-8 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 hover:brightness-125 transition-all shadow-lg'
      >
        🔁 Ganti Mode
      </button>

      <div className='bg-white/5 backdrop-blur-md rounded-2xl p-6 w-full max-w-md mb-10 shadow-xl border border-white/10'>
        <label className='block text-sm mb-2 text-gray-300'>
          Update Interval (milidetik)
        </label>
        <input
          type='number'
          min='1'
          className='border-none w-full px-4 py-2 rounded-xl text-gray-500'
          value={updateInterval}
          onChange={(e) => setUpdateInterval(e.target.value)}
        />
        <button
          className='mt-4 w-full bg-yellow-400 hover:bg-yellow-300 text-black py-2 rounded-xl font-semibold transition'
          onClick={() => {
            const intervalS = parseInt(updateInterval)
            if (!isNaN(intervalS) && intervalS > 0) {
              store(4, { update_interval: intervalS })
            } else {
              alert('Masukkan interval yang valid!')
            }
          }}
        >
          💾 Simpan Interval
        </button>
      </div>

      <Lightbulb size={80} className={isOn ? 'text-yellow-400 drop-shadow-xl' : 'text-gray-500 opacity-60'} />

      <motion.div
        className={`w-16 h-32 rounded-full p-1 flex flex-col justify-between mt-6 cursor-pointer border-2 ${mode === 'schedule' ? 'bg-gray-800 border-gray-600 cursor-not-allowed' : 'bg-gradient-to-br from-slate-300 to-gray-400 border-white/30'}`}
        onClick={() => {
          if (!authorized) return
          if (mode === 'switch') {
            setIsOn(!isOn)
            store(1)
          }
        }}
      >
        <motion.div
          className='w-14 h-14 bg-white rounded-full shadow-2xl'
          initial={false}
          animate={{ y: isOn ? 0 : 72 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          style={{ backgroundColor: isOn ? '#facc15' : '#6b7280' }}
        />
      </motion.div>

      <button 
        onClick={() => setShow(true)} 
        disabled={mode === 'switch'} 
        className='mt-8 px-8 py-3 bg-gradient-to-r from-teal-400 to-green-500 text-black font-medium rounded-full hover:brightness-110 transition disabled:opacity-50'
      >
        🕒 Jadwalkan
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

