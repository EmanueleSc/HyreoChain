'use strict';

// Fabric smart contract classes
const { Contract, Context } = require('fabric-contract-api');

// Chorchain specifc classes
const Choreography = require('./choreography.js');
const ChorList = require('./chorlist.js');
const { v4: uuidv4 } = require('uuid');

/**
 * A custom context provides easy access to list of all choreography models state
 */
class ChoreographyContext extends Context {

    constructor() {
        super();
        // All choreography models state are held in this list
        this.chorList = new ChorList(this);
    }

}

/**
 * Define choreography smart contract by extending Fabric Contract class
 *
 */
class ChoreographyContract extends Contract {

    constructor() {
        // Unique namespace when multiple contracts per chaincode file
        super('org.chorchain.choreography');
    }

    /**
     * Define a custom context for commercial paper
     */
    createContext() {
        return new ChoreographyContext();
    }

    /**
     * Instantiate to perform any setup of the ledger that might be required.
     * @param {Context} ctx the transaction context
     */
    async initLedger(ctx) {
        const ret = ctx.stub.getFunctionAndParameters();
        const args = ret.params;
        const issuer = args[2];

        console.log('Instantiate the contract');
        const chorElements = ['StartEvent', 'ExclusiveGateway', 'Message', 'EndEvent']; // example
        const chorID = uuidv4();
        // create an instance of the Choreography
        let choreography = Choreography.createInstance(issuer, chorID, chorElements);
        // Add the Choreography to the list of all similar Choreography models in the ledger world state
        await ctx.chorList.addChor(choreography);

        // Retrieve the current Choreography using key fields provided
        // const chorKey = Choreography.makeKey([issuer, chorID]);
        // return await ctx.chorList.getChor(chorKey);
    }

}

module.exports = ChoreographyContract;