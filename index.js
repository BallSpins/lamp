import express from 'express'
import session from 'express-session'
import supabase from './services/supabase.js'
import client from './services/mqttClient.js'
import path from 'path'
import { fileURLToPath } from 'url'
import { ulid } from 'ulid'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

const port = process.env.PORT
const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(cors({ origin: '*' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const requireLogin = (req, res, next) => {
    console.log(req.session)
    if (req.path === '/login') {
        return next()
    }
    
    if (!req.session || !req.session?.loggedIn) {
        console.log('Not logged in, redirecting to login')
        return res.redirect('/login')
    } else if (req.session.loggedIn) {
        return next()
    }
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretfamilykey',
    resave: false,
    saveUninitialized: true,
    // cookie: {
    //     maxAge: 1000 * 60 * 5, // 5 minutes
    //     secure: false
    // }
    cookie: {
        maxAge: 1000 * 60 * 60 * 12, // 12 hours
        secure: false
    }
}))

app.use(requireLogin)

app.use(express.static(path.join(__dirname, 'src')))

client.subscribe('data/express/status', (err) => {
    if (err) console.log('Error: ', err)
    else console.log('Subscribed to data/express/status')
})

client.subscribe('data/express/dht', (err) => {
    if (err) console.log('Error: ', err)
    else console.log('Subscribed to data/express/dht')
})

client.subscribe('data/express/logs', (err) => {
    if (err) console.log('Error: ', err)
    else console.log('Subscribed to data/express/logs')
})

client.subscribe('data/express/fetch', (err) => {
    if (err) console.log('Error: ', err)
    else console.log('Subscribed to data/express/fetch')
})

let clients = []

const lampConfig = async () => {
    let { data, error } = await supabase
        .from('lamp_config')
        .select('*')
    if (error) {
        return null
    } else {
        // console.log(data[0])
        return data[0]
    }
}

const sendData = async () => {
    lampConfig().then(data => {
        const { id, ...filteredPayload } = data 
        
        return new Promise((resolve, reject) => {
            client.publish('esp01/data', JSON.stringify(filteredPayload), (err) => {
                if (err) reject(`Error: ${err.message}`)
                else resolve(`Success with payload: ${JSON.stringify(filteredPayload)}`)
            })
        })
    })
}

const setHeader = (res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()
}

const realtimeData = (channelName, table, callback) => {
    const channel = supabase.channel(channelName)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: table },
            (payload) => {
                callback(payload)
            }
        )
        .subscribe()
    
    return channel
}

client.on('message', async (topic, message) => {
    if (topic == 'data/express/status') {
        const msgdata = JSON.parse(message.toString())
        console.log(msgdata.manual_state)
        let { data, error } = await supabase
            .from('lamp_config')
            .update({
                manual_state: msgdata.manual_state
            })
            .eq('id', 1)
            .select()
            if (error) console.error(`Error ${error.message || error}`)
            else console.log(`Success status with: ${data}`)
    } else if (topic == 'data/express/dht') {
        const msgdata = JSON.parse(message.toString())
        let { data, error } = await supabase
            .from('dht_data')
            .insert([
                { humidity: msgdata.humidity, temperature: msgdata.temperature },
            ])
            if (error) console.error(`Error ${error}`)
            else console.log(`Success with: ${JSON.stringify(msgdata)}`)
    } else if (topic === 'data/express/logs') {
        console.log(message)
        const msgdata = message.toString()
        console.log(msgdata)
        let { data, error } = await supabase
            .from('logs_data')
            .insert([
                { logs: msgdata },
            ])
            .select()
        if (error) console.error(`Error ${error}`)
    } else if (topic === 'data/express/fetch') {
        lampConfig().then(data => {
            // console.log(data)
            const { id, ...filteredPayload } = data
            client.publish('esp01/data', JSON.stringify(filteredPayload), (err) => {
                if (err) console.error(`Error: ${err.message}`)
                else console.log(`Success with payload: ${JSON.stringify(filteredPayload)}`)
            })
        })
    }
})

app.get('/login', (req, res) => {
    const loginPath = path.join(__dirname, 'src', 'login.html')
    console.log('Sending:', loginPath) // helpful debug
    res.sendFile(loginPath)
})

app.post('/login', (req, res) => {
    const password = req.body.password

    if (password === process.env.CLIENT_PASSWORD) {
        req.session.loggedIn = true
        console.log("Session after login:", req.session)
        res.redirect('/')
    } else {
        res.redirect('/login?error=1')
    }
})

app.get('/', requireLogin, (req, res) => {
    // console.log("Session at /:", req.session)
    res.sendFile(path.join(__dirname, 'src', 'index.html'))
})

app.get('/lamp_config/realtime', requireLogin, async (req, res) => {
    setHeader(res)

    const clientId = ulid()
    const channelName = `lamp-config-data-${clientId}`
    
    let { data: lamp_config, error } = await supabase
        .from('lamp_config')
        .select('*')
    if (error) res.write(JSON.stringify({ message: error }))
    else {
        const curdat = JSON.stringify(lamp_config[0])

        console.log(`Current data: ${curdat}`)
        res.write(`data: ${curdat}\n\n`)

        const channel = realtimeData(channelName, 'lamp_config', (payload) => {
            payload = payload.new
            const { id, device_name, mode, on, off, manual_state } = payload
            const newpayload = { id, device_name, mode, on, off, manual_state }
            console.log('Change received!', newpayload)
            res.write(`data: ${JSON.stringify(newpayload)}\n\n`)
        })

        req.on('close', () => {
            console.log(`Client-lamp-config-${clientId} disconnected`)
            channel.unsubscribe()
            res.end()
        })
    }      
})

app.get('/dht_data/realtime', requireLogin, async (req, res) => {
    setHeader(res)

    const clientId = ulid()
    const channelName = `dht-data-${clientId}`
    
    let { data: dht_data, error } = await supabase
        .from('dht_data')
        .select('*')
        .order('created_at', { ascending: false }) // or 'id' if there's no timestamp
        .limit(1)
    if (error) res.write(JSON.stringify({ message: error }))
    else {
        // console.log(dht_data)
        if (dht_data.length > 0) {
            const { id, humidity, temperature } = dht_data[0]
            const newdht_data = { id, humidity, temperature }
            const curdat = JSON.stringify(newdht_data)

            console.log(`Current data: ${curdat}`)
            res.write(`data: ${curdat}\n\n`)

            const channel = realtimeData(channelName, 'dht_data', (payload) => {
                payload = payload.new
                const { id, humidity, temperature } = payload
                const newpayload = { id, humidity, temperature }
                console.log('Change received!', newpayload)
                res.write(`data: ${JSON.stringify(newpayload)}\n\n`)
            })
    
            req.on('close', () => {
                console.log(`Client-dht-${clientId} disconnected`)
                channel.unsubscribe()
                res.end()
            })
        } else {
            res.write('data: error')
        }
    }      
})

app.get('/logs/realtime', requireLogin, async (req, res) => {
    setHeader(res)

    let logsData = []

    const pushToLog = (logs) => {
        if (logsData.length >= 10) {
            logsData.shift()
        }
        logsData.push(logs)
    }

    const clientId = ulid()
    const channelName = `dht-data-${clientId}`

    let { data: logs_data, error } = await supabase
        .from('logs_data')
        .select('*')
        .order('created_at', { ascending: false }) // or 'id' if there's no timestamp
        .limit(10)
    if (error) res.write(JSON.stringify({ message: error }))
    else {
        logs_data.forEach((log) => {
            pushToLog(log.logs)
        })
        // console.log(logsData)
        res.write(`data: ${JSON.stringify({ logs: logsData })}\n\n`)

        const channel = realtimeData(channelName, 'logs_data', (payload) => {
            payload = payload.new
            pushToLog(payload.logs)

            // console.log(`Current data: ${logsData}`)
            res.write(`data: ${JSON.stringify({ logs: logsData })}\n\n`)
        })

        req.on('close', () => {
            console.log(`Client-logs-${clientId} disconnected`)
            channel.unsubscribe()
            res.end()
        })
    }
})

app.post('/update', requireLogin, async (req, res) => {
    const body = req.body

    const updatePayload = {}

    if (body.device_name !== undefined) updatePayload.device_name = body.device_name
    if (body.mode !== undefined) updatePayload.mode = body.mode
    if (body.on !== undefined) updatePayload.on = body.on
    if (body.off !== undefined) updatePayload.off = body.off
    if (body.manual_state !== undefined) updatePayload.manual_state = body.manual_state
    console.log(updatePayload)

    let { data, error } = await supabase
        .from('lamp_config')
        .update(updatePayload)
        .eq('id', 1)
        .select()
    if (error) return res.status(500).json({ message: 'Update failed', error })
    else {
        sendData()
            .then(result => {
                console.log(result)
                res.json({ message: result })
            })
            .catch(err => {
                console.log(err)
                res.status(500).json({ message: err })
            })
    }
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})