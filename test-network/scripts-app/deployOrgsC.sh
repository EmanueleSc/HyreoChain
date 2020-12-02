#!/bin/bash

CHANNEL_NAME="$1"
CC_NAME="$2"
VERSION="$3"
COLLECTION_POLICY="$4"
MODEL_ID="$5"
NUM_ORGS="$6"
ORDERER_ADDRESS="$7"
DELAY="$8"
MAX_RETRY="$9"
: ${CHANNEL_NAME:="mychannel"}
: ${CC_NAME:="choreographyprivatedatacontract"}
: ${VERSION:="1"}
: ${COLLECTION_POLICY:="NA"}
: ${MODEL_ID:="example"}
: ${NUM_ORGS:="3"}
: ${ORDERER_ADDRESS:="localhost:7050"}
: ${DELAY:="3"}
: ${MAX_RETRY:="5"}

SCRIPT_PATH="$( cd "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
# CC_RUNTIME_LANGUAGE=node # chaincode runtime language is node.js
# CC_SRC_PATH=$SCRIPT_PATH/../../chaincode/
COLLECTION_CONFIG=${SCRIPT_PATH}/../collections_config.json

export PATH=${SCRIPT_PATH}/../../bin:${SCRIPT_PATH}:$PATH
export FABRIC_CFG_PATH=$SCRIPT_PATH/../../config/
export ORGANIZATIONS_PATH=$SCRIPT_PATH/../organizations


# import utils
. $SCRIPT_PATH/envV.sh

END_POLICY="OR('Org1MSP5f69db0691f55c46c8b134c3.member','Org2MSP5f69db0691f55c46c8b134c3.member','Org3MSP5f69db0691f55c46c8b134c3.member')"
CC_END_POLICY="--signature-policy ${END_POLICY}"


# installChaincode PEER ORG
installChaincode() {
  ORG=$1
  setGlobals $ORG $MODEL_ID
  set -x
  peer lifecycle chaincode install ${SCRIPT_PATH}/../chaincode-artifacts/${CC_NAME}.tar.gz >&log.txt
  res=$?
  set +x
  cat log.txt
  verifyResult $res "Chaincode installation on peer0.org${ORG} has failed"
  echo "===================== Chaincode is installed on peer0.org${ORG} ===================== "
  echo
}

# queryInstalled PEER ORG
queryInstalled() {
  ORG=$1
  setGlobals $ORG $MODEL_ID
  set -x
  peer lifecycle chaincode queryinstalled >&log.txt
  res=$?
  set +x
  cat log.txt
  PACKAGE_ID=$(sed -n "/${CC_NAME}_${VERSION}/{s/^Package ID: //; s/, Label:.*$//; p;}" log.txt)
  verifyResult $res "Query installed on peer0.org${ORG} has failed"
  echo PackageID is ${PACKAGE_ID}
  echo "===================== Query installed successful on peer0.org${ORG} on channel ===================== "
  echo
}

# approveForMyOrg VERSION PEER ORG
approveForMyOrg() {
  ORG=$1
  setGlobals $ORG $MODEL_ID
  computeMSPs $NUM_ORGS $MODEL_ID
  #local END_POLICY="OR($MSPs)" # e.g. "OR('Org1MSP.member','Org2MSP.member','Org3MSP.member')"
  
  set -x
  peer lifecycle chaincode approveformyorg -o ${ORDERER_ADDRESS} --ordererTLSHostnameOverride ${ORDERER_DOM} --collections-config ${COLLECTION_CONFIG} ${CC_END_POLICY} --tls ${CORE_PEER_TLS_ENABLED} --cafile ${ORDERER_CA} --channelID ${CHANNEL_NAME} --name ${CC_NAME} --version ${VERSION} --init-required --package-id ${PACKAGE_ID} --sequence ${VERSION} >&log.txt
  set +x
  cat log.txt
  verifyResult $res "Chaincode definition approved on peer0.org${ORG} on channel '$CHANNEL_NAME' failed"
  echo "===================== Chaincode definition approved on peer0.org${ORG} on channel '$CHANNEL_NAME' ===================== "
  echo
}

checkCommitReadiness() {
  ORG=$1
  shift 1
  setGlobals $ORG $MODEL_ID
  echo "Checking the commit readiness of the chaincode definition on peer0.org${ORG} on channel '$CHANNEL_NAME'..."
  local rc=1
  local COUNTER=1
  # continue to poll
  # we either get a successful response, or reach MAX RETRY
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    sleep $DELAY
    echo "Attempting to check the commit readiness of the chaincode definition on peer0.org${ORG}, Retry after $DELAY seconds."
    set -x
    peer lifecycle chaincode checkcommitreadiness --channelID ${CHANNEL_NAME} --name ${CC_NAME} --version ${VERSION} --sequence ${VERSION} --init-required ${CC_END_POLICY} --collections-config ${COLLECTION_CONFIG} --output json >&log.txt
    res=$?
    { set +x; } 2>/dev/null
    let rc=0
    for var in "$@"; do
      grep "$var" log.txt &>/dev/null || let rc=1
    done
    COUNTER=$(expr $COUNTER + 1)
  done
  cat log.txt
  if test $rc -eq 0; then
    echo "Checking the commit readiness of the chaincode definition successful on peer0.org${ORG} on channel '$CHANNEL_NAME'"
  else
    echo "!!!!!! After $MAX_RETRY attempts, Check commit readiness result on peer0.org${ORG} is INVALID!!!!!!"
    echo
    exit 1
  fi
}

# commitChaincodeDefinition VERSION PEER ORG (PEER ORG)...
commitChaincodeDefinition() {
  parsePeerConnectionParameters $@
  res=$?
  verifyResult $res "Invoke transaction failed on channel '$CHANNEL_NAME' due to uneven number of peer and org parameters "

  computeMSPs $NUM_ORGS $MODEL_ID
  #local END_POLICY="OR($MSPs)" # e.g. "OR('Org1MSP.member','Org2MSP.member','Org3MSP.member')"

  # while 'peer chaincode' command can get the orderer endpoint from the
  # peer (if join was successful), let's supply it directly as we know
  # it using the "-o" option
  set -x
  peer lifecycle chaincode commit -o ${ORDERER_ADDRESS} --ordererTLSHostnameOverride ${ORDERER_DOM} --collections-config ${COLLECTION_CONFIG} ${CC_END_POLICY} --tls ${CORE_PEER_TLS_ENABLED} --cafile ${ORDERER_CA} --channelID ${CHANNEL_NAME} --name ${CC_NAME} $PEER_CONN_PARMS --version ${VERSION} --sequence ${VERSION} --init-required >&log.txt
  res=$?
  set +x
  cat log.txt
  verifyResult $res "Chaincode definition commit failed on peer0.org${ORG} on channel '$CHANNEL_NAME' failed"
  echo "===================== Chaincode definition committed on channel '$CHANNEL_NAME' ===================== "
  echo
}

# queryCommitted ORG
queryCommitted() {
  ORG=$1
  setGlobals $ORG $MODEL_ID
  EXPECTED_RESULT="Version: ${VERSION}, Sequence: ${VERSION}, Endorsement Plugin: escc, Validation Plugin: vscc"
  echo "===================== Querying chaincode definition on peer0.org${ORG} on channel '$CHANNEL_NAME'... ===================== "
	local rc=1
	local COUNTER=1
	# continue to poll
    # we either get a successful response, or reach MAX RETRY
	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
    sleep $DELAY
    echo "Attempting to Query committed status on peer0.org${ORG}, Retry after $DELAY seconds."
    set -x
    peer lifecycle chaincode querycommitted --channelID ${CHANNEL_NAME} --name ${CC_NAME} >&log.txt
    res=$?
    set +x
	test $res -eq 0 && VALUE=$(cat log.txt | grep -o '^Version: [0-9], Sequence: [0-9], Endorsement Plugin: escc, Validation Plugin: vscc')
    test "$VALUE" = "$EXPECTED_RESULT" && let rc=0
	COUNTER=$(expr $COUNTER + 1)
	done
  echo
  cat log.txt
  if test $rc -eq 0; then
    echo "===================== Query chaincode definition successful on peer0.org${ORG} on channel '$CHANNEL_NAME' ===================== "
	echo
  else
    echo "!!!!!!!!!!!!!!! After $MAX_RETRY attempts, Query chaincode definition result on peer0.org${ORG} is INVALID !!!!!!!!!!!!!!!!"
    echo
    exit 1
  fi
}

chaincodeInvokeInit() {
  parsePeerConnectionParameters $@
  res=$?
  verifyResult $res "Invoke transaction failed on channel '$CHANNEL_NAME' due to uneven number of peer and org parameters "

  # while 'peer chaincode' command can get the orderer endpoint from the
  # peer (if join was successful), let's supply it directly as we know
  # it using the "-o" option
  set -x
  peer chaincode invoke -o ${ORDERER_ADDRESS} --ordererTLSHostnameOverride ${ORDERER_DOM} --tls ${CORE_PEER_TLS_ENABLED} --cafile ${ORDERER_CA} -C ${CHANNEL_NAME} -n ${CC_NAME} $PEER_CONN_PARMS --isInit -c '{"function":"instantiate","Args":[]}' >&log.txt
  res=$?
  set +x
  cat log.txt
  verifyResult $res "Invoke execution on $PEERS failed "
  echo "===================== Invoke transaction successful on $PEERS on channel '$CHANNEL_NAME' ===================== "
  echo
}


## Install chaincode
installChaincode 1
installChaincode 2
installChaincode 3

## query whether the chaincode is installed
queryInstalled 1


## write collection policy into the file 'collections_config.json'
# ${COLLECTION_POLICY}
cat <<- EOF > ${COLLECTION_CONFIG}

[
  {
       "name": "collectionOrg1MSP5f69db0691f55c46c8b134c3Org2MSP5f69db0691f55c46c8b134c3",
       "policy": "OR('Org1MSP5f69db0691f55c46c8b134c3.member', 'Org2MSP5f69db0691f55c46c8b134c3.member')",
       "requiredPeerCount": 1,
       "maxPeerCount": 3,
       "blockToLive":1000000,
       "memberOnlyRead": true,
       "memberOnlyWrite": true
  },
  {
       "name": "collectionOrg1MSP5f69db0691f55c46c8b134c3Org3MSP5f69db0691f55c46c8b134c3",
       "policy": "OR('Org1MSP5f69db0691f55c46c8b134c3.member', 'Org3MSP5f69db0691f55c46c8b134c3.member')",
       "requiredPeerCount": 1,
       "maxPeerCount": 3,
       "blockToLive":1000000,
       "memberOnlyRead": true,
       "memberOnlyWrite": true
  },
  {
       "name": "collectionOrg2MSP5f69db0691f55c46c8b134c3Org3MSP5f69db0691f55c46c8b134c3",
       "policy": "OR('Org2MSP5f69db0691f55c46c8b134c3.member', 'Org3MSP5f69db0691f55c46c8b134c3.member')",
       "requiredPeerCount": 1,
       "maxPeerCount": 3,
       "blockToLive":1000000,
       "memberOnlyRead": true,
       "memberOnlyWrite": true
  }
]

EOF
## format the json file
#sed -i 's/\\n//g' $COLLECTION_CONFIG


## approve the definition
approveForMyOrg 1
## check whether the chaincode definition is ready to be committed
checkCommitReadiness 1 "\"Org1MSP5f69db0691f55c46c8b134c3\": true" "\"Org2MSP5f69db0691f55c46c8b134c3\": false" "\"Org3MSP5f69db0691f55c46c8b134c3\": false"
checkCommitReadiness 2 "\"Org1MSP5f69db0691f55c46c8b134c3\": true" "\"Org2MSP5f69db0691f55c46c8b134c3\": false" "\"Org3MSP5f69db0691f55c46c8b134c3\": false"
checkCommitReadiness 3 "\"Org1MSP5f69db0691f55c46c8b134c3\": true" "\"Org2MSP5f69db0691f55c46c8b134c3\": false" "\"Org3MSP5f69db0691f55c46c8b134c3\": false"

## approve the definition
approveForMyOrg 2
## check whether the chaincode definition is ready to be committed
checkCommitReadiness 1 "\"Org1MSP5f69db0691f55c46c8b134c3\": true" "\"Org2MSP5f69db0691f55c46c8b134c3\": true" "\"Org3MSP5f69db0691f55c46c8b134c3\": false"
checkCommitReadiness 2 "\"Org1MSP5f69db0691f55c46c8b134c3\": true" "\"Org2MSP5f69db0691f55c46c8b134c3\": true" "\"Org3MSP5f69db0691f55c46c8b134c3\": false"
checkCommitReadiness 3 "\"Org1MSP5f69db0691f55c46c8b134c3\": true" "\"Org2MSP5f69db0691f55c46c8b134c3\": true" "\"Org3MSP5f69db0691f55c46c8b134c3\": false"

## approve the definition
approveForMyOrg 3
## check whether the chaincode definition is ready to be committed
checkCommitReadiness 1 "\"Org1MSP5f69db0691f55c46c8b134c3\": true" "\"Org2MSP5f69db0691f55c46c8b134c3\": true" "\"Org3MSP5f69db0691f55c46c8b134c3\": true"
checkCommitReadiness 2 "\"Org1MSP5f69db0691f55c46c8b134c3\": true" "\"Org2MSP5f69db0691f55c46c8b134c3\": true" "\"Org3MSP5f69db0691f55c46c8b134c3\": true"
checkCommitReadiness 3 "\"Org1MSP5f69db0691f55c46c8b134c3\": true" "\"Org2MSP5f69db0691f55c46c8b134c3\": true" "\"Org3MSP5f69db0691f55c46c8b134c3\": true"


## commit the definition
commitChaincodeDefinition 1 2 3

## query on orgs to see that the definition committed successfully
queryCommitted 1
queryCommitted 2
queryCommitted 3

## invoke the chaincode
chaincodeInvokeInit 1 2 3

sleep 10

exit 0
