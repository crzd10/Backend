import express, { Request, Response, NextFunction } from 'express'
import axios, { AxiosError, AxiosResponse } from 'axios'
import { logger } from '../app'
import rateLimit from 'express-rate-limit'
const router = express.Router()

// Rate limiting - In this case, number of requests a user makes are limited to 17 per day to even out the
// 500 request per month Rate limit set by YahooFinanceApi   
const limiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 1 day
    max: 17 // only 17 request are allowed per windowMs (per day in this case) to the Finance API
})


// Rate limit to be applied to the following route to limit the amount of request allowed in a certain time period
router.get('/', limiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Retrieving environment variables from .env
        const API_KEY_VALUE: string | undefined = process.env.API_KEY_VALUE

        if (API_KEY_VALUE) {
            // Filetring/modifying query parameters before forwarding
            const reqParams: { ticker?: string, symbol?: string } = queryParamsToUse(['ticker'], req.query)
            // Updating the key name of the ticker element
            reqParams['symbol'] = reqParams['ticker']
            delete reqParams['ticker']
            // Appending 'region' value to filtered query params
            let filteredQueryParams = { region: 'US', ...reqParams }

            logger.info(`modified query params from ${JSON.stringify(req.query)} to ${JSON.stringify(filteredQueryParams)}`)
            // Options to be used on forwarded request
            const options = {
                method: 'GET',
                url: 'https://yh-finance.p.rapidapi.com/stock/v2/get-summary', // Target URL
                params: filteredQueryParams, // filtered query params
                headers: {
                    'X-RapidAPI-Host': 'yh-finance.p.rapidapi.com',
                    'X-RapidAPI-Key': API_KEY_VALUE, // Retrieved from .env file
                }
            };

            // Forwarding client request
            axios.request(options).then(function (response: AxiosResponse) {
                // Returning part of the response from the target server to the requesting client
                res.status(200).json({
                    price: response.data.price.regularMarketPrice.fmt
                })
            }).catch(function (error: AxiosError) {
                logger.error(error)
                res.status(500).json({ error })
            });
        } else {
            logger.error('API_KEY_NAME or API_KEY_VALUE is undefined')
            res.status(500).json({ error: 'Internal Server Error' })
        }
    } catch (error) {
        logger.error(error)
        res.status(500).json({ error })
    }

})

// Filetrs query parameters
const queryParamsToUse = (queryKeys: string[], queryParams: any) => {
    // Initializing object to be returned
    let filteredParams: Object = {}
    // Retrieving keys from the queryParams paramter
    let keys = Object.keys(queryParams)

    keys.forEach(key => {
        //  Only query parameters present in queryKeys parameter are added to variable filteredParams to be returned from function
        if (queryKeys.includes(key)) {
            filteredParams = { [key]: queryParams[key], ...filteredParams }
        }
    });
    return filteredParams
}

export { router }