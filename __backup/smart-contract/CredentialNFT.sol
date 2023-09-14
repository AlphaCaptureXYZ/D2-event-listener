// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract CredentialNFT is ERC1155, Initializable {
	uint256 private tokenIdCounter = 1;

	struct Credential {
		bytes16 uuid;
		uint256 tokenId;
		string provider;
		string environment;
		string accountName;
		string encryptedCredential;
		address owner;
		address pkpAddress;
	}

	mapping(address => mapping(uint256 => Credential)) private credential;

	mapping(bytes16 => Credential) private tokenIdInfo;

	mapping(address => uint256[]) private userCredentialsIds;

	constructor() ERC1155('') {}

	// function created to generate a unique id for each credential and access quickly and pretty
	function generateUUID() public view returns (bytes16) {
		bytes16 uuid = bytes16(
			keccak256(
				abi.encodePacked(block.timestamp, block.difficulty, msg.sender)
			)
		);
		return uuid;
	}

	// function to create a credential
	function createCredential(
		string memory provider,
		string memory accountName,
		string memory environment,
		string memory encryptedCredential,
		address pkpAddress
	) public {
		uint256 tokenId = tokenIdCounter++;
		bytes16 uuid = generateUUID();

		Credential memory cred = Credential({
			tokenId: tokenId,
			uuid: uuid,
			provider: provider,
			accountName: accountName,
			environment: environment,
			encryptedCredential: encryptedCredential,
			pkpAddress: pkpAddress,
			owner: msg.sender
		});

		credential[msg.sender][tokenId] = cred;
		credential[pkpAddress][tokenId] = cred;

		userCredentialsIds[msg.sender].push(cred.tokenId);
		userCredentialsIds[pkpAddress].push(cred.tokenId);

		_mint(msg.sender, tokenId, 1, '');
		_mint(pkpAddress, tokenId, 1, '');

		tokenIdInfo[uuid] = cred;
		emit CredentialCreated(tokenId, uuid, msg.sender);
	}

	// function to get the credential by uuid
	function getTokenId(bytes16 uuid) external view returns (uint256) {
		uint256 tokenId = tokenIdInfo[uuid].tokenId;
		return tokenId;
	}

	// function to get the credential by uuid
	function getCredentialByUUID(
		bytes16 uuid
	) external view returns (Credential memory) {
		Credential memory credentialInfo = tokenIdInfo[uuid];
		return credentialInfo;
	}

	// function to get the credential by tokenId
	function getCredentialById(
		uint256 tokenId
	) external view returns (Credential memory) {
		return credential[msg.sender][tokenId];
	}

	// function to get the credential by tokenId via pkp
	function getCredentialByIdViaPkp(uint256 tokenId) public {
		address sender = msg.sender;
		Credential memory credentialInfo = credential[msg.sender][tokenId];
		emit CredentialInfoViaPKP(credentialInfo, sender);
	}

	// function to get the number of credentials of a user
	function getMyCredentialsTotal() external view returns (uint256) {
		return userCredentialsIds[msg.sender].length;
	}

	// function to retrieve all the credentials of a user
	function getMyCredentials() external view returns (Credential[] memory) {
		mapping(uint256 => Credential) storage myCredentials = credential[
			msg.sender
		];

		uint256[] memory ids = userCredentialsIds[msg.sender];

		Credential[] memory credentials = new Credential[](ids.length);

		for (uint256 i = 0; i < ids.length; i++) {
			credentials[i] = myCredentials[ids[i]];
		}

		return credentials;
	}

	event CredentialCreated(uint256 tokenId, bytes16 uuid, address owner);
	event CredentialInfoViaPKP(Credential credential, address sender);
}
