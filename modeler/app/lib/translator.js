import BpmnModdle from 'bpmn-moddle';
import { smartcontract } from './templateContract'

class ChorTranslator {
    constructor(xml) {
        const moddle = new BpmnModdle()

        moddle.fromXML(xml).then(obj => {
            console.log(obj)
            
            let chorElements = this.getElementsIdByType(obj, "bpmn:StartEvent")
            const startEvent = chorElements[0]
            const startEventObj = this.getElementsByType(obj, "bpmn:StartEvent")[0]

            chorElements = chorElements.concat(this.getElementsIdByType(obj, "bpmn:ExclusiveGateway"))
            const exclusiveGatewayObjs = this.getElementsByType(obj, "bpmn:ExclusiveGateway")

            chorElements = chorElements.concat(this.getElementsIdByType(obj, "bpmn:EventBasedGateway"))
            const eventBasedGatewayObjs = this.getElementsByType(obj, "bpmn:EventBasedGateway")

            chorElements = chorElements.concat(this.getElementsIdByType(obj, "bpmn:Message"))
            const choreographyTaskObjs = this.getElementsByType(obj, "bpmn:ChoreographyTask")
            console.log(choreographyTaskObjs)

            chorElements = chorElements.concat(this.getElementsIdByType(obj, "bpmn:ParallelGateway"))
            chorElements = chorElements.concat(this.getElementsIdByType(obj, "bpmn:EndEvent"))

            const participants = this.getParticipatsNames(obj)
            const contract = smartcontract(
                'CHOR1', 'org.chorchain.choreographyprivatedata_1', chorElements, participants, startEvent,
                startEventObj, exclusiveGatewayObjs, eventBasedGatewayObjs, choreographyTaskObjs
            )
            console.log(contract)
        })
    }

    getElementsByType(modelObj, type) {
        const obj = modelObj.elementsById
        let arr = []
        for (const [key, e] of Object.entries(obj)) {
            if(e.$type === type) arr.push(e)
        }
        return arr
    }

    getElementsIdByType(modelObj, type) {
        const obj = modelObj.elementsById
        let arr = []
        for (const [key, e] of Object.entries(obj)) {
            if(e.$type === type) arr.push(e.id)
        }
        return arr
    }

    getParticipatsNames(modelObj) {
        const participants = this.getElementsByType(modelObj, "bpmn:Participant")
        return participants.map(p => p.name.replace(" ", "_"))
    }


}

module.exports = {
    ChorTranslator
}
