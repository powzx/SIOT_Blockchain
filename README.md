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
Please ensure you have properly set up and tested the Sawtooth network as shown above.

Step 1 is to be done only once, unless the Docker volumes associated with the application have been removed. You may skip this step if you have already done it previously.

1. a. While the Sawtooth network is running, open a new terminal and run:
```
docker exec -it sawtooth-shell-default bash
```

1. b. Print your root user public key and note it down somewhere:
```
cat ~/.sawtooth/keys/root.pub
```
1. c. Add your root user public key to the list of allowed keys that are allowed to change the Sawtooth settings using the Sawtooth Settings Transaction Family.
```
sawset proposal create --key /pbft-shared/validators/validator-0.priv sawtooth.identity.allowed_keys=$(cat ~/.sawtooth/keys/root.pub) --url http://rest-api-0:8008
```
1. d. Create a new policy using the Sawtooth Identity Transaction Family. Replace the POLICY_NAME as desired, and ROOT_USER_PUBLIC_KEY as the key you noted down from Step 2a. FIRST_KEY and SECOND_KEY are other public keys of the ESP32 that you wish to allow to submit transactions to the Sawtooth network. You may add more of such keys by adding more PERMIT_KEY rules separated by a whitespace.
```
sawtooth identity policy create POLICY_NAME "PERMIT_KEY ROOT_USER_PUBLIC_KEY" "PERMIT_KEY FIRST_KEY" "PERMIT_KEY SECOND_KEY" --url http://rest-api-0:8008
```

1. e. Create a transactor role for the policy you made. The Sawtooth network now only allows the specified keys to submit transactions, while denying all other keys.
```
sawtooth identity role create transactor POLICY_NAME --url http://rest-api-0:8008
```

2. Ensure the Flutter application and ESP32 are up and running.
3. Observe the Node server for the transactions submitted by the running ESP32 devices, they should submit data to the network every 30 seconds.
4. Observe the ledger data using the Flutter application. 

## Shutting down
1. Shut down the Node server using Ctrl-C.
2. Shut down the Sawtooth network using Ctrl-C, and run:
```
docker-compose -f docker-compose-n1.yaml down
```

## Useful Links
[Hyperledger Sawtooth Documentation](https://sawtooth.hyperledger.org/docs/1.2/)