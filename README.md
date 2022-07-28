## Introduction
This guide will bring you through the setting up and testing of the BlockSupply application. The application is tested well on the Ubuntu 18.04 LTS environment.

## Prerequisites
1. Latest version of Docker
2. Latest version of Docker Compose
3. Node 12
4. NPM 6
5. Mosquitto Broker with SSL

## Setting up and getting started
1. Fork the repository and clone into your computer.
2. Ensure the prerequisities have been installed in your computer.
3. Navigate to the SIOT_Blockchain directory.
4. Create a .env file in the directory and input the following while replacing IP_ADDRESS with the IP address of your computer:
```
HOST=IP_ADDRESS
```
5. Start the Sawtooth network:
```
docker-compose -f docker-compose-n1.yaml up
```
6. Open a new terminal and run:
```
npm install
```
7. Navigate to the servers/demo-server directory.
8. Create a folder named mqtt and input your certificate authority, client certificate, and client private key as ca.crt, client.crt, and client.key respectively.
9. Ensure your Mosquitto broker is running, and run:
```
node index.js
```

## Testing
1. Open a new terminal and run:
```
docker exec -it sawtooth-shell-default bash
```
2. To view the blocks on the distributed ledger, run:
```
sawtooth block list --url http://rest-api-0:8008
```
3. To store a new key-value pair in the state of the data, use the IntKey transaction family. For example, to set a new value of 10 to the key 1, run:
```
intkey set --url http://rest-api-0:8008 1 10
```
4. View the blocks again using the command provided in step 2, you should observe a new block added to the ledger.
5. To view the state of the data, run:
```
sawtooth state list --url http://rest-api-0:8008
```

## Integration


## Shutting down
1. Shut down the Node server using Ctrl-C.
2. Shut down the Sawtooth network using Ctrl-C, and run:
```
docker-compose -f docker-compose-n1.yaml down
```

## Useful Links