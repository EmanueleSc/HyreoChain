'use strict';

// const Chaincode = require('../lib/choreographycontract');
// const { Stub } = require('fabric-shim');

require('chai').should();
// const sinon = require('sinon');

describe('Chaincode', () => {

    describe('#Init', () => {

        it('should work', async () => {
            console.log('--- FIRST TEST ---')
            // const cc = new Chaincode();
            // const stub = sinon.createStubInstance(Stub);
            // stub.getFunctionAndParameters.returns({ fcn: 'initFunc', params: [] });
            // const res = await cc.Init(stub);
            // res.status.should.equal(Stub.RESPONSE_CODE.OK);
        });

    });

    // Sample
    /* describe('#Invoke', async () => {

        it('should work', async () => {
            const cc = new Chaincode();
            const stub = sinon.createStubInstance(Stub);
            stub.getFunctionAndParameters.returns({ fcn: 'initFunc', params: [] });
            let res = await cc.Init(stub);
            res.status.should.equal(Stub.RESPONSE_CODE.OK);
            stub.getFunctionAndParameters.returns({ fcn: 'invokeFunc', params: [] });
            res = await cc.Invoke(stub);
            res.status.should.equal(Stub.RESPONSE_CODE.OK);
        });

    }); */

});
