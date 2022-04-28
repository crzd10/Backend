import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { router } from './routes'
import dotenv from 'dotenv'
import winston, { format } from 'winston';
import helmet from 'helmet';

// To incorporate envirionment variables defined in .env file. Accessible through "process.env"
dotenv.config()

// To use PORT from .env file if present, else use 5000.
const PORT = process.env.PORT || 5000

// Creating an express application
const app: Application = express();

// Automatically sets some HTTP headers to add security to the applications
app.use(helmet())


// Enabling cors and whitelisting one origin
const whitelist = ['http://localhost:3000']
app.use(cors({
    origin: function (origin: string | undefined, callback: Function) {
        if (origin && whitelist.indexOf(origin) !== -1) { // Origin is whitelisted if defined and present in whitelist array
            callback(null, true)
        } else { // Routes are not available to non whitelisted origins
            callback(new Error('Not allowed by CORS'))
        }
    }
}))


const { combine, timestamp, printf } = format;

// Format to be used for logging
const myFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level} ${message}`;
});

// Creating a winston logger
export const logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        myFormat
    ),
    transports: [
        //
        // - Write all logs with importance level of `error` or less to `error.log`
        // - Write all logs with importance level of `info` or less to `combined.log`
        //
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});


//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}




// Access to routes based on passed criteria
app.use((req: Request, res: Response, next: NextFunction) => {
    try {
        // Retrieving and rreading request query parameters 
        let queryParams = req.query
        // Formatting message to be logged
        let formattedMessgae = `${req.get('origin') || req.get('User-Agent')} ${req.method} ${req.originalUrl} ${req.ip}`

        if (queryParams.passedCriteriaExample === 'success') { // If query param is as expected, flow continues
            logger.info(formattedMessgae) // Logging request information on info level
            next()
        } else { // If query param is not as expected, routes are not accessible
            logger.error(formattedMessgae) // Logging request information on error level
            res.status(200).json({ msg: 'origin not permitted' })
        }

    } catch (error) {
        // Internal server error
        logger.error(error)
        res.status(500).json({ error })
    }

})

// Routes
app.use('/api', router)

// Server running on specified port
app.listen(PORT, () => console.log(`Server running on port ${PORT} `))