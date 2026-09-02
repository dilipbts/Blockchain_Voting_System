// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract Voting {
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public voters;
    uint256 public candidatesCount;

    event Voted(address indexed voter, uint256 candidateId);

    constructor() {
        candidates[1] = Candidate("Alice", 0);
        candidates[2] = Candidate("Bob", 0);
        candidates[3] = Candidate("Charlie", 0);
        candidatesCount = 3;
    }

    function vote(uint256 candidateId) public {
        require(!voters[msg.sender], "Already voted");
        require(candidateId > 0 && candidateId <= candidatesCount, "Invalid candidate");

        voters[msg.sender] = true;
        candidates[candidateId].voteCount++;

        emit Voted(msg.sender, candidateId);
    }

    function getCandidate(uint256 candidateId) public view returns (string memory name, uint256 votes) {
        require(candidateId > 0 && candidateId <= candidatesCount, "Invalid candidate");
        Candidate memory c = candidates[candidateId];
        return (c.name, c.voteCount);
    }

    function getAllCandidates() public view returns (Candidate[] memory) {
        Candidate[] memory list = new Candidate[](candidatesCount);
        for (uint256 i = 1; i <= candidatesCount; i++) {
            list[i - 1] = candidates[i];
        }
        return list;
    }
}
