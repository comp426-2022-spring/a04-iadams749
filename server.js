const minimist = require('minimist')

const args = require('minimist')(process.argv.slice(2))

args['help','port','debug','log']

if(args.help){
    console.log(
    `server.js [options]

        --port	Set the port number for the server to listen on. Must be an integer
                    between 1 and 65535.

        --debug	If set to \`true\`, creates endlpoints /app/log/access/ which returns
                    a JSON access log from the database and /app/error which throws 
                    an error with the message "Error test successful." Defaults to 
                    \`false\`.

        --log		If set to false, no log files are written. Defaults to true.
                    Logs are always written to database.

        --help	Return this message and exit.`
    )
}

else{
    // Define app using express
    var express = require('express')
    var app = express()
    var morgan = require('morgan')
    var fs = require('fs')


    // Require database SCRIPT file
    const db = require("./database.js")

    // Make Express use its own built-in body parser for both urlencoded and JSON body data.
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    const HTTP_PORT = args.port|| process.env.PORT || 5555
    const debug = args.debug || false
    const log = args.log || false

    // console.log(HTTP_PORT)
    // console.log(debug)
    // console.log(log)

    if(log){
        // Setting up the morgan logging if --log=True is passed
        // Create a write stream to append to an access.log file
        const accessLog = fs.createWriteStream('access.log', { flags: 'a' })
        // Set up the access logging middleware
        app.use(morgan('combined', { stream: accessLog }))
    }

    const server = app.listen(HTTP_PORT, () => {
        console.log("Server running on port %PORT%".replace("%PORT%",HTTP_PORT))
    });

    // Logging the request
    app.use((req, res, next) => {
        let logdata = {
            remoteaddr: req.ip,
            remoteuser: req.user,
            time: Date.now(),
            method: req.method,
            url: req.url,
            protocol: req.protocol,
            httpversion: req.httpVersion,
            secure: req.secure,
            status: res.statusCode,
            referer: req.headers['referer'],
            useragent: req.headers['user-agent']
        }

        let sqlWrite = `INSERT INTO accesslog VALUES ('time', 'remoteaddr', 'remoteuser', 'method', 'url', 'protocol', 'httpversion', 'secure', 'status', 'referer', 'useragent');`;

        for (const [key, value] of Object.entries(logdata)) {
            sqlWrite = sqlWrite.replace(key, value)
        }

        db.exec(sqlWrite)
        
        // console.log(db.prepare(`SELECT * FROM accesslog`).all())

        next()
    })

    if(debug){
        app.get("/app/log/access", (req, res) => {
            try {
                const stmt = db.prepare('SELECT * FROM accesslog').all()
                res.status(200).json(stmt)
            } catch {
                console.error(e)
            }
        })

        app.get('/app/error', (req, res) => {
            throw new Error('Error test successful.') // Express will catch this on its own.
          })
    }

}