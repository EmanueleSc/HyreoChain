import express from "express"
const router = express.Router()
const fs = require('fs');
const path = require('path')
const ChorInstance = require("../../db/chorinstance")
import { ChorTranslator } from '../utils/translator'

/**
 * API DEPRECATED
 * (replaced with api/model/upload)
 * 
 */
router.post('/upload', async (req, res) => {
    try {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send('No files were uploaded.')
        }

        if (!req.files.bpmn) {
            return res.status(400).send('No bpmn were uploaded.')
        }

        const idModel = req.body.modelId
        const bpmnFile = req.files.bpmn
        const chorXml = bpmnFile.data.toString('utf8')
        
        // ChorTranslator is the Choreography translator module for Hyperledger Fabric smart contracts.
        // it returns an object with the following fields:
        //      object.chorID
        //      object.roles
        //      object.configTxProfile
        //      object.startEvent
        //      object.modelName
        //      object.contract (the translated contract code)
        //      object.contractName
        const obj = await new ChorTranslator(chorXml)

        const bpmnFileName = obj.modelName
        const startEvent = obj.startEvent
        const roles = obj.roles
        const configTxProfile = obj.configTxProfile
        const idChor = obj.chorID
        const contractName = obj.contractName
        const contract = obj.contract

        const idBpmnFile = idChor + '.bpmn'
        const channel = `channel${idChor}`
        const contractVersion = 1


        
        // check if cc_counter.json exists (contract counter file)
        const cc_counterFile = path.resolve(__dirname, `../../../../chaincode/utils/cc_counter.json`)
        let data
        if (fs.existsSync(cc_counterFile)) { // file exists
            data = JSON.parse(fs.readFileSync(cc_counterFile, {encoding:'utf8', flag:'r'}))
            data.counter = data.counter + 1
            fs.writeFileSync(cc_counterFile, JSON.stringify(data))

        } else {  //file not exists
            data = { counter: 1 }
            fs.writeFileSync(cc_counterFile, JSON.stringify(data))
        }

        // write smart contract file inside chaincode
        // const code = req.files.contract.data.toString('utf8')
        const code = contract.toString('utf8')
        const chaincodeFile = path.resolve(__dirname, `../../../../chaincode/lib/choreographyprivatedatacontract${data.counter}.js`)
        fs.writeFileSync(chaincodeFile, code)

        // write index.js file inside chaincode
        let header = `\n'use strict';\nconst contracts = [];`
        let body = ''
        let end = 'module.exports.contracts = contracts;'
        const cc_index = path.resolve(__dirname, `../../../../chaincode/index.js`)

        for(let i = 0; i < data.counter; i++) {
            body += `\nconst ChoreographyPrivateDataContract${i+1} = require('./lib/choreographyprivatedatacontract${i+1}.js');\ncontracts.push(ChoreographyPrivateDataContract${i+1});`
        }
        body = header + '\n' + body + '\n' + end
        fs.writeFileSync(cc_index, body)


        // Upload bpmn file
        const uploadPath = path.resolve(__dirname, `../bpmnFiles/${idBpmnFile}`)
        bpmnFile.mv(uploadPath, (err) => {
            if (err) return res.status(500).send(err)
        })

        // Initialize subscriptions to null (no user subscribed to any role)
        const subscriptions = {}
        Object.keys(roles).forEach(key => subscriptions[key] = null)

        // create choreography instance in mongoDB
        const chor = await ChorInstance.create({
            idBpmnFile,
            bpmnFileName,
            startEvent,
            roles,
            configTxProfile,
            idChor,
            idModel,
            contractName,
            channel,
            contractVersion,
            deployed: false,
            idUsersSubscribed: [],
            subscriptions
        })

        res.json({ response: chor })

    } catch (err) {
        res.json({ error: err.message || err.toString() })
    }
})

module.exports = router