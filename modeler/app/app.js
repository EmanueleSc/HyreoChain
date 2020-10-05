import { ChorModeler } from './lib/modeler'; // my lib
import { createUserIdentity } from './lib/rest';
import { submitPrivateTransaction } from './lib/rest';
import { submitTransaction } from './lib/rest';
import { fetchChorInstancesDeployed } from './lib/rest';
import { fetchChorInstanceFile } from './lib/rest';
import JSONFormatter from 'json-formatter-js';

// import xml from './diagrams/BikeRental.bpmn';

let connectionIDOrg1 = '';
let connectionIDOrg2 = '';
let connectionIDOrg3 = '';
let connectionID = '';

let dataPayload = { 
  // channel: 'channel123', 
  // contractNamespace: 'choreographyprivatedatacontract', 
  // contractName: 'org.chorchain.choreographyprivatedata_1', 
  // transactionName: 'Event_0tttznh', // startEvent
  // connectionID
  // transientData
}

let elements = {};
let chorInstances = [];

// create and configure a chor-js instance
const modeler = new ChorModeler();

function updateUI() {
  // update menu left
  let items = `<a id="${chorInstances[0]._id}" class="leftmenuitem item active">${chorInstances[0].model[0].idModel}</a>`; // first item
  for(let i = 1; i < chorInstances.length; i++) {
    items += `
      <a id="${chorInstances[i]._id}" class="leftmenuitem item">${chorInstances[i].model[0].idModel}</a>
    `;
  }
  document.getElementById('leftmenu').innerHTML = items;

  // add event listener to left menu items
  for(let i = 0; i < chorInstances.length; i++) {
    document.getElementById(chorInstances[i]._id).addEventListener('click', menuItemClick);
  }
}

async function menuItemClick(e) {
  // active selected element
  let items = document.querySelectorAll('.leftmenuitem');
  items.forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');

  let chorInstanceTarget
  // get chor instance target object
  for(let i = 0; i < chorInstances.length; i++) {
    if(chorInstances[i]._id === e.target.id) {
      chorInstanceTarget =  chorInstances[i];
      break;
    }
  }

  const resp = await fetchChorInstanceFile({ idBpmnFile: chorInstanceTarget.idBpmnFile });
  await modeler.renderModel(resp.response);
  updateButtonsName(chorInstanceTarget._id);

  dataPayload = {
    channel: chorInstanceTarget.channel,
    contractName: chorInstanceTarget.contractName,
    contractNamespace: 'choreographyprivatedatacontract', 
    transactionName: chorInstanceTarget.startEvent
  };

  // console.log(dataPayload);
}

function updateButtonsName(chorInstanceID) {
  let roles
  for(let i = 0; i < chorInstances.length; i++) {
    if(chorInstances[i]._id === chorInstanceID) roles = chorInstances[i].roles
  }
  let i = 1
  for (const [key, value] of Object.entries(roles)) {
    document.getElementById(`btnOrg${i}`).innerText = key
    i++;
  }
}

function fetchChors() {
  let idUser, idModel

  // get idUser and idModel from the URL
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  idUser = urlParams.get('idUser')
  idModel = urlParams.get('idModel')

  return new Promise((resolve, reject) => {
      return fetchChorInstancesDeployed({ idUser, idModel }).then(res => {
        return resolve(res.response);
      })
      .catch(err => {
        return reject(err);
      })
  });
}

function queryChorState() {
  if(connectionID !== '') {
    dataPayload.connectionID = connectionID;
    dataPayload.transactionName = 'queryChorState';
    submitTransaction(dataPayload).then(resp => {
      return bindResp(resp);
    }).catch(error => {
      console.error('something went wrong: ', error);
    });
  } else {
    alert('Click on one organization');
  }
}

function templateParams(index) {
  return `<p id="params${index}"></p>` + 
         '<div style="display:flex;" class="div-input ui input focus">' +
            `<input id="paramsInput${index}" type="text" placeholder="value,value ...">` +
         '</div>';
}

function removeChilds(nodeID) {
  const node = document.getElementById(nodeID);
  while (node.firstChild) {
    node.removeChild(node.lastChild);
  }
}

function bindResp(output) {
  if(typeof output === 'object') {
    if('response' in output) output = output.response;

    if(output.type && output.type === 'Buffer') {
      output = Buffer.from(output.data);
      output = output.toString('utf8');

      const json = JSON.parse(output);
      if('choreography' in json) elements = json.choreography.elements;
      else elements = json.elements;
      
      console.log('RESP JSON: '); console.log(json);
      console.log('ELEMENTS: '); console.log(elements);

      const elems = modeler.findEnabledElementsID(elements);
      if(elems.length !== 0) {
        removeChilds('inputContainer');

        for(let i = 0; i < elems.length; i++) {
          const elemID = elems[i];
          modeler.colorElem(elemID);
          const messageAnnotation = modeler.getAnnotation(elemID);
          if(messageAnnotation) {
            document.getElementById('inputContainer').innerHTML += templateParams(elemID);
            document.getElementById(`params${elemID}`).innerHTML = modeler.getAnnotation(elemID);
          }
            
        }

      }
    }
    removeChilds('output');
    const formatter = new JSONFormatter(JSON.parse(output));
    document.getElementById('output').appendChild(formatter.render());
  } else {
    document.getElementById('output').innerHTML = output;
  }
}

document.addEventListener('DOMContentLoaded', () => {

  const btnCustomer = document.getElementById("btnOrg1");
  btnCustomer.addEventListener('click', async (e) => {
    if(connectionIDOrg1 === '') {
      const resp = await createUserIdentity({ orgNum: 1 });
      connectionIDOrg1 = resp.response;
      bindResp(connectionIDOrg1);
    } else {
      bindResp(connectionIDOrg1);
    }
    
    connectionID = connectionIDOrg1;
    await queryChorState();
  });

  const btnBikeCenter = document.getElementById("btnOrg2");
  btnBikeCenter.addEventListener('click', async (e) => {
    if(connectionIDOrg2 === '') {
      const resp = await createUserIdentity({ orgNum: 2 });
      connectionIDOrg2 = resp.response;
      bindResp(connectionIDOrg2);
    } else {
      bindResp(connectionIDOrg2);
    }

    connectionID = connectionIDOrg2;
    await queryChorState();
  });

  const btnInsurer = document.getElementById("btnOrg3");
  btnInsurer.addEventListener('click', async (e) => {
    if(connectionIDOrg3 === '') {
      const resp = await createUserIdentity({ orgNum: 3 });
      connectionIDOrg3 = resp.response;
      bindResp(connectionIDOrg3);
    } else {
      bindResp(connectionIDOrg3);
    }

    connectionID = connectionIDOrg3;
    await queryChorState();
  });

  const btnStart = document.getElementById("btnStart");
  btnStart.addEventListener('click', async (e) => {
    if(connectionID !== '') {
      let paramsArr = [];
      let tx = null;
      const elems = modeler.findEnabledElementsID(elements);

      if(elems.length !== 0) {
        for(let i = 0; i < elems.length; i++) {
          const elemID = elems[i];
          const messageAnnotation = modeler.getAnnotation(elemID);
          // check if the element has an annotation string
          if(messageAnnotation) {
            let values = document.getElementById(`paramsInput${elemID}`).value;
            if(values && values !== '') {
              tx = elemID;
              break;
            }
          }
        }
      }

      if(tx === null) tx = modeler.findFirstEnabledElementID(elements);
      if(tx !== null) dataPayload.transactionName = tx;
      dataPayload.connectionID = connectionID;
      paramsArr = modeler.getAnnotationParams(tx);

      if(paramsArr.length !== 0) {
        let values = document.getElementById(`paramsInput${tx}`).value;
        if(values === '') {
          alert('Inputs are empty!');
          return;
        }

        values = values.split(',');
        if(paramsArr.length !== values.length) {
          alert('Fill all params');
          return;
        }
        let data = {};
        paramsArr.forEach((p, i) => {
          data[p] = values[i];
        });
        dataPayload.transientData = data;
      }

      console.log('DATA PAYLOAD: '); console.log(dataPayload);

      const resp = await submitPrivateTransaction(dataPayload);
      if(resp.error) bindResp(resp.error);
      else {
        bindResp(resp.response);
        dataPayload.transientData = undefined;
        dataPayload.transactionName = undefined;
        dataPayload.connectionID = undefined;
      }

    } else {
      alert('Click on one organization');
    }
  });

});

fetchChors().then(async (res) => {
  console.log(res);
  chorInstances = res;
  const idBpmnFile = chorInstances[0].idModel + ".bpmn"
  const resp = await fetchChorInstanceFile({ idBpmnFile }); // get first file
  await modeler.renderModel(resp.response);
  updateUI();
  updateButtonsName(chorInstances[0]._id);

  dataPayload = {
    channel: chorInstances[0].channel,
    contractName: chorInstances[0].contractName,
    contractNamespace: 'choreographyprivatedatacontract', 
    transactionName: chorInstances[0].startEvent
  };
}).catch(error => console.log(error))


// modeler.renderModel(xml).catch(error => console.log(error))
